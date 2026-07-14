from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from src.db.base import Base
from src.db.seed import cargar_datos_demo
from src.db.session import engine
from src.core.config import settings
from src.routers import (
    auth,
    dashboard,
    pacientes,
    producto,
    registros_login,
    roles,
    usuarios,
)
from src.models import login_record, patient, product, role, user

Base.metadata.create_all(bind=engine)
if settings.seed_demo_data:
    cargar_datos_demo()
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
    expose_headers=["X-Total-Count"],
)

# enlazar routers
app.include_router(auth.router)
app.include_router(producto.router)
app.include_router(pacientes.router)
app.include_router(roles.router)
app.include_router(usuarios.router)
app.include_router(registros_login.router)
app.include_router(dashboard.router)


@app.get("/", response_class=HTMLResponse)
def hello_world():
    return "<p>API RUNNING</p>"
