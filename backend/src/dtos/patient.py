from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PacienteCreate(BaseModel):
    tipo_documento: str = Field(min_length=1, max_length=20)
    documento: str = Field(min_length=1, max_length=50)
    nombre_completo: str = Field(min_length=1, max_length=200)
    fecha_nacimiento: date
    genero: str = Field(min_length=1, max_length=30)
    telefono: str | None = Field(default=None, max_length=30)
    correo: EmailStr | None = None
    eps_codigo: str | None = Field(default=None, max_length=50)
    eps_nombre: str | None = Field(default=None, max_length=150)
    ciudad: str | None = Field(default=None, max_length=100)
    prioridad: str = Field(min_length=1, max_length=30)
    estado: str = Field(min_length=1, max_length=30)


class PacienteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    paciente_id: int
    tipo_documento: str
    documento: str
    nombre_completo: str
    fecha_nacimiento: date
    genero: str
    telefono: str | None
    correo: EmailStr | None
    eps_codigo: str | None
    eps_nombre: str | None
    ciudad: str | None
    prioridad: str
    estado: str
    fecha_creacion: datetime
    fecha_actualizacion: datetime
