# Estructura FastAPI + SQLAlchemy + PostgreSQL + JWT

Esta guía explica qué debe ir en cada archivo del backend, por qué se separa y cuál es su código base.

## 1. Árbol del proyecto

```text
backend/
├── requirements.txt
├── backend.Dockerfile
└── src/
    ├── main.py
    ├── core/
    │   ├── config.py
    │   └── security.py
    ├── db/
    │   ├── base.py
    │   └── session.py
    ├── models/
    │   ├── product.py
    │   └── user.py
    ├── dtos/
    │   ├── product.py
    │   ├── user.py
    │   └── auth.py
    ├── dependencies/
    │   └── auth.py
    └── routers/
        ├── producto.py
        └── auth.py
```

- `models/`: estructura de las tablas.
- `dtos/`: JSON que entra y sale.
- `routers/`: endpoints HTTP.
- `dependencies/`: lógica reutilizable ejecutada por `Depends()`.
- `core/`: configuración y seguridad sin endpoints.

[Documentación: aplicaciones grandes con FastAPI](https://fastapi.tiangolo.com/tutorial/bigger-applications/)

## 2. `core/config.py`

**Qué:** lee configuración y secretos desde variables de entorno.

**Por qué:** la URL de PostgreSQL y la clave JWT no deben escribirse directamente en el código.

```python
from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
settings = Settings()
```

**Documentación:** [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) · [Settings en FastAPI](https://fastapi.tiangolo.com/advanced/settings/)

## 3. `core/security.py`

**Qué:** genera hashes Argon2id y crea o valida JWT.

**Por qué:** la criptografía queda separada de FastAPI, HTTP y la base de datos.

```python
from datetime import datetime, timedelta, timezone
import jwt
from pwdlib import PasswordHash
from src.core.config import settings
password_hash = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hash.hash("not-a-real-password")
def hash_password(password: str) -> str:
    return password_hash.hash(password)
def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)
def create_access_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["sub", "iat", "exp"]},
    )
```

Solo se guarda el hash. La contraseña original nunca se guarda ni se incluye en el JWT.

**Documentación:** [JWT y hashing en FastAPI](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/) · [pwdlib](https://frankie567.github.io/pwdlib/) · [PyJWT](https://pyjwt.readthedocs.io/en/stable/usage.html)

## 4. Base de datos

### `db/base.py`

**Qué:** crea la clase padre de todos los modelos ORM.

```python
from sqlalchemy.orm import declarative_base
Base = declarative_base()
```

**Documentación:** [mapeo declarativo](https://docs.sqlalchemy.org/en/20/orm/declarative_mapping.html)

### `db/session.py`

**Qué:** crea el Engine, la fábrica de sesiones y una sesión por request.

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.core.config import settings
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

```text
request → get_db() → endpoint → finally → db.close()
```

SQLAlchemy reconoce el motor por la URL, por ejemplo `postgresql+psycopg2://...`.

**Documentación:** [Engine](https://docs.sqlalchemy.org/en/20/core/engines.html) · [Session](https://docs.sqlalchemy.org/en/20/orm/session_basics.html) · [dependencias con `yield`](https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/)

## 5. Modelos SQLAlchemy

### `models/product.py`

**Qué:** define las tablas `productos` y `cities`.

```python
from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.ext.mutable import MutableList
from src.db.base import Base
class Producto(Base):
    __tablename__ = "productos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, nullable=False)
    precio = Column(Float, nullable=False)
    disponible = Column(Boolean, default=True, nullable=False)
    cityId = Column(Integer, ForeignKey("cities.id"), nullable=True)
    tags = Column(MutableList.as_mutable(JSON), default=list, nullable=False)
    descripcion = Column(String, nullable=True)
class City(Base):
    __tablename__ = "cities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)
```

**Documentación:** [tablas declarativas](https://docs.sqlalchemy.org/en/20/orm/declarative_tables.html) · [JSON](https://docs.sqlalchemy.org/en/20/core/type_basics.html#sqlalchemy.types.JSON) · [MutableList](https://docs.sqlalchemy.org/en/20/orm/extensions/mutable.html)

### `models/user.py`

**Qué:** define la tabla de usuarios. `hashed_password` guarda Argon2id, no texto plano.

```python
from sqlalchemy import Boolean, Column, Integer, String
from src.db.base import Base
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
```

**Documentación:** [columnas ORM](https://docs.sqlalchemy.org/en/20/orm/declarative_tables.html) · [restricciones `UNIQUE`](https://docs.sqlalchemy.org/en/20/core/constraints.html)

## 6. DTOs Pydantic

### `dtos/product.py`

**Qué:** valida el JSON de productos y controla la respuesta.

```python
from pydantic import BaseModel, ConfigDict, Field
class ProductoCreate(BaseModel):
    nombre: str
    precio: float
    disponible: bool = True
    tags: list[str] = Field(default_factory=list)
    descripcion: str | None = None
    cityId: int | None = None
class ProductoOut(ProductoCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
```

### `dtos/user.py` y `dtos/auth.py`

**Qué:** valida el registro y evita que el hash aparezca en la respuesta.

```python
from pydantic import BaseModel, ConfigDict, EmailStr, Field
class UserCreate(BaseModel):
    username: EmailStr
    password: str = Field(min_length=8, max_length=100)
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: EmailStr
    is_active: bool
class Token(BaseModel):
    access_token: str
    token_type: str
```

El modelo ORM usa `String`; `EmailStr` solamente valida la entrada y salida HTTP.

**Documentación:** [modelos Pydantic](https://docs.pydantic.dev/latest/concepts/models/) · [`EmailStr`](https://docs.pydantic.dev/latest/api/networks/#pydantic.networks.EmailStr) · [`response_model`](https://fastapi.tiangolo.com/tutorial/response-model/)

## 7. `dependencies/auth.py`

**Qué:** extrae el Bearer token, valida el JWT y devuelve el usuario actual.

**Por qué no va en `core/security.py`:** aquí sí se usan `Depends`, HTTP y SQLAlchemy.

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session
from src.core.security import decode_access_token
from src.db.session import get_db
from src.models.user import User
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        user_id = int(decode_access_token(token)["sub"])
    except (InvalidTokenError, KeyError, TypeError, ValueError) as exc:
        raise error from exc
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise error
    return user
```

**Documentación:** [usuario actual](https://fastapi.tiangolo.com/tutorial/security/get-current-user/) · [`OAuth2PasswordBearer`](https://fastapi.tiangolo.com/reference/security/#fastapi.security.OAuth2PasswordBearer)

## 8. `routers/auth.py`

**Qué:** contiene registro, login y consulta del usuario autenticado.

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from src.core.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    hash_password,
    verify_password,
)
from src.db.session import get_db
from src.dependencies.auth import get_current_user
from src.dtos.auth import Token
from src.dtos.user import UserCreate, UserOut
from src.models.user import User
router = APIRouter(prefix="/auth", tags=["auth"])
@router.post("/register", response_model=UserOut, status_code=201)
def register(user: UserCreate, db: Session = Depends(get_db)):
    new_user = User(
        username=str(user.username),
        hashed_password=hash_password(user.password),
    )
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "El correo ya está registrado") from exc
    db.refresh(new_user)
    return new_user
@router.post("/token", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == form.username).first()
    if user is None:
        verify_password(form.password, DUMMY_PASSWORD_HASH)
    if user is None or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {
        "access_token": create_access_token(str(user.id)),
        "token_type": "bearer",
    }
@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
```

`/auth/token` recibe formulario `application/x-www-form-urlencoded`, no JSON.

**Documentación:** [OAuth2 con JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/) · [formularios](https://fastapi.tiangolo.com/tutorial/request-forms/)

## 9. `routers/producto.py`

**Qué:** contiene los endpoints CRUD y utiliza los DTOs, modelos y la sesión.

```python
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session
from src.db.session import get_db
from src.dependencies.auth import get_current_user
from src.dtos.product import ProductoCreate, ProductoOut
from src.models.product import Producto
router = APIRouter(
    prefix="/v2",
    tags=["productos"],
    dependencies=[Depends(get_current_user)],
)
@router.post("/", response_model=ProductoOut, status_code=201)
def crear(data: ProductoCreate, db: Session = Depends(get_db)):
    producto = Producto(**data.model_dump())
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto
@router.get("/", response_model=list[ProductoOut])
def listar(db: Session = Depends(get_db)):
    return db.query(Producto).filter(Producto.disponible.is_(True)).all()
@router.get("/{product_id}", response_model=ProductoOut)
def obtener(product_id: int, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.id == product_id).first()
    if producto is None:
        raise HTTPException(404, "Producto no encontrado")
    return producto
@router.delete("/", response_model=str)
def eliminar(productName: str = Body(embed=True), db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.nombre == productName).first()
    if producto is None:
        raise HTTPException(404, "Producto no encontrado")
    producto.disponible = False
    db.commit()
    return "Producto eliminado exitosamente"
```

**Documentación:** [`APIRouter`](https://fastapi.tiangolo.com/reference/apirouter/) · [`Body(embed=True)`](https://fastapi.tiangolo.com/tutorial/body-multiple-params/#embed-a-single-body-parameter) · [dependencias en decoradores](https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-in-path-operation-decorators/)

## 10. `main.py`

**Qué:** crea la aplicación, importa modelos y registra routers y middleware.

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.db.base import Base
from src.db.session import engine
from src.models import product, user  # registra las tablas en Base.metadata
from src.routers import auth, producto
Base.metadata.create_all(bind=engine)
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(producto.router)
```

`create_all()` crea tablas faltantes, pero no modifica tablas existentes. Para eso se usa [Alembic](https://alembic.sqlalchemy.org/en/latest/).

**Documentación:** [aplicaciones grandes](https://fastapi.tiangolo.com/tutorial/bigger-applications/) · [CORS](https://fastapi.tiangolo.com/tutorial/cors/)

## 11. Dependencias y Docker

### `requirements.txt`

```text
fastapi
uvicorn[standard]
SQLAlchemy
psycopg2-binary
pydantic-settings
pydantic[email]
python-multipart
pyjwt
pwdlib[argon2]
```

### `backend.Dockerfile`

```dockerfile
FROM python:3.10-alpine

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "4000", "--reload"]
```

### `compose.yml`

```yaml
services:
  bd:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build:
      context: ./backend
      dockerfile: backend.Dockerfile
    ports:
      - "3000:4000"
    environment:
      database_url: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@bd/${POSTGRES_DB}
      jwt_secret_key: ${JWT_SECRET_KEY}
    depends_on:
      - bd

volumes:
  pgdata:
```

Si cambia `requirements.txt`, reconstruye la imagen:

```powershell
docker compose up -d --build
```

**Documentación:** [Dockerfile](https://docs.docker.com/reference/dockerfile/) · [Docker Compose](https://docs.docker.com/reference/compose-file/) · [FastAPI en Docker](https://fastapi.tiangolo.com/deployment/docker/)

## 12. Flujos esenciales

### Registro y login

```text
POST /auth/register → UserCreate → hash_password → users.hashed_password
POST /auth/token    → verificar hash → JWT con sub=user.id
GET  /auth/me       → Bearer token → get_current_user → UserOut
```

### Ruta protegida

```text
request /v2 → OAuth2PasswordBearer → decode_access_token
            → buscar User por sub → ejecutar endpoint
```

### Producto

```text
JSON → ProductoCreate → Producto ORM → commit → ProductoOut → JSON
```

## 13. Checklist y errores comunes

Al agregar un recurso nuevo:

1. Crear `models/recurso.py`.
2. Crear `dtos/recurso.py`.
3. Crear `routers/recurso.py`.
4. Importar el modelo antes de `create_all()`.
5. Incluir el router en `main.py`.
6. Crear una migración si cambia una tabla existente.

Errores frecuentes:

- `422` en `/auth/token`: se envió JSON; debe enviarse un formulario.
- `401`: falta el Bearer token o es inválido/expiró.
- Cambio de columna no aplicado: `create_all()` no migra tablas existentes.
- Dependencia nueva no instalada: ejecutar `docker compose up -d --build`.
- `tags` continúa como `varchar[]`: crear una migración de `ARRAY` a `JSON`.
