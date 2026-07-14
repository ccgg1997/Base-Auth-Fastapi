from sqlalchemy import Boolean, Column, SmallInteger, String
from sqlalchemy.orm import relationship

from src.db.base import Base


class Rol(Base):
    __tablename__ = "roles"

    rol_id = Column(SmallInteger, primary_key=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(500), nullable=True)
    activo = Column(Boolean, nullable=False, default=True, server_default="true")

    usuarios = relationship("Usuario", back_populates="rol")
