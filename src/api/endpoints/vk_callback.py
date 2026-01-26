from fastapi import APIRouter, Request, HTTPException, Depends, Response
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis
from datetime import datetime

from src.core.config import settings
from src.core.dependencies import get_db, get_notifier, get_redis
from src.services.notifier import Notifier
from src.models import DonutSubscription, User
from sqlalchemy import select

router = APIRouter(prefix="/vk/callback", tags=["VK Callback"])


@router.post("", include_in_schema=False)
async def vk_callback_handler(
    request: Request,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
    cache: redis.Redis = Depends(get_redis),
):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = data.get("type")

    # 1. Confirmation
    if event_type == "confirmation":
        return Response(content=settings.VK_CONFIRMATION_CODE, media_type="text/plain")

    # 2. Donut Events
    object_data = data.get("object", {})

    if event_type in [
        "donut_subscription_create",
        "donut_subscription_prolonged",
        "donut_subscription_price_changed",
    ]:
        await handle_donut_active(object_data, db, notifier, cache, event_type)
        return Response(content="ok", media_type="text/plain")

    elif event_type in ["donut_subscription_expired", "donut_subscription_cancelled"]:
        await handle_donut_inactive(object_data, db, notifier, cache, event_type)
        return Response(content="ok", media_type="text/plain")

    return Response(content="ok", media_type="text/plain")


async def handle_donut_active(
    data: dict,
    db: AsyncSession,
    notifier: Notifier,
    cache: redis.Redis,
    event_type: str,
):
    user_vk_id = int(data.get("user_id"))
    amount = data.get("amount")

    # next_payment_date comes as different fields or not at all sometimes depending on event?
    # Actually checking docs:
    # donut_subscription_create: user_id, amount, price, ...
    # donut_subscription_prolonged: user_id, amount, ... next_payment_date (unix)

    # Let's try to parse next_payment_date. Usually field is 'next_payment_date' (unix timestamp)
    next_payment_ts = data.get("next_payment_date")
    next_payment_dt = None
    if next_payment_ts:
        next_payment_dt = datetime.fromtimestamp(next_payment_ts)

    logger.info(f"Donut event {event_type} for user {user_vk_id}. Amount: {amount}")

    # Check if user exists. If not, log and maybe skip or create stub?
    # Requirement: "If not expert ... just record"
    # We need a user record to link subscription?
    # Our DonutSubscription model has ForeignKey("users.vk_id")
    # So we MUST have a user in 'users' table.

    # Update or Create Subscription
    # Use UPSERT logic.

    # First ensure User exists?
    # If user doesn't exist, we can't insert into donut_subscriptions because of FK.
    # We should try to find user.
    user_res = await db.execute(select(User).filter(User.vk_id == user_vk_id))
    user = user_res.scalars().first()

    if not user:
        # Create minimal user stub
        # We don't have name/photo from this event usually.
        # Maybe fetch from VK? For now, create with empty name or "Donut User"
        logger.info(f"User {user_vk_id} not found. Creating stub for Donut.")
        user = User(
            vk_id=user_vk_id,
            first_name="Donut",
            last_name="User",
            photo_url="",  # Mandatory?
            is_expert=False,
        )
        db.add(user)
        # Flush to get it ready for FK
        await db.flush()

    # Now handle subscription
    sub_res = await db.execute(
        select(DonutSubscription).filter(DonutSubscription.user_id == user_vk_id)
    )
    sub = sub_res.scalars().first()

    if sub:
        sub.amount = float(amount) if amount else sub.amount
        sub.status = "active"
        if next_payment_dt:
            sub.next_payment_date = next_payment_dt
        sub.is_active = True
    else:
        sub = DonutSubscription(
            user_id=user_vk_id,
            amount=float(amount) if amount else 0.0,
            status="active",
            is_active=True,
            next_payment_date=next_payment_dt,
        )
        db.add(sub)

    await db.commit()
    await cache.delete(f"user_profile:{user_vk_id}")

    # Notification logic
    # "If he is expert and subscribes -> notify him"
    if user.is_expert and user.allow_notifications:
        # Check event type to give proper message
        if event_type == "donut_subscription_create":
            msg = "Спасибо за поддержку! Подписка VK Donut оформлена. Ваш уровень обновлен."
            await notifier.send_message(user_vk_id, msg)
        elif event_type == "donut_subscription_prolonged":
            msg = "Подписка VK Donut продлена. Спасибо, что остаетесь с нами!"
            await notifier.send_message(user_vk_id, msg)


async def handle_donut_inactive(
    data: dict,
    db: AsyncSession,
    notifier: Notifier,
    cache: redis.Redis,
    event_type: str,
):
    user_vk_id = int(data.get("user_id"))
    logger.info(f"Donut event {event_type} for user {user_vk_id}. Deactivating.")

    sub_res = await db.execute(
        select(DonutSubscription).filter(DonutSubscription.user_id == user_vk_id)
    )
    sub = sub_res.scalars().first()

    if sub:
        sub.status = (
            "expired" if event_type == "donut_subscription_expired" else "cancelled"
        )
        sub.is_active = False
        await db.commit()
        await cache.delete(f"user_profile:{user_vk_id}")

        # Notify
        user_res = await db.execute(select(User).filter(User.vk_id == user_vk_id))
        user = user_res.scalars().first()
        if user and user.allow_notifications:
            await notifier.send_message(
                user_vk_id, "Ваша подписка VK Donut истекла или была отменена."
            )
