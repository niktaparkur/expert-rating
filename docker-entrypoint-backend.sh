#!/bin/bash
set -e

echo "Waiting for database..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 0.1
done
echo "Database started"

echo "Waiting for Redis..."
while ! nc -z redis 6379; do
  sleep 0.1
done
echo "Redis started"

# Автоматически применяем миграции при старте контейнера
echo "Applying database migrations..."
alembic upgrade head
echo "Migrations applied."

# Запускаем приложение (команду, переданную в docker-compose)
exec "$@"