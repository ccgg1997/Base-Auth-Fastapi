from sqlalchemy.orm import Session

from src.core.security import hash_password
from src.db.session import SessionLocal
from src.models.role import Rol
from src.models.user import Usuario


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


def cargar_datos_demo() -> None:
    """Crea roles y usuarios demo faltantes sin modificar los existentes."""
    db = SessionLocal()
    try:
        roles_por_codigo = _crear_roles(db)
        _crear_usuarios(db, roles_por_codigo)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
