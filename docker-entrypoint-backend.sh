#!/bin/bash
set -e

echo "Waiting for database..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 0.1
done
echo "Database started"

# Автоматически применяем миграции при старте контейнера
echo "Applying database migrations..."
alembic upgrade head
echo "Migrations applied."

# Запускаем приложение (команду, переданную в docker-compose)
exec "$@"