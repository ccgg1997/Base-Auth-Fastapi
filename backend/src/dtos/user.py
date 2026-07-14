from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UsuarioCreate(BaseModel):
    usuario: str = Field(min_length=3, max_length=100)
    nombre: str = Field(min_length=1, max_length=150)
    rol_id: int = Field(gt=0)
    activo: bool = True
    password: str = Field(min_length=8, max_length=128)
    nota: str | None = Field(default=None, max_length=500)


class UsuarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    usuario_id: int
    usuario: str
    nombre: str
    rol_id: int
    activo: bool
    nota: str | None
    fecha_creacion: datetime
    fecha_actualizacion: datetime


# Alias para no romper los imports existentes de los routers.
UserCreate = UsuarioCreate
UserOut = UsuarioResponse
