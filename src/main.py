from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from src.api.endpoints import (
    experts,
    events,
    payment,
    tariffs,
    users,
    meta,
    promo,
    mailings,
)
from src.core.config import settings
from src.crud import event_crud
from src.services.notifier import Notifier

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
    """Задача, которая будет выполняться по расписанию для отправки напоминаний."""
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
                        event_name=event.event_name,
                        event_date=event.event_date,
                    )
                    await event_crud.mark_reminder_as_sent(db, event.id)
                except Exception as e:
                    print(f"Failed to process reminder for event {event.id}: {e}")
        except Exception as e:
            print(f"An error occurred in the reminder job: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
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
app.include_router(payment.router, prefix="/api/v1")
app.include_router(tariffs.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(meta.router, prefix="/api/v1")
app.include_router(promo.router, prefix="/api/v1")
app.include_router(mailings.router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"status": "ok"}
