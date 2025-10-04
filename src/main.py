from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.endpoints import experts
from src.api.endpoints import events

app = FastAPI(title="Рейтинг Экспертов")

origins = [
    "https://so.potokrechi.ru",
    "https://testg.potokrechi.ru",
    "https://p.potokrechi.ru",
    "http://localhost:5173",
    "https://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # allow_methods=["GET", "POST", "OPTIONS", "DELETE", "PATCH", "PUT"],
    # allow_headers=["Content-Type", "Authorization"],
)


# Подключаем роутер с префиксом /api/v1
app.include_router(experts.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"status": "ok"}
