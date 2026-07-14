from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.dependencies.auth import get_current_user
from src.dtos.login_record import RegistroLoginCreate, RegistroLoginResponse
from src.models.login_record import RegistroLogin
from src.models.user import Usuario


router = APIRouter(
    prefix="/registros-login",
    tags=["registros login"],
    dependencies=[Depends(get_current_user)],
)


@router.post(
    "/", response_model=RegistroLoginResponse, status_code=status.HTTP_201_CREATED
)
def crear_registro_login(data: RegistroLoginCreate, db: Session = Depends(get_db)):
    if data.usuario_id is not None and db.get(Usuario, data.usuario_id) is None:
        raise HTTPException(status_code=400, detail="El usuario indicado no existe")

    valores = data.model_dump()
    if valores["direccion_ip"] is not None:
        valores["direccion_ip"] = str(valores["direccion_ip"])
    registro = RegistroLogin(**valores)
    db.add(registro)
    try:
        db.commit()
        db.refresh(registro)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="No fue posible crear el registro de login"
        ) from exc
    return registro


@router.get("/", response_model=list[RegistroLoginResponse])
def listar_registros_login(
    usuario_id: int | None = Query(default=None, gt=0),
    exitoso: bool | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(RegistroLogin)
    if usuario_id is not None:
        query = query.filter(RegistroLogin.usuario_id == usuario_id)
    if exitoso is not None:
        query = query.filter(RegistroLogin.exitoso == exitoso)
    return (
        query.order_by(RegistroLogin.fecha_login.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{login_id}", response_model=RegistroLoginResponse)
def obtener_registro_login(login_id: int, db: Session = Depends(get_db)):
    registro = db.get(RegistroLogin, login_id)
    if registro is None:
        raise HTTPException(status_code=404, detail="Registro de login no encontrado")
    return registro
