import csv
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from src.core.security import hash_password
from src.db.session import SessionLocal
from src.dtos.patient import PacienteCreate
from src.models.patient import Paciente
from src.models.role import Rol
from src.models.user import Usuario


logger = logging.getLogger(__name__)

PACIENTES_CSV = "Datos_Sinteticos_pacientes.csv"
ZONA_HORARIA_COLOMBIA = timezone(timedelta(hours=-5))
COLUMNAS_PACIENTE_REQUERIDAS = {
    "tipo_documento",
    "documento",
    "nombre_completo",
    "fecha_nacimiento",
    "genero",
    "prioridad",
    "estado",
    "fecha_creacion",
    "fecha_actualizacion",
}


ROLES_SEMILLA = (
    {
        "codigo": "ADMIN",
        "nombre": "Administrador",
        "descripcion": "Acceso administrativo al sistema",
        "activo": True,
    },
    {
        "codigo": "OPERADOR",
        "nombre": "Operador",
        "descripcion": "Acceso operativo al sistema",
        "activo": True,
    },
)

USUARIOS_SEMILLA = (
    {
        "usuario": "admin.demo",
        "nombre": "Administrador Demo",
        "rol_codigo": "ADMIN",
        "activo": True,
        "password": "Demo2026*",
        "nota": "Solo para ambiente de prueba. En una solución real almacenar hash.",
    },
    {
        "usuario": "operador.demo",
        "nombre": "Operador Demo",
        "rol_codigo": "OPERADOR",
        "activo": True,
        "password": "Demo2026*",
        "nota": "Solo para ambiente de prueba. En una solución real almacenar hash.",
    },
)


def _crear_roles(db: Session) -> dict[str, Rol]:
    roles_por_codigo = {
        rol.codigo: rol
        for rol in db.query(Rol).filter(
            Rol.codigo.in_([item["codigo"] for item in ROLES_SEMILLA])
        )
    }
    for datos in ROLES_SEMILLA:
        if datos["codigo"] not in roles_por_codigo:
            rol = Rol(**datos)
            db.add(rol)
            roles_por_codigo[datos["codigo"]] = rol
    db.flush()
    return roles_por_codigo


def _crear_usuarios(db: Session, roles_por_codigo: dict[str, Rol]) -> None:
    usuarios_existentes = {
        usuario
        for (usuario,) in db.query(Usuario.usuario).filter(
            Usuario.usuario.in_([item["usuario"] for item in USUARIOS_SEMILLA])
        )
    }
    for datos in USUARIOS_SEMILLA:
        if datos["usuario"] in usuarios_existentes:
            continue
        rol = roles_por_codigo[datos["rol_codigo"]]
        db.add(
            Usuario(
                usuario=datos["usuario"],
                nombre=datos["nombre"],
                rol_id=rol.rol_id,
                activo=datos["activo"],
                password_hash=hash_password(datos["password"]),
                nota=datos["nota"],
            )
        )


def _ruta_csv_pacientes() -> Path:
    ruta_configurada = os.getenv("PATIENT_SEED_CSV_PATH")
    candidatos = [
        Path(ruta_configurada) if ruta_configurada else None,
        Path("/seed-data") / PACIENTES_CSV,
        Path(__file__).resolve().parents[3] / "mockups-data" / PACIENTES_CSV,
    ]
    for ruta in candidatos:
        if ruta is not None and ruta.is_file():
            return ruta
    raise FileNotFoundError(
        f"No se encontró {PACIENTES_CSV}. "
        "Configure PATIENT_SEED_CSV_PATH o monte el archivo en /seed-data."
    )


def _valor_opcional(fila: dict[str, str], campo: str) -> str | None:
    valor = (fila.get(campo) or "").strip()
    return valor or None


def _fecha_hora_colombia(valor: str) -> datetime:
    fecha = datetime.fromisoformat(valor.strip())
    if fecha.tzinfo is None:
        fecha = fecha.replace(tzinfo=ZONA_HORARIA_COLOMBIA)
    return fecha


def _leer_pacientes_csv(ruta: Path) -> list[dict]:
    pacientes: list[dict] = []
    with ruta.open("r", encoding="utf-8-sig", newline="") as archivo:
        lector = csv.DictReader(archivo, delimiter=";")
        columnas = set(lector.fieldnames or [])
        faltantes = COLUMNAS_PACIENTE_REQUERIDAS - columnas
        if faltantes:
            raise ValueError(
                f"Faltan columnas en {ruta.name}: {', '.join(sorted(faltantes))}"
            )
        for numero_fila, fila in enumerate(lector, start=2):
            try:
                paciente = PacienteCreate.model_validate(
                    {
                        "tipo_documento": (fila.get("tipo_documento") or "").strip(),
                        "documento": (fila.get("documento") or "").strip(),
                        "nombre_completo": (fila.get("nombre_completo") or "").strip(),
                        "fecha_nacimiento": (
                            fila.get("fecha_nacimiento") or ""
                        ).strip(),
                        "genero": (fila.get("genero") or "").strip(),
                        "telefono": _valor_opcional(fila, "telefono"),
                        "correo": _valor_opcional(fila, "correo"),
                        "eps_codigo": _valor_opcional(fila, "eps_codigo"),
                        "eps_nombre": _valor_opcional(fila, "eps_nombre"),
                        "ciudad": _valor_opcional(fila, "ciudad"),
                        "prioridad": (fila.get("prioridad") or "").strip(),
                        "estado": (fila.get("estado") or "").strip(),
                    }
                ).model_dump()
                paciente["fecha_creacion"] = _fecha_hora_colombia(
                    fila.get("fecha_creacion") or ""
                )
                paciente["fecha_actualizacion"] = _fecha_hora_colombia(
                    fila.get("fecha_actualizacion") or ""
                )
                pacientes.append(paciente)
            except (TypeError, ValueError) as exc:
                raise ValueError(
                    f"Fila {numero_fila} inválida en {ruta.name}: {exc}"
                ) from exc
    if not pacientes:
        raise ValueError(f"{ruta.name} no contiene pacientes")
    return pacientes


def _crear_pacientes_si_tabla_vacia(db: Session) -> int:
    if db.query(Paciente.paciente_id).first() is not None:
        return 0

    pacientes = _leer_pacientes_csv(_ruta_csv_pacientes())
    db.add_all([Paciente(**datos) for datos in pacientes])
    return len(pacientes)


def cargar_datos_demo() -> None:
    """Crea usuarios demo y carga pacientes sintéticos si la tabla está vacía."""
    db = SessionLocal()
    try:
        roles_por_codigo = _crear_roles(db)
        _crear_usuarios(db, roles_por_codigo)
        pacientes_creados = _crear_pacientes_si_tabla_vacia(db)
        db.commit()
        if pacientes_creados:
            logger.info(
                "Se cargaron %s pacientes sintéticos desde %s",
                pacientes_creados,
                PACIENTES_CSV,
            )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
