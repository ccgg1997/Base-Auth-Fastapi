# Estructura FastAPI + SQLAlchemy + Postgres

## Árbol de carpetas

```
backend/
  requirements.txt
  backend.Dockerfile
  src/
    main.py              # arranque: crea app + engancha routers
    core/
      config.py          # lee env vars (DATABASE_URL)
    db/
      base.py            # Base = declarative_base() (padre de models)
      session.py         # engine, SessionLocal, get_db()
    models/
      product.py         # tabla Producto(Base) -> BD
    schemas/
      product.py         # ProductoCreate, ProductoOut (DTOs Pydantic)
    routers/
      product.py         # endpoints POST/GET /productos
```

---

## Qué va en cada archivo y POR QUÉ

### `core/config.py`
**QUÉ:** Lee variables de entorno (env vars).
**POR QUÉ:** La URL de Postgres cambia entre dev/prod, y passwords nunca van hardcodeados. Viven en `.env` o en variables del sistema. Pydantic Settings mapea automático.

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str  # lee DATABASE_URL de env

settings = Settings()
```

**Cómo se usa:**
- `compose.yml` define `environment: DATABASE_URL=...`
- `session.py` importa `from src.core.config import settings` y usa `settings.database_url`

---

### `db/base.py`
**QUÉ:** Define `Base = declarative_base()`, la clase padre de TODOS los modelos ORM.
**POR QUÉ:** SQLAlchemy necesita una clase central que "agrupe" todas las tablas. Eso permite que:
1. Un modelo herede de `Base` → SQLAlchemy sabe que es una tabla
2. `Base.metadata.create_all(engine)` crea TODAS las tablas de un golpe

```python
from sqlalchemy.orm import declarative_base

Base = declarative_base()
```

**Uso:** Cada modelo hereda → `class Producto(Base):`

---

### `db/session.py`
**QUÉ:** Conexión física a Postgres + fábrica de sesiones + función para inyectar sesión en endpoints.
**POR QUÉ:**
- Una sola conexión (`engine`) reutilizable para múltiples requests.
- Una sesión por request (conversación con la BD).
- `get_db()` con `yield` cierra la sesión automáticamente (incluso si hay error).

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.core.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db      # presta sesion al endpoint
    finally:
        db.close()    # cierra siempre, incluso si error
```

**Flujo:** 
```
request → FastAPI crea DB con get_db() → endpoint lo recibe con Depends() → endpoint termina → finally cierra BD
```

---

### `models/product.py`
**QUÉ:** Define la tabla `productos` en la BD (SQLAlchemy ORM).
**POR QUÉ:** Separar "estructura de la BD" de "lo que la API devuelve". Cambias la tabla sin romper la API.

**IMPORTANTE:** Es DISTINTO de `schemas/product.py`.
- `models/` = SQLAlchemy = cómo es la tabla en Postgres
- `schemas/` = Pydantic = qué JSON entra/sale de la API

```python
from sqlalchemy import Column, Integer, String, Float, Boolean, ARRAY
from src.db.base import Base

class Producto(Base):
    __tablename__ = "productos"  # nombre tabla en Postgres
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    precio = Column(Float, nullable=False)
    descripcion = Column(String, nullable=True)
    disponible = Column(Boolean, default=True)
    tags = Column(ARRAY(String), default=list)
    cityId = Column(Integer, nullable=True)
```

**Mapeo campos:**
- `Column(Integer, primary_key=True)` = id autogenerado (Postgres lo crea)
- `nullable=False` = NOT NULL (obligatorio en BD)
- `nullable=True` = permite NULL
- `default=True` = si no pasas valor, la tabla pone True
- `index=True` = crea índice en BD (búsquedas rápidas)
- `ARRAY(String)` = tipo Postgres para listas (porque tags es List[str])

---

### `schemas/product.py`
**QUÉ:** DTOs (Data Transfer Objects) Pydantic. Validan qué JSON entra/sale.
**POR QUÉ:**
1. **Validación entrada:** `ProductoCreate` valida que el cliente mande campos obligatorios y tipos correctos.
2. **Filtro salida:** `ProductoOut` decide qué campos devuelves (ej. ocultar `password`).
3. **Decoupling:** si cambias la tabla (agregas columna interna), no necesitas cambiar el DTOs de la API.

