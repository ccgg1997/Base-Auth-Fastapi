from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from src.db.session import get_db
from src.dependencies.auth import get_current_user
from src.models.product import Producto
from src.dtos.product import ProductoCreate, ProductoOut
from fastapi import Body



router = APIRouter(prefix="/v2", tags=["productos"])


@router.post("/", response_model=ProductoOut, dependencies=[Depends(get_current_user)])
def crear_producto(data: ProductoCreate, db: Session = Depends(get_db)):
    existing_product = (
        db.query(Producto)
        .filter(Producto.nombre == data.nombre)
        .first()
    )
    print(f'{"*"*20}Existing product : {existing_product}')
    if existing_product is not None:
        raise HTTPException(status_code=400, detail="El nombre de producto ya existe")

    # return existing_product
    producto = Producto(**data.model_dump())
    print(f'{"$"*20}Product : {producto.nombre}, {data.model_dump()}')
    
    db.add(producto)
    try:
        db.commit()
    except Exception as exc:
        print(f'{"!"*20}Error: {exc}')
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail= exc.args[0] if isinstance(exc, IntegrityError) else "Error al crear el producto",
        ) 
    db.refresh(producto)
    return producto


@router.delete("/", response_model=str,dependencies=[Depends(get_current_user)])
def eliminar_producto(productName: str = Body(embed = True), db: Session = Depends(get_db)):
    existing_product = (
        db.query(Producto)
        .filter(Producto.nombre == productName)
        .first()
    )
    if existing_product is None:
        raise HTTPException(status_code=400, detail="El nombre de producto no existe")

    try:
        existing_product.disponible = False
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="El nombre de producto no existe",
        ) 
    db.refresh(existing_product)
    return "Producto eliminado exitosamente"

@router.get("/", response_model=list[ProductoOut], dependencies=[Depends(get_current_user)])
def listar_productos(db: Session = Depends(get_db)):
    productos = db.query(Producto).filter(Producto.disponible == True).all()
    return productos

@router.get("/{product_id}", response_model=ProductoOut, dependencies=[Depends(get_current_user)])
def obtener_producto(product_id: int, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.id == product_id, Producto.disponible == True).first()
    if producto is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto