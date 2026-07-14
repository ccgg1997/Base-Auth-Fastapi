from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.models.user import User
from src.models.login_record import RegistroLogin
from src.models.role import Rol
from src.dependencies.auth import get_current_user
from src.core.security import hash_password, verify_password, create_access_token
from src.core.config import settings

from src.dtos.auth import Token
from src.dtos.user import UserCreate, UserOut


router = APIRouter(prefix="/auth", tags=["auth"])


def registrar_intento_login(
    db: Session,
    request: Request,
    usuario_intentado: str,
    exitoso: bool,
    usuario_id: int | None = None,
    motivo_fallo: str | None = None,
) -> None:
    registro = RegistroLogin(
        usuario_id=usuario_id,
        usuario_intentado=usuario_intentado,
        exitoso=exitoso,
        direccion_ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        motivo_fallo=motivo_fallo,
    )
    db.add(registro)
    try:
        db.commit()
    except Exception:
        # Un fallo de auditoría no debe reemplazar la respuesta de autenticación.
        db.rollback()

@router.post("/register", response_model=UserOut)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.usuario == user.usuario).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")

    rol = db.get(Rol, user.rol_id)
    if rol is None or not rol.activo:
        raise HTTPException(status_code=400, detail="El rol no existe o está inactivo")

    new_user = User(
        usuario=user.usuario,
        nombre=user.nombre,
        rol_id=user.rol_id,
        activo=user.activo,
        password_hash=hash_password(user.password),
        nota=user.nota,
    )
    db.add(new_user)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=exc.args[0] if isinstance(exc, IntegrityError) else "Error al registrar el usuario",
        )
    db.refresh(new_user)
    return new_user

@router.post("/token", response_model=Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.usuario == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        registrar_intento_login(
            db=db,
            request=request,
            usuario_intentado=form_data.username,
            exitoso=False,
            usuario_id=user.usuario_id if user else None,
            motivo_fallo="Credenciales incorrectas",
        )
        raise HTTPException(status_code=400, detail="Nombre de usuario o contraseña incorrectos")
    if not user.activo:
        registrar_intento_login(
            db=db,
            request=request,
            usuario_intentado=form_data.username,
            exitoso=False,
            usuario_id=user.usuario_id,
            motivo_fallo="Usuario inactivo",
        )
        raise HTTPException(status_code=403, detail="El usuario está inactivo")

    access_token = create_access_token(form_data.username)
    registrar_intento_login(
        db=db,
        request=request,
        usuario_intentado=form_data.username,
        exitoso=True,
        usuario_id=user.usuario_id,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
    }

@router.get("/me", response_model=UserOut)
def get_my_user(
    current_user: User = Depends(get_current_user),
):
    return current_user
