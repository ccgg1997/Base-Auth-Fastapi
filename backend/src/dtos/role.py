from pydantic import BaseModel, ConfigDict, Field


class RolCreate(BaseModel):
    codigo: str = Field(min_length=1, max_length=50)
    nombre: str = Field(min_length=1, max_length=100)
    descripcion: str | None = Field(default=None, max_length=500)
    activo: bool = True


class RolResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rol_id: int
    codigo: str
    nombre: str
    descripcion: str | None
    activo: bool
