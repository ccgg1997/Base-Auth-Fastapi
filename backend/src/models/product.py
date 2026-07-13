from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY
from src.db.base import Base


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False, unique=True)
    precio = Column(Float, nullable=False)
    disponible = Column(Boolean, default=True)
    cityId = Column(Integer, ForeignKey("cities.id"), nullable=True)
    tags = Column(ARRAY(String), nullable=True)  # Almacena los tags como una lista
    descripcion = Column(String, nullable=True)   
    

class City(Base):
    __tablename__ = "cities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)