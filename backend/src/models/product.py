from typing import Optional,List
from pydantic import BaseModel

class Producto(BaseModel):
    nombre: str
    precio: float
    disponible: bool = True
    tags : List[str] = []
    descripcion: Optional[str] = None
    
    
    