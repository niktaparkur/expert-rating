import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL_ASYNC: str = os.environ.get("DATABASE_URL")
    DATABASE_URL_SYNC: str = os.environ.get("ALEMBIC_DATABASE_URL")

    VK_BOT_TOKEN: str = os.environ.get("VK_BOT_TOKEN")
    ADMIN_ID: int = int(os.environ.get("ADMIN_ID", 0))

    VK_APP_SECRET_KEY: str = os.environ.get("VK_APP_SECRET_KEY")
    VK_SERVICE_KEY: str = os.environ.get("VK_SERVICE_KEY")
    VK_APP_ID: int = int(os.environ.get("VK_APP_ID", 0))

    REDIS_URL: str = os.environ.get("REDIS_URL")
    SENTRY_DSN: str | None = os.environ.get("SENTRY_DSN", None)


settings = Settings()
