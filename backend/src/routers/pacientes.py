from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.dependencies.auth import get_current_user
from src.dtos.patient import PacienteCreate, PacienteResponse, PacienteUpdate
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
    query = db.query(Paciente).filter(Paciente.active.is_(True))
    return (
        query
        .order_by(Paciente.nombre_completo)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{paciente_id}", response_model=PacienteResponse)
def obtener_paciente(paciente_id: int, db: Session = Depends(get_db)):
    paciente = (
        db.query(Paciente)
        .filter(Paciente.paciente_id == paciente_id, Paciente.active.is_(True))
        .first()
    )
    if paciente is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return paciente


@router.put("/{paciente_id}", response_model=PacienteResponse)
@router.patch("/{paciente_id}", response_model=PacienteResponse)
def actualizar_paciente(
    paciente_id: int,
    data: PacienteUpdate,
    db: Session = Depends(get_db),
):
    paciente = (
        db.query(Paciente)
        .filter(Paciente.paciente_id == paciente_id, Paciente.active.is_(True))
        .first()
    )
    if paciente is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    cambios = data.model_dump(exclude_unset=True)
    if not cambios:
        raise HTTPException(status_code=400, detail="No se enviaron campos para actualizar")

    nuevo_documento = cambios.get("documento")
    if nuevo_documento is not None:
        documento_existente = (
            db.query(Paciente)
            .filter(
                Paciente.documento == nuevo_documento,
                Paciente.paciente_id != paciente_id,
            )
            .first()
        )
        if documento_existente:
            raise HTTPException(status_code=409, detail="El documento ya está registrado")

    for campo, valor in cambios.items():
        setattr(paciente, campo, valor)

    try:
        db.commit()
        db.refresh(paciente)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="No fue posible actualizar el paciente"
        ) from exc
    return paciente


@router.delete("/{paciente_id}", response_model=PacienteResponse)
def eliminar_paciente(paciente_id: int, db: Session = Depends(get_db)):
    paciente = (
        db.query(Paciente)
        .filter(Paciente.paciente_id == paciente_id, Paciente.active.is_(True))
        .first()
    )
    if paciente is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    paciente.active = False
    try:
        db.commit()
        db.refresh(paciente)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="No fue posible inactivar el paciente"
        ) from exc
    return paciente
