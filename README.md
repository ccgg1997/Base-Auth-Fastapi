# Estructura FastAPI + SQLAlchemy + PostgreSQL + JWT

Esta guía explica qué contiene actualmente cada archivo del backend, por qué se separa y cómo se relaciona con el resto de la aplicación.

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

def hash_password(password: str) -> str:
    return password_hash.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)

def create_access_token(subject: str):
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.access_token_expire_minutes)

    payload = {
        "sub": subject,
        "iat": now,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

def decode_access_token(token: str):
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["exp", "iat", "sub"]},
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
    disponible = Column(Boolean, default=True)
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
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
```

**Documentación:** [columnas ORM](https://docs.sqlalchemy.org/en/20/orm/declarative_tables.html) · [restricciones `UNIQUE`](https://docs.sqlalchemy.org/en/20/core/constraints.html)

## 6. DTOs Pydantic

### `dtos/product.py`

**Qué:** valida el JSON de productos y controla la respuesta.

```python
from typing import List, Optional

from pydantic import BaseModel, Field


class ProductoCreate(BaseModel):
    nombre: str
    precio: float
    disponible: bool = True
    tags: List[str] = []
    descripcion: Optional[str] = None
    cityId: Optional[int] = None


class City(BaseModel):
    id: int
    name: str
    country: str

    class Config:
        from_attributes = True


class ProductoOut(BaseModel):
    id: int
    nombre: str
    precio: float
    descripcion: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    disponible: bool = True
    cityId: Optional[int] = None

    class Config:
        from_attributes = True
```

### `dtos/user.py` y `dtos/auth.py`

**Qué:** valida el registro y evita que el hash aparezca en la respuesta.

```python
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    username: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


class UserOut(BaseModel):
    id: int
    username: EmailStr
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
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
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
    except (InvalidTokenError, KeyError, TypeError, ValueError) as exc:
        raise credentials_exception from exc

    user = db.query(User).filter(User.username == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user
```

En la implementación actual, el claim `sub` del JWT contiene el `username` (el correo), por eso la dependencia busca con `User.username`. El valor usado al crear y al validar el token debe mantenerse consistente.

**Documentación:** [usuario actual](https://fastapi.tiangolo.com/tutorial/security/get-current-user/) · [`OAuth2PasswordBearer`](https://fastapi.tiangolo.com/reference/security/#fastapi.security.OAuth2PasswordBearer)

## 8. `routers/auth.py`

**Qué:** contiene registro, login y consulta del usuario autenticado.

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.security import create_access_token, hash_password, verify_password
from src.db.session import get_db
from src.dependencies.auth import get_current_user
from src.dtos.auth import Token
from src.dtos.user import UserCreate, UserOut
from src.models.user import User


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")

    new_user = User(
        username=user.username,
        hashed_password=hash_password(user.password),
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
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Nombre de usuario o contraseña incorrectos")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="El usuario está inactivo")

    return {
        "access_token": create_access_token(form_data.username),
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
    }


@router.get("/me", response_model=UserOut)
def get_my_user(
    current_user: User = Depends(get_current_user),
):
    return current_user
```

`/auth/token` recibe formulario `application/x-www-form-urlencoded`, no JSON.

Contratos HTTP actuales: el registro exitoso responde `200`; las credenciales incorrectas responden `400`; un usuario inactivo responde `403`; y un token ausente, inválido o expirado en una ruta protegida responde `401`.

**Documentación:** [OAuth2 con JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/) · [formularios](https://fastapi.tiangolo.com/tutorial/request-forms/)

## 9. `routers/producto.py`

**Qué:** contiene los endpoints CRUD y utiliza los DTOs, modelos y la sesión.

```python
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.dependencies.auth import get_current_user
from src.dtos.product import ProductoCreate, ProductoOut
from src.models.product import Producto


router = APIRouter(prefix="/v2", tags=["productos"])


@router.post(
    "/",
    response_model=ProductoOut,
    dependencies=[Depends(get_current_user)],
)
def crear_producto(data: ProductoCreate, db: Session = Depends(get_db)):
    existing_product = (
        db.query(Producto)
        .filter(Producto.nombre == data.nombre)
        .first()
    )
    if existing_product is not None:
        raise HTTPException(status_code=400, detail="El nombre de producto ya existe")

    producto = Producto(**data.model_dump())
    db.add(producto)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=(
                exc.args[0]
                if isinstance(exc, IntegrityError)
                else "Error al crear el producto"
            ),
        )
    db.refresh(producto)
    return producto


@router.delete(
    "/",
    response_model=str,
    dependencies=[Depends(get_current_user)],
)
def eliminar_producto(
    productName: str = Body(embed=True),
    db: Session = Depends(get_db),
):
    existing_product = (
        db.query(Producto)
        .filter(Producto.nombre == productName)
        .first()
    )
    if existing_product is None:
        raise HTTPException(status_code=400, detail="El nombre de producto ya existe")

    try:
        existing_product.disponible = False
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="El nombre de producto ya existe",
        )
    db.refresh(existing_product)
    return "Producto eliminado exitosamente"


@router.get(
    "/",
    response_model=list[ProductoOut],
    dependencies=[Depends(get_current_user)],
)
def listar_productos(db: Session = Depends(get_db)):
    return db.query(Producto).filter(Producto.disponible == True).all()


@router.get(
    "/{product_id}",
    response_model=ProductoOut,
    dependencies=[Depends(get_current_user)],
)
def obtener_producto(product_id: int, db: Session = Depends(get_db)):
    producto = (
        db.query(Producto)
        .filter(
            Producto.id == product_id,
            Producto.disponible == True,
        )
        .first()
    )
    if producto is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto
```

El ejemplo conserva el comportamiento del router real; solamente omite los `print()` de depuración y comentarios que no cambian el contrato del endpoint.

Cada operación está protegida con `dependencies=[Depends(get_current_user)]`. Esa forma valida el token sin agregar un parámetro que el endpoint no utiliza. También se podría colocar la dependencia una sola vez en `APIRouter(...)`; ambas opciones son válidas, pero el ejemplo anterior refleja la implementación actual por endpoint.

**Documentación:** [`APIRouter`](https://fastapi.tiangolo.com/reference/apirouter/) · [`Body(embed=True)`](https://fastapi.tiangolo.com/tutorial/body-multiple-params/#embed-a-single-body-parameter) · [dependencias en decoradores](https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-in-path-operation-decorators/)

## 10. `main.py`

**Qué:** crea la aplicación, importa modelos y registra routers y middleware.

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from src.db.base import Base
from src.db.session import engine
from src.models import product, user
from src.routers import auth, producto

Base.metadata.create_all(bind=engine)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://192.168.56.1:3001",
    ],
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router)
app.include_router(producto.router)


@app.get("/", response_class=HTMLResponse)
def hello_world():
    return "<p>API RUNNING</p>"
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
FROM python:3.10.20-alpine3.24

WORKDIR /app
COPY requirements.txt ./
RUN pip install -r requirements.txt
COPY . .

EXPOSE 4000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "4000", "--reload"]
```

### `compose.yml`

```yaml
services:
  bd:
    container_name: bd
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: fsdb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 3s
      timeout: 3s
      retries: 10
      start_period: 5s
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  bdcli:
    container_name: bdcli
    image: dpage/pgadmin4:8
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_DEFAULT_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_DEFAULT_PASSWORD}
    ports:
      - "8080:80"
    depends_on:
      bd:
        condition: service_healthy

  backend:
    container_name: backend
    build:
      context: ./backend
      dockerfile: backend.Dockerfile
    restart: always
    ports:
      - "3000:4000"
    environment:
      - database_url=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@bd/${POSTGRES_DB}
      - jwt_secret_key=${JWT_SECRET_KEY}
    depends_on:
      bd:
        condition: service_healthy
    volumes:
      - ./backend:/app

