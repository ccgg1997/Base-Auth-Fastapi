from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.models.user import User
from src.dependencies.auth import get_current_user
from src.core.security import hash_password, verify_password, create_access_token
from src.core.config import settings

from src.dtos.auth import Token
from src.dtos.user import UserCreate, UserOut


router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.usuario == user.usuario).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")

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
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.usuario == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Nombre de usuario o contraseña incorrectos")
    if not user.activo:
        raise HTTPException(status_code=403, detail="El usuario está inactivo")

    access_token = create_access_token(form_data.username)
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
