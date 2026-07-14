from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, String, func
from sqlalchemy.orm import relationship, synonym

from src.db.base import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    usuario_id = Column(BigInteger, primary_key=True, index=True)
    usuario = Column(String(100), unique=True, nullable=False, index=True)
    nombre = Column(String(150), nullable=False)
    rol_id = Column(
        ForeignKey("roles.rol_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    activo = Column(Boolean, nullable=False, default=True, server_default="true")
    password_hash = Column(String(255), nullable=False)
    nota = Column(String(500), nullable=True)
    fecha_creacion = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    fecha_actualizacion = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    rol = relationship("Rol", back_populates="usuarios")
    registros_login = relationship("RegistroLogin", back_populates="usuario")

    # Alias temporales para conservar compatibilidad con el código de autenticación.
    id = synonym("usuario_id")
    username = synonym("usuario")
    hashed_password = synonym("password_hash")
    is_active = synonym("activo")


# Conserva los imports actuales: from src.models.user import User.
User = Usuario
