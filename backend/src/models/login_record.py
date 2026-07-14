from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import relationship

from src.db.base import Base


class RegistroLogin(Base):
    __tablename__ = "registros_login"

    login_id = Column(BigInteger, primary_key=True, index=True)
    usuario_id = Column(
        ForeignKey("usuarios.usuario_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    usuario_intentado = Column(String(100), nullable=False, index=True)
    fecha_login = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
    exitoso = Column(Boolean, nullable=False)
    direccion_ip = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    motivo_fallo = Column(String(255), nullable=True)

    usuario = relationship("Usuario", back_populates="registros_login")
