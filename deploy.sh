#!/bin/bash
set -e

# ПЕРЕМЕННЫЕ
PROJECT_DIR="/root/expert-rating" # ИЗМЕНИТЕ НА ВАШ ПУТЬ

echo ">>> Starting deployment process..."

cd $PROJECT_DIR
echo ">>> Pulling latest changes from main branch..."
git checkout main
git pull origin main

echo ">>> Creating .env file from GitHub Secrets..."
echo "$ENV_PROD_VARS" > .env

echo ">>> Stopping and removing old containers..."
docker-compose -f docker-compose.prod.yml down

echo ">>> Building and starting new containers..."
docker-compose -f docker-compose.prod.yml up --build -d

echo ">>> Deployment successful!"