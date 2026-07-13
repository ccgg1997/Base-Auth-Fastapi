from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from src.schemas.product import ProductoCreate, ProductoOut
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=HTMLResponse)
def hello_world():
    return "<p>Hello, World3!</p>"

@app.post("/productos")
def crear_producto(producto: ProductoCreate):
    return {"mensaje": "Producto creado exitosamente", "producto": producto}
