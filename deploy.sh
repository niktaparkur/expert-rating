#!/bin/bash
set -e

# ПЕРЕМЕННЫЕ
PROJECT_DIR="/root/expert-rating"

echo ">>> Starting deployment process..."

cd $PROJECT_DIR
echo ">>> Pulling latest changes from main branch..."
git checkout main
git pull origin main

echo ">>> Creating .env file from GitHub Secrets..."
echo "$ENV_PROD_VARS" > .env

echo ">>> Stopping and removing old containers and orphans..."
docker-compose -f docker-compose.prod.yml down --remove-orphans

echo ">>> Applying database migrations..."
docker-compose -f docker-compose.prod.yml run --rm backend /usr/local/bin/docker-entrypoint-backend.sh

echo ">>> Building and starting new containers (backend and redis)..."
docker-compose -f docker-compose.prod.yml up --build -d

echo ">>> Deployment successful!"