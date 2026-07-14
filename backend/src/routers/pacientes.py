import csv
from io import StringIO

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.dependencies.auth import get_current_user
from src.dtos.patient import (
    PacienteCreate,
    PacienteResponse,
    PacientesCSVResponse,
    PacienteUpdate,
)
from src.models.patient import Paciente


router = APIRouter(
    prefix="/pacientes",
    tags=["pacientes"],
    dependencies=[Depends(get_current_user)],
)


def _id_fila_csv(fila: dict[str | None, str | list[str] | None], numero: int) -> int:
    """Obtiene el identificador del origen o usa el número de registro."""
    valor = fila.get("paciente_id")
    if valor in (None, ""):
        valor = fila.get("id")
    try:
        return int(str(valor).strip())
    except (TypeError, ValueError):
        return numero


def _datos_paciente_csv(
    fila: dict[str | None, str | list[str] | None],
) -> dict[str, str | None]:
    if None in fila:
        raise ValueError("La fila contiene más columnas que el encabezado")

    datos: dict[str, str | None] = {}
    for campo, definicion in PacienteCreate.model_fields.items():
        if campo not in fila:
            continue

        valor = fila[campo]
        if not isinstance(valor, str):
            datos[campo] = None
            continue

        valor = valor.strip()
        if valor == "" and not definicion.is_required():
            # Un valor opcional vacío equivale a null; active conserva su default.
            if campo != "active":
                datos[campo] = None
            continue
        datos[campo] = valor
    return datos


@router.post(
    "/importar-csv",
    response_model=PacientesCSVResponse,
    status_code=status.HTTP_201_CREATED,
)
def importar_pacientes_csv(
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Importa las filas válidas de un CSV delimitado por comas."""
    if not archivo.filename or not archivo.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="El archivo debe tener extensión .csv")

    try:
        contenido = archivo.file.read().decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=400, detail="El archivo CSV debe estar codificado en UTF-8"
        ) from exc

    lector = csv.DictReader(StringIO(contenido, newline=""), delimiter=",", strict=True)
    try:
        encabezados = lector.fieldnames
    except csv.Error as exc:
        raise HTTPException(status_code=400, detail="El encabezado CSV no es válido") from exc

    if not encabezados:
        raise HTTPException(status_code=400, detail="El archivo CSV está vacío")

    encabezados = [encabezado.strip() for encabezado in encabezados]
    if len(encabezados) != len(set(encabezados)):
        raise HTTPException(status_code=400, detail="El CSV contiene encabezados repetidos")
    lector.fieldnames = encabezados

    requeridos = {
        campo
        for campo, definicion in PacienteCreate.model_fields.items()
        if definicion.is_required()
    }
    faltantes = sorted(requeridos - set(encabezados))
    if faltantes:
        raise HTTPException(
            status_code=400,
            detail=(
                "Faltan columnas obligatorias: "
                f"{', '.join(faltantes)}. El separador debe ser una coma."
            ),
        )

    insertados = 0
    ids_error: list[int] = []
    numero_registro = 0

    while True:
        numero_registro += 1
        try:
            fila = next(lector)
        except StopIteration:
            break
        except csv.Error:
            ids_error.append(numero_registro)
            continue

        id_error = _id_fila_csv(fila, numero_registro)
        try:
            datos = _datos_paciente_csv(fila)
            paciente_data = PacienteCreate.model_validate(datos)

            # Cada fila usa un savepoint: un error no revierte las filas válidas.
            with db.begin_nested():
                db.add(Paciente(**paciente_data.model_dump()))
                db.flush()
            insertados += 1
        except (IntegrityError, ValidationError, ValueError):
            ids_error.append(id_error)

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500, detail="No fue posible completar la importación"
        ) from exc

    return PacientesCSVResponse(
        usuarios_insertados=insertados,
        iderror=ids_error,
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
