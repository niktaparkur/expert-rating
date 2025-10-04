import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL_ASYNC: str = os.environ.get("DATABASE_URL")
    DATABASE_URL_SYNC: str = os.environ.get("ALEMBIC_DATABASE_URL")

    VK_BOT_TOKEN: str = os.environ.get("VK_BOT_TOKEN")
    ADMIN_ID: int = int(os.environ.get("ADMIN_ID", 0))
    APP_ID: int = int(os.environ.get("APP_ID", 0))


settings = Settings()
