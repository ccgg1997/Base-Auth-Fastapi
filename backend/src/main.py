from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from src.schemas.product import ProductoCreate, ProductoOut

from src.db.base import Base
from src.db.session import engine
from src.routers import producto

Base.metadata.create_all(bind=engine)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# engancha router de productos
app.include_router(producto.router)

@app.get("/", response_class=HTMLResponse)
def hello_world():
    return "<p>Hello, World3!</p>"

@app.post("/productos")
def crear_producto(producto: ProductoCreate):
    return {"mensaje": "Producto creado exitosamente", "producto": producto}
