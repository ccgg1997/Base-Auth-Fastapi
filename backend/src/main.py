from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from src.db.base import Base
from src.db.session import engine
from src.routers import producto, auth
from src.models import product, user

Base.metadata.create_all(bind=engine)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://192.168.56.1:3001",
    ],
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=["Authorization", "Content-Type"],
)

# enlazar routers
app.include_router(auth.router)
app.include_router(producto.router)


@app.get("/", response_class=HTMLResponse)
def hello_world():
    return "<p>API RUNNING</p>"
