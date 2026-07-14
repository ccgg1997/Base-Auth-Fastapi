from datetime import datetime
from ipaddress import IPv4Address, IPv6Address

from pydantic import BaseModel, ConfigDict, Field


class RegistroLoginCreate(BaseModel):
    usuario_id: int | None = Field(default=None, gt=0)
    usuario_intentado: str = Field(min_length=1, max_length=100)
    exitoso: bool
    direccion_ip: IPv4Address | IPv6Address | None = None
    user_agent: str | None = None
    motivo_fallo: str | None = Field(default=None, max_length=255)


class RegistroLoginResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    login_id: int
    usuario_id: int | None
    usuario_intentado: str
    fecha_login: datetime
    exitoso: bool
    direccion_ip: IPv4Address | IPv6Address | None
    user_agent: str | None
    motivo_fallo: str | None
