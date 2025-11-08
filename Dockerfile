# === Этап 1: Сборщик зависимостей ===
FROM python:3.11-slim AS builder

ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

WORKDIR /app

COPY pyproject.toml poetry.lock ./

# Устанавливаем netcat для healthcheck'ов
RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip && \
    pip install poetry && \
    poetry install --no-root && \
    rm -rf $POETRY_CACHE_DIR

# === Этап 2: Финальный образ ===
FROM python:3.11-slim

COPY --from=builder /usr/bin/nc /usr/bin/nc

ENV PATH="/app/.venv/bin:$PATH"

WORKDIR /app

COPY --from=builder /app/.venv .venv
COPY ./src ./src
COPY ./src/assets ./src/assets
COPY ./migrations ./migrations
COPY ./alembic.ini ./alembic.ini
COPY ./docker-entrypoint-backend.sh /usr/local/bin/docker-entrypoint-backend.sh

RUN chmod +x /usr/local/bin/docker-entrypoint-backend.sh

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]