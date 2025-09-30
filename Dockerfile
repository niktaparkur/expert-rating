# === Этап 1: Сборщик зависимостей ===
FROM python:3.11-slim AS builder

ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

WORKDIR /app
COPY pyproject.toml poetry.lock ./

RUN pip install --upgrade pip && \
    pip install poetry && \
    poetry install --no-root && \
    rm -rf $POETRY_CACHE_DIR

# === Этап 2: Финальный образ ===
FROM python:3.11-slim

# Эта переменная добавляет venv/bin в системный PATH
ENV PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Копируем готовую venv из образа-сборщика
COPY --from=builder /app/.venv .venv

# Копируем только папку с исходным кодом
COPY ./app ./app

# Копируем alembic, если он нужен для миграций из контейнера
COPY ./alembic ./alembic
COPY alembic.ini .

EXPOSE 8000

# Команда по умолчанию, которая теперь найдет uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]