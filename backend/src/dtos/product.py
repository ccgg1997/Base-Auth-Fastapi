from typing import Optional,List
from pydantic import BaseModel, Field

class ProductoCreate(BaseModel):
    nombre: str
    precio: float
    disponible: bool = True
    tags : List[str] = []
    descripcion: Optional[str] = None
    cityId: Optional[int] = None

class City(BaseModel):
    id: int
    name: str
    country: str

    class Config:
        from_attributes = True

class ProductoOut(BaseModel):
    id: int
    nombre: str
    precio: float
    descripcion: Optional[str] = None
    tags : list[str] = Field(default_factory=list)
    disponible: bool = True
    cityId: Optional[int] = None
    
    class Config:
        from_attributes = True

    
    
    