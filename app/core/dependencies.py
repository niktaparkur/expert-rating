import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from app.services.notifier import Notifier

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
VK_BOT_TOKEN = os.environ.get("VK_BOT_TOKEN")

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Инициализируем Notifier один раз при старте
notifier = Notifier(token=VK_BOT_TOKEN)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


def get_notifier():
    return notifier
