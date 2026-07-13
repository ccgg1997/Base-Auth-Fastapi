from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.db.session import get_db
from src.models.product import Producto
from src.schemas.product import ProductoCreate, ProductoOut


router = APIRouter(prefix="/v2", tags=["productos"])


@router.post("/", response_model=ProductoOut)
def crear_producto(data: ProductoCreate, db: Session = Depends(get_db)):
    producto = Producto(**data.model_dump())
    
    existing_product = db.get(Producto, producto.id)
    if existing_product is not None:
        raise HTTPException(status_code=400, detail="El nombre de producto ya existe")
    
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto