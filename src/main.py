from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import sys
from loguru import logger

from src.api.endpoints import (
    experts,
    events,
    # payment,
    tariffs,
    users,
    meta,
    # promo,
    # mailings,
    vk_callback,
)
from src.core.config import settings
from src.crud import event_crud
from src.services.notifier import Notifier
from src.core.exceptions import (
    validation_exception_handler,
    IdempotentException,
    idempotent_exception_handler,
)
from src.core.middlewares import integrity_error_handler
from sqlalchemy.exc import IntegrityError
from fastapi.exceptions import RequestValidationError

logger.remove()
logger.add(
    sys.stderr,
    level="INFO",
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
)
logger.add(
    "logs/general.log",
    level="INFO",
    rotation="1 day",
    retention="1 month",
    compression="zip",
    encoding="utf-8",
)
logger.add(
    "logs/error.log",
    level="ERROR",
    rotation="1 day",
    retention="1 month",
    compression="zip",
    encoding="utf-8",
)

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

scheduler = AsyncIOScheduler()
engine_bg = create_async_engine(settings.DATABASE_URL_ASYNC)
AsyncSessionLocal_bg = sessionmaker(
    engine_bg, class_=AsyncSession, expire_on_commit=False
)
notifier_bg = Notifier(token=settings.VK_BOT_TOKEN)


async def check_for_reminders():
    async with AsyncSessionLocal_bg() as db:
        try:
            events_to_remind = await event_crud.get_events_for_reminding(db)
            if not events_to_remind:
                return

            print(f"Found {len(events_to_remind)} events to send reminders for.")
            for event in events_to_remind:
                try:
                    await notifier_bg.send_event_reminder(
                        expert_id=event.expert_id,
                        event_name=event.name,
                        event_date=event.event_date,
                    )
                    await event_crud.mark_reminder_as_sent(db, event.id)
                except Exception as e:
                    print(f"Failed to process reminder for event {event.id}: {e}")
        except Exception as e:
            print(f"An error occurred in the reminder job: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seeding Tariffs
    async with AsyncSessionLocal_bg() as db:
        try:
            from src.models.tariff import Tariff
            from sqlalchemy import select
            
            # Create tables if not exist (quick fix for dev env)
            # await engine_bg.begin() as conn:
            #     await conn.run_sync(Base.metadata.create_all)
            # Actually, let's just check if they exist and seed
            
            result = await db.execute(select(Tariff))
            existing = result.scalars().first()
            if not existing:
                print("Seeding default tariffs...")
                tariffs_to_create = [
                    Tariff(code="tariff_start", name="Начальный", price=0, event_limit=3, event_duration_hours=1, max_votes_per_event=100, vk_donut_link=None),
                    Tariff(code="tariff_standard", name="Стандарт", price=999, event_limit=10, event_duration_hours=12, max_votes_per_event=200, vk_donut_link="https://vk.com/exprating?w=donut_payment-216452802&levelId=2484"),
                    Tariff(code="tariff_pro", name="Профи", price=3999, event_limit=30, event_duration_hours=24, max_votes_per_event=1000, vk_donut_link="https://vk.com/exprating?w=donut_payment-216452802&levelId=2485"),
                    Tariff(code="tariff_unlimited", name="Безлимит", price=9999, event_limit=999999, event_duration_hours=72, max_votes_per_event=999999, vk_donut_link="https://vk.com/exprating?w=donut_payment-216452802&levelId=2486")
                ]
                db.add_all(tariffs_to_create)
                await db.commit()
                print("Tariffs seeded.")
        except Exception as e:
            print(f"Error seeding tariffs: {e}")

    scheduler.add_job(check_for_reminders, "interval", minutes=1)
    scheduler.start()
    print("Scheduler for event reminders has been started.")
    yield
    scheduler.shutdown()
    await notifier_bg.close()
    print("Scheduler has been stopped.")


app = FastAPI(
    title="Рейтинг Экспертов",
    proxy_headers=True,
    forwarded_allow_ips="*",
    lifespan=lifespan,
)

app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(IdempotentException, idempotent_exception_handler)

origin_regex = r"^(https?://(localhost|127\.0\.0\.1)(:\d+)?|https?://.*\.potokrechi\.ru|https://vk\.com)$"

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(experts.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
# app.include_router(payment.router, prefix="/api/v1")
app.include_router(tariffs.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(meta.router, prefix="/api/v1")
app.include_router(vk_callback.router, prefix="/api/v1")
# app.include_router(promo.router, prefix="/api/v1")
# app.include_router(mailings.router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"status": "ok"}
