from sqlalchemy import BigInteger, Column, Date, DateTime, String, func

from src.db.base import Base


class Paciente(Base):
    __tablename__ = "pacientes"

    paciente_id = Column(BigInteger, primary_key=True, index=True)
    tipo_documento = Column(String(20), nullable=False)
    documento = Column(String(50), unique=True, nullable=False, index=True)
    nombre_completo = Column(String(200), nullable=False)
    fecha_nacimiento = Column(Date, nullable=False)
    genero = Column(String(30), nullable=False)
    telefono = Column(String(30), nullable=True)
    correo = Column(String(254), nullable=True)
    eps_codigo = Column(String(50), nullable=True)
    eps_nombre = Column(String(150), nullable=True)
    ciudad = Column(String(100), nullable=True)
    prioridad = Column(String(30), nullable=False)
    estado = Column(String(30), nullable=False)
    fecha_creacion = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    fecha_actualizacion = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