```python
from typing import Optional, List
from pydantic import BaseModel

class ProductoCreate(BaseModel):
    nombre: str
    precio: float
    disponible: bool = True
    tags: List[str] = []
    descripcion: Optional[str] = None
    cityId: Optional[int] = None

class ProductoOut(BaseModel):
    id: int
    nombre: str
    precio: float
    disponible: bool = True
    tags: List[str] = []
    descripcion: Optional[str] = None
    cityId: Optional[int] = None
    
    class Config:
        from_attributes = True  # lee objetos ORM, no solo dicts
```

**Diferencia entrada vs salida:**
- `ProductoCreate`: SIN `id` (cliente no lo manda, Postgres lo genera)
- `ProductoOut`: CON `id` (respuesta incluye lo que se guardó)

**`from_attributes = True`:** Pydantic v2. Permite leer desde objeto SQLAlchemy (`.id`) no solo desde dict (`["id"]`).

---

### `routers/product.py`
**QUÉ:** Endpoints HTTP (POST/GET /productos).
**POR QUÉ:** Separar "qué pide HTTP" de "cómo accedo datos". Router = HTTP. Session/models = datos.

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.db.session import get_db
from src.models.product import Producto
from src.schemas.product import ProductoCreate, ProductoOut

router = APIRouter(prefix="/productos", tags=["productos"])

@router.post("", response_model=ProductoOut)
def crear_producto(data: ProductoCreate, db: Session = Depends(get_db)):
    producto = Producto(**data.model_dump())  # convierte DTO a modelo ORM
    db.add(producto)
    db.commit()
    db.refresh(producto)  # recarga desde BD (obtiene id generado)
    return producto  # FastAPI convierte modelo ORM → ProductoOut JSON

@router.get("", response_model=list[ProductoOut])
def listar_productos(db: Session = Depends(get_db)):
    return db.query(Producto).all()

@router.get("/{producto_id}", response_model=ProductoOut)
def obtener_producto(producto_id: int, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="no existe")
    return producto
```

**Flujo por línea:**
1. `@router.post("")` + `prefix="/productos"` = POST /productos
2. `data: ProductoCreate` = FastAPI valida entrada con Pydantic (error 422 si falla)
3. `db: Session = Depends(get_db)` = inyecta sesión BD, abre/cierra automático
4. `Producto(**data.model_dump())` = convierte DTO Pydantic → modelo ORM
5. `db.add()` + `db.commit()` = guarda en BD
6. `db.refresh()` = recarga desde BD (obtiene `id` que generó Postgres)
7. `return producto` = FastAPI convierte modelo ORM → JSON con `response_model=ProductoOut` (usa `from_attributes`)

---

### `main.py`
**QUÉ:** Punto de entrada. Crea app FastAPI + engancha routers + crea tablas.
**POR QUÉ:** Centralizado: si necesitas middleware, headers globales, setup, lo tocas una vez aquí.

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.db.base import Base
from src.db.session import engine
from src.routers import product

# crea tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# engancha router de productos
app.include_router(product.router)

@app.get("/")
def health():
    return {"status": "ok"}
```

**`Base.metadata.create_all(bind=engine)`:** 
- Recorre TODOS los modelos que heredan de `Base` (product.py, user.py, lo que agregues).
- Crea las tablas en Postgres si no existen.
- Si la tabla ya existe, no hace nada.
- En producción real usarías **Alembic** (migraciones versionadas), pero para dev esto es rápido.

---

### `requirements.txt`
**QUÉ:** Dependencias Python.
**POR QUÉ:** Docker sabe qué instalar.

```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
pydantic-settings
```

- `fastapi` = el framework
- `uvicorn` = servidor ASGI (corre FastAPI en puerto 4000)
- `sqlalchemy` = ORM (habla SQL sin escribir SQL)
- `psycopg2-binary` = driver Postgres (sin esto SQLAlchemy no puede conectar)
- `pydantic-settings` = lee env vars (en v2 es paquete aparte)

---

### `compose.yml` (servicio backend)
**QUÉ:** Configuración Docker Compose para el contenedor backend.
**POR QUÉ:** Define puerto, env vars, volúmenes, dependencias.

