from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.dependencies.auth import get_current_user
from src.dtos.role import RolCreate, RolResponse
from src.models.role import Rol


router = APIRouter(
    prefix="/roles",
    tags=["roles"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/", response_model=RolResponse, status_code=status.HTTP_201_CREATED)
def crear_rol(data: RolCreate, db: Session = Depends(get_db)):
    if db.query(Rol).filter(Rol.codigo == data.codigo).first():
        raise HTTPException(status_code=409, detail="El código del rol ya existe")

    rol = Rol(**data.model_dump())
    db.add(rol)
    try:
        db.commit()
        db.refresh(rol)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="No fue posible crear el rol") from exc
    return rol


@router.get("/", response_model=list[RolResponse])
def listar_roles(
    incluir_inactivos: bool = False,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(Rol)
    if not incluir_inactivos:
        query = query.filter(Rol.activo.is_(True))
    return query.order_by(Rol.nombre).offset(skip).limit(limit).all()


@router.get("/{rol_id}", response_model=RolResponse)
def obtener_rol(rol_id: int, db: Session = Depends(get_db)):
    rol = db.get(Rol, rol_id)
    if rol is None:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return rol
