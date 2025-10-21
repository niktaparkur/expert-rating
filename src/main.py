from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk

from src.api.endpoints import experts, events, payment, tariffs, users, meta, promo
from src.core.config import settings

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

app = FastAPI(title="Рейтинг Экспертов", proxy_headers=True, forwarded_allow_ips="*")


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

@app.get("/")
def read_root():
    return {"status": "ok"}
