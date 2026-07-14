from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.core.security import hash_password
from src.db.session import get_db
from src.dependencies.auth import get_current_user
from src.dtos.user import UsuarioCreate, UsuarioResponse
from src.models.role import Rol
from src.models.user import Usuario


router = APIRouter(
    prefix="/usuarios",
    tags=["usuarios"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario(data: UsuarioCreate, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.usuario == data.usuario).first():
        raise HTTPException(status_code=409, detail="El usuario ya está registrado")

    rol = db.get(Rol, data.rol_id)
    if rol is None or not rol.activo:
        raise HTTPException(status_code=400, detail="El rol no existe o está inactivo")

    valores = data.model_dump(exclude={"password"})
    usuario = Usuario(**valores, password_hash=hash_password(data.password))
    db.add(usuario)
    try:
        db.commit()
        db.refresh(usuario)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="No fue posible crear el usuario"
        ) from exc
    return usuario


@router.get("/", response_model=list[UsuarioResponse])
def listar_usuarios(
    incluir_inactivos: bool = False,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(Usuario)
    if not incluir_inactivos:
        query = query.filter(Usuario.activo.is_(True))
    return query.order_by(Usuario.nombre).offset(skip).limit(limit).all()


@router.get("/{usuario_id}", response_model=UsuarioResponse)
def obtener_usuario(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario
