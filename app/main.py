from fastapi import FastAPI

app = FastAPI(title="Рейтинг Экспертов")

@app.get("/")
def read_root():
    return {"status": "ok"}