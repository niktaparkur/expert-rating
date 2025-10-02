from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import experts

app = FastAPI(title="Рейтинг Экспертов")

origins = [
    "https://so.potokrechi.ru",
    "http://localhost:5173",
    "https://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "DELETE", "PATCH", "PUT"],
    allow_headers=["Content-Type", "Authorization"],
)


# Подключаем роутер с префиксом /api/v1
app.include_router(experts.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"status": "ok"}