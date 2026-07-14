from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


EstadoPaciente = Literal["Pendiente", "En atención", "Atendido"]


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
    estado: EstadoPaciente
    active: bool = True


class PacienteUpdate(BaseModel):
    tipo_documento: str | None = Field(default=None, min_length=1, max_length=20)
    documento: str | None = Field(default=None, min_length=1, max_length=50)
    nombre_completo: str | None = Field(default=None, min_length=1, max_length=200)
    fecha_nacimiento: date | None = None
    genero: str | None = Field(default=None, min_length=1, max_length=30)
    telefono: str | None = Field(default=None, max_length=30)
    correo: EmailStr | None = None
    eps_codigo: str | None = Field(default=None, max_length=50)
    eps_nombre: str | None = Field(default=None, max_length=150)
    ciudad: str | None = Field(default=None, max_length=100)
    prioridad: str | None = Field(default=None, min_length=1, max_length=30)
    estado: EstadoPaciente | None = None
    active: bool | None = None

    @model_validator(mode="after")
    def validar_campos_no_nulos(self):
        campos_obligatorios = {
            "tipo_documento",
            "documento",
            "nombre_completo",
            "fecha_nacimiento",
            "genero",
            "prioridad",
            "estado",
            "active",
        }
        enviados_nulos = {
            campo
            for campo in campos_obligatorios & self.model_fields_set
            if getattr(self, campo) is None
        }
        if enviados_nulos:
            raise ValueError(
                f"Los campos {', '.join(sorted(enviados_nulos))} no aceptan null"
            )
        return self


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
    estado: EstadoPaciente
    active: bool
    fecha_creacion: datetime
    fecha_actualizacion: datetime


class PacientesCSVResponse(BaseModel):
    usuarios_insertados: int
    iderror: list[int]
