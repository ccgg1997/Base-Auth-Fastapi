from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.dependencies.auth import get_current_user
from src.dtos.patient import PacienteCreate, PacienteResponse
from src.models.patient import Paciente


router = APIRouter(
    prefix="/pacientes",
    tags=["pacientes"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/", response_model=PacienteResponse, status_code=status.HTTP_201_CREATED)
def crear_paciente(data: PacienteCreate, db: Session = Depends(get_db)):
    if db.query(Paciente).filter(Paciente.documento == data.documento).first():
        raise HTTPException(status_code=409, detail="El documento ya está registrado")

    paciente = Paciente(**data.model_dump())
    db.add(paciente)
    try:
        db.commit()
        db.refresh(paciente)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="No fue posible crear el paciente"
        ) from exc
    return paciente


@router.get("/", response_model=list[PacienteResponse])
def listar_pacientes(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return (
        db.query(Paciente)
        .order_by(Paciente.nombre_completo)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{paciente_id}", response_model=PacienteResponse)
def obtener_paciente(paciente_id: int, db: Session = Depends(get_db)):
    paciente = db.get(Paciente, paciente_id)
    if paciente is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return paciente