volumes:
  pgdata: {}
```

El valor de `POSTGRES_DB` usado por PostgreSQL y el incluido en `database_url` debe ser el mismo. Con la configuración actual, `.env` debe definir `POSTGRES_DB=fsdb`; si se cambia uno, también debe cambiarse el otro.

### Variables de entorno

El repositorio incluye `.envexample`. Antes de iniciar los contenedores, crea el archivo local `.env`:

```powershell
Copy-Item .envexample .env
```

Después completa estas variables:

```dotenv
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=fsdb
PGADMIN_DEFAULT_EMAIL=
PGADMIN_DEFAULT_PASSWORD=
JWT_SECRET_KEY=
```

`JWT_SECRET_KEY` no debe quedar vacía: debe ser un secreto largo y aleatorio. `.env` está ignorado por Git y no se debe subir al repositorio.

Si cambia `requirements.txt`, reconstruye la imagen:

```powershell
docker compose up -d --build
```

**Documentación:** [Dockerfile](https://docs.docker.com/reference/dockerfile/) · [Docker Compose](https://docs.docker.com/reference/compose-file/) · [FastAPI en Docker](https://fastapi.tiangolo.com/deployment/docker/)

## 12. Flujos esenciales

### Registro y login

```text
POST /auth/register → UserCreate → hash_password → users.hashed_password
POST /auth/token    → verificar hash → JWT con sub=user.username
GET  /auth/me       → Bearer token → get_current_user → UserOut
```

### Ruta protegida

```text
request /v2 → OAuth2PasswordBearer → decode_access_token
            → buscar User.username por sub → validar is_active → ejecutar endpoint
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
6. Agregar `dependencies=[Depends(get_current_user)]` a cada operación que deba ser privada, o proteger todo el `APIRouter` con esa dependencia.
7. Inyectar `db: Session = Depends(get_db)` en las operaciones que consulten o modifiquen la base de datos.
8. Crear una migración si cambia una tabla existente.

Errores frecuentes:

- `422` en `/auth/token`: se envió JSON; debe enviarse un formulario.
- `401`: falta el Bearer token o es inválido/expiró.
- `403` en `/auth/token`: el usuario existe, pero está inactivo.
- Endpoint nuevo accesible sin token: faltó agregar `Depends(get_current_user)` al endpoint o al router.
- Cambio de columna no aplicado: `create_all()` no migra tablas existentes.
- Dependencia nueva no instalada: ejecutar `docker compose up -d --build`.
- Backend reiniciándose con `database ... does not exist`: `POSTGRES_DB` no coincide con la base incluida en `database_url`.
- `tags` continúa como `varchar[]`: crear una migración de `ARRAY` a `JSON`.