```yaml
  backend:
    container_name: backend
    build:
      context: ./backend
      dockerfile: backend.Dockerfile
    restart: always
    ports:
      - "3000:4000"  # localhost:3000 → contenedor:4000
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@bd:5432/fsdb
    depends_on:
      - bd
    volumes:
      - ./backend:/app  # código local → /app en contenedor (hot reload)
```

**Detalles:**
- `ports: "3000:4000"` = puerto local 3000 → puerto contenedor 4000 (donde escucha uvicorn)
- `DATABASE_URL: postgresql://...@bd:5432/fsdb` = `bd` es el nombre del servicio Postgres (no localhost)
- `${POSTGRES_USER}:${POSTGRES_PASSWORD}` = compose sustituye desde `.env`
- `volumes: ./backend:/app` = cambios locales se ven adentro (reload automático con `--reload`)

---

## Cómo fluye un request POST /productos

```
1. Cliente envía: { "nombre": "silla", "precio": 50 }
                    ↓
2. main.py → app.include_router(product.router) → busca POST ""
                    ↓
3. routers/product.py → @router.post("")
                    ↓
4. FastAPI valida entrada con schemas.ProductoCreate
   Si falla: error 422
                    ↓
5. Inyecta sesión BD con Depends(get_db)
   get_db() abre SessionLocal
                    ↓
6. Endpoint convierte DTO → modelo ORM:
   Producto(**data.model_dump())
                    ↓
7. db.add() + db.commit() → SQL INSERT en Postgres
                    ↓
8. db.refresh() → recarga desde BD (obtiene id=1, generado por Postgres)
                    ↓
9. FastAPI convierte modelo ORM → JSON con response_model=ProductoOut
   (usa from_attributes=True para leer .id, .nombre, etc)
                    ↓
10. Envía: { "id": 1, "nombre": "silla", "precio": 50, ... }
                    ↓
11. finally: db.close() → cierra sesión
```

---

## Resumen: Quién depende de quién

```
main.py
  ├─ depende de: db/base.py (Base), db/session.py (engine), routers/product.py (router)
  └─ hace: create_all(engine) + include_router()

routers/product.py
  ├─ depende de: db/session.py (get_db), models/product.py (Producto tabla), schemas/product.py (DTOs)
  └─ hace: operaciones CRUD contra la BD

db/session.py
  ├─ depende de: core/config.py (settings.database_url)
  └─ hace: engine + get_db()

db/base.py
  └─ hace: Base (padre de models)

models/product.py
  ├─ depende de: db/base.py (Base)
  └─ define: tabla Producto

schemas/product.py
  └─ define: DTOs ProductoCreate, ProductoOut (validación Pydantic)

core/config.py
  └─ lee: env vars (DATABASE_URL)
```

---

## Checklist al agregar nuevo recurso (ej. usuarios)

1. ✅ `models/user.py` → `class User(Base): __tablename__ = "users"`
2. ✅ `schemas/user.py` → `class UserCreate(BaseModel)`, `class UserOut(BaseModel)`
3. ✅ `routers/user.py` → endpoints POST/GET con `@router.post()`, `@router.get()`
4. ✅ `main.py` → `from src.routers import user` + `app.include_router(user.router)`

Eso es todo. No tocas `core/`, `db/`, `requirements.txt` (salvo si necesitas un paquete nuevo).

---

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `ModuleNotFoundError: no module named 'models'` | import sin `src.` prefijo | usa `from src.models.product import Producto` |
| `ImportError: cannot import name 'declarative_base' from 'sqlalchemy'` | versión vieja código, SQLAlchemy 2.0 | usa `from sqlalchemy.orm import declarative_base` |
| `ImportError: cannot import name 'BaseSettings' from 'pydantic'` | Pydantic v2, BaseSettings se movió | usa `from pydantic_settings import BaseSettings` + agrega `pydantic-settings` a requirements |
| `from_attributes = True` no funciona | usas `orm_mode` (Pydantic v1) | usa `from_attributes` (Pydantic v2) |
| objeto ORM no se convierte a JSON | falta `from_attributes = True` en schema | agrega `class Config: from_attributes = True` |
| sesión no cierra, "Too many connections" | endpoint no cierra sesión | usa `Depends(get_db)` con `yield` en get_db() |

