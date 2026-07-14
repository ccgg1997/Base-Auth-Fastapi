from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.models.user import User
from src.dependencies.auth import get_current_user

from src.dtos.auth import Token
from src.dtos.user import UserCreate, UserOut
from fastapi import Body


router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")

    new_user = User(**user.model_dump())
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
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not user.verify_password(form_data.password):
        raise HTTPException(status_code=400, detail="Nombre de usuario o contraseña incorrectos")

    access_token = user.create_access_token()
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def get_my_user(
    current_user: User = Depends(get_current_user),
):
    return current_user