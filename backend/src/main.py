from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from models.product import Producto
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
def crear_producto(producto: Producto):
    return {"mensaje": "Producto creado exitosamente", "producto": producto}
