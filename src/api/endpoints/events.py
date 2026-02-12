from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis
from sqlalchemy import select, and_
from sqlalchemy.exc import IntegrityError
from redis.exceptions import LockError

from src.core.dependencies import (
    get_current_admin_user,
    get_current_user,
    get_db,
    get_notifier,
    get_validated_vk_id,
    get_redis,
    check_idempotency_key,
    save_idempotency_result,
)
from src.crud import event_crud
from src.schemas import event_schemas
from src.services.notifier import Notifier
from src.schemas.expert_schemas import VotedExpertInfo
from src.models import Event, User, ExpertRating

router = APIRouter(prefix="/events", tags=["Events & Voting"])


@router.post("/check-availability", response_model=Dict)
async def check_event_availability(
    check_data: event_schemas.EventAvailabilityCheck, db: AsyncSession = Depends(get_db)
):
    is_available = await event_crud.check_event_availability(
        db,
        promo_word=check_data.promo_word,
        event_date=check_data.event_date,
        duration_minutes=check_data.duration_minutes,
    )
    if not is_available:
        raise HTTPException(
            status_code=409,
            detail="Это промо-слово уже занято на указанное время или близкое к нему.",
        )
    return {"status": "ok", "message": "This time slot is available."}


@router.post("/create", response_model=event_schemas.EventRead)
async def create_event(
    event_data: event_schemas.EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
    notifier: Notifier = Depends(get_notifier),
    cache: redis.Redis = Depends(get_redis),
):
    if not current_user.get("is_expert"):
        raise HTTPException(
            status_code=403,
            detail="Только одобренные эксперты могут создавать мероприятия.",
        )

    expert_id = current_user["vk_id"]

    # Check event creation limits
    tariff = current_user.get("tariff_plan", "Начальный")
    # from src.core.config import settings

    # limit = settings.TARIFF_EVENT_LIMITS.get(tariff, 3) 
    
    # We expect event_usage to be in current_user if it was fetched via get_current_user
    # But usually get_current_user returns a dict (from Redis) which matches UserPrivateRead structure.
    # UserPrivateRead has event_usage: EventUsage
    
    limit = 3 # Default
    if "event_usage" in current_user and current_user["event_usage"]:
         # It might be a dict if coming from JSON
         if isinstance(current_user["event_usage"], dict):
             limit = current_user["event_usage"].get("limit", 3)
         else:
             limit = current_user["event_usage"].limit
    else:
        # Fallback if for some reason not populated (e.g. old cache), though fetch_and_cache should populate it.
        # Let's re-fetch (safe) or just log/default.
        # For robustness, let's query DB if missing? No, user profile should be fresh.
        pass

    active_count = await event_crud.get_expert_active_event_count_current_month(
        db, expert_id
    )

    if active_count >= limit:
        raise HTTPException(
            status_code=403,
            detail=f"Вы достигли лимита создания мероприятий для тарифа '{tariff}' ({limit} в месяц, включая ожидающие модерации). Повысьте тариф для увеличения лимита.",
        )

    promo_normalized = event_data.promo_word.upper().strip()
    lock_key = f"lock:event_create:{promo_normalized}"

    try:
        async with cache.lock(lock_key, timeout=10, blocking_timeout=3):
            try:
                new_event = await event_crud.create_event(
                    db=db, event_data=event_data, expert_id=expert_id
                )

                await notifier.send_new_event_to_admin(
                    event_name=new_event.name,
                    expert_name=current_user.get("first_name"),
                )
                return new_event
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            except IntegrityError:
                await db.rollback()
                raise HTTPException(
                    status_code=409, detail="Событие с такими параметрами уже создано."
                )

    except LockError:
        raise HTTPException(
            status_code=429, detail="Обработка запроса. Пожалуйста, подождите."
        )


@router.delete("/{event_id}", status_code=200)
async def delete_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
    notifier: Notifier = Depends(get_notifier),
):
    expert_id = current_user["vk_id"]
    try:
        event_to_delete = await db.get(Event, event_id)
        if (
            event_to_delete
            and event_to_delete.expert_id == expert_id
            and event_to_delete.wall_post_id
        ):
            await notifier.delete_wall_post(event_to_delete.wall_post_id)

        success = await event_crud.delete_event_by_id(
            db=db, event_id=event_id, expert_id=expert_id
        )
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Мероприятие не найдено или у вас нет прав на его удаление.",
            )
        return {"status": "ok", "message": "Event deleted successfully."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{event_id}/stop", response_model=event_schemas.EventRead)
async def stop_event_voting(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
):
    expert_id = current_user["vk_id"]
    try:
        updated_event = await event_crud.stop_event_voting(
            db=db, event_id=event_id, expert_id=expert_id
        )
        if not updated_event:
            raise HTTPException(
                status_code=404,
                detail="Мероприятие не найдено или у вас нет прав на его остановку.",
            )
        return updated_event
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my", response_model=List[event_schemas.EventRead])
async def get_my_events(
    db: AsyncSession = Depends(get_db), current_user: Dict = Depends(get_current_user)
):
    if not current_user.get("is_expert"):
        raise HTTPException(
            status_code=403, detail="Вы не являетесь одобренным экспертом."
        )
    expert_id = current_user["vk_id"]
    results = await event_crud.get_my_events(db=db, expert_id=expert_id)

    response_events = []
    for event, votes, trust, distrust in results:
        event_data = event_schemas.EventRead.model_validate(event, from_attributes=True)
        event_data.votes_count = votes or 0
        event_data.trust_count = trust or 0
        event_data.distrust_count = distrust or 0
        response_events.append(event_data)
    return response_events


@router.post("/vote")
async def submit_vote(
    vote_data: event_schemas.VoteCreate,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
    voter_id: int = Depends(get_validated_vk_id),
    cache: redis.Redis = Depends(get_redis),
    idempotency_key: Optional[str] = Depends(check_idempotency_key),
):
    vote_data.voter_vk_id = voter_id

    if not vote_data.comment or len(vote_data.comment.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="Комментарий обязателен (минимум 3 символа).",
        )

    lock_key = f"lock:vote:event:{voter_id}:{vote_data.promo_word}"

    try:
        async with cache.lock(lock_key, timeout=5, blocking_timeout=2):
            event = await event_crud.get_event_by_promo(db, vote_data.promo_word)
            if not event:
                raise HTTPException(
                    status_code=404,
                    detail="Активное мероприятие с таким промо-словом не найдено.",
                )
            if event.expert_id == vote_data.voter_vk_id:
                raise HTTPException(
                    status_code=403,
                    detail="Эксперт не может голосовать на собственном мероприятии.",
                )

            now = datetime.now(timezone.utc)
            start_time = event.event_date.replace(tzinfo=timezone.utc)
            end_time = start_time + timedelta(minutes=event.duration_minutes)
            if not (start_time <= now <= end_time):
                raise HTTPException(
                    status_code=403,
                    detail="Голосование на этом мероприятии сейчас неактивно.",
                )

            try:
                await event_crud.create_vote(db=db, vote_data=vote_data, event=event)

                await notifier.send_new_vote_notification(
                    expert_id=event.expert_id, vote_data=vote_data
                )
                if event.voter_thank_you_message:
                    await notifier.send_vote_action_notification(
                        user_vk_id=vote_data.voter_vk_id,
                        message_override=event.voter_thank_you_message,
                    )
                res = {
                    "status": "ok",
                    "message": "Your vote has been accepted.",
                    "thank_you_message": event.voter_thank_you_message,
                }
                if idempotency_key:
                    await save_idempotency_result(idempotency_key, res, cache)
                return res
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            except IntegrityError:
                await db.rollback()
                raise HTTPException(status_code=409, detail="Ошибка сохранения голоса.")

    except LockError:
        raise HTTPException(status_code=429, detail="Too many requests.")


@router.get("/status/{promo_word}", response_model=event_schemas.EventStatusResponse)
async def get_event_status_by_promo(
    promo_word: str,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
):
    event = await event_crud.get_event_by_promo(db, promo_word)
    if not event:
        raise HTTPException(status_code=404, detail="Мероприятие не найдено")

    now = datetime.now(timezone.utc)
    start_time = event.event_date.replace(tzinfo=timezone.utc)
    end_time = start_time + timedelta(minutes=event.duration_minutes)
    status = (
        "active"
        if start_time <= now <= end_time
        else "not_started" if now < start_time else "finished"
    )

    voter_id = current_user.get("vk_id")
    current_vote_data = None

    if voter_id:
        rating_query = select(ExpertRating).where(
            and_(
                ExpertRating.expert_id == event.expert_id,
                ExpertRating.voter_id == voter_id,
            )
        )
        rating_res = await db.execute(rating_query)
        rating = rating_res.scalars().first()

        vote_val = rating.vote_value if rating else 0
        has_voted_global = rating is not None

        current_vote_data = {
            "has_voted": has_voted_global,
            "vote_value": vote_val,
            "last_comment": "",
        }

    expert_profile = event.expert
    user = expert_profile.user

    return {
        "status": status,
        "event_name": event.name,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "current_vote": current_vote_data,
        "expert": {
            "vk_id": user.vk_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "photo_url": str(user.photo_url),
            "regalia": expert_profile.regalia,
        },
    }


@router.get("/public", response_model=List[event_schemas.EventRead])
async def get_public_events(db: AsyncSession = Depends(get_db)):
    events = await event_crud.get_public_upcoming_events(db=db)
    return [
        event_schemas.EventRead.model_validate(event, from_attributes=True)
        for event in events
    ]


@router.get("/feed", response_model=event_schemas.PaginatedEventsResponse)
async def get_events_feed(
    db: AsyncSession = Depends(get_db),
    page: int = 1,
    size: int = 20,
    search: Optional[str] = None,
    region: Optional[str] = None,
    category_id: Optional[int] = None,
):
    events, total_count = await event_crud.get_public_events_feed(
        db=db,
        page=page,
        size=size,
        search_query=search,
        region=region,
        category_id=category_id,
    )
    response_items = []
    for event in events:
        event_data = event_schemas.EventRead.model_validate(event, from_attributes=True)
        if event.expert and event.expert.user:
            event_data.expert_info = VotedExpertInfo.model_validate(
                event.expert.user, from_attributes=True
            )
        response_items.append(event_data)
    return {
        "items": response_items,
        "total_count": total_count,
        "page": page,
        "size": size,
    }


@router.get("/expert/{expert_id}", response_model=event_schemas.ExpertEventsResponse)
async def get_events_for_expert(expert_id: int, db: AsyncSession = Depends(get_db)):
    return await event_crud.get_events_by_expert_id(db=db, expert_id=expert_id)


@router.get(
    "/admin/pending",
    response_model=List[event_schemas.EventRead],
    dependencies=[Depends(get_current_admin_user)],
)
async def get_pending_events_for_admin(db: AsyncSession = Depends(get_db)):
    return await event_crud.get_pending_events(db=db)


@router.post("/admin/{event_id}/approve")
async def approve_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
):
    event = await event_crud.set_event_status(
        db=db, event_id=event_id, status="approved"
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    if not event.is_private:
        expert_user = await db.get(User, event.expert_id)
        if expert_user:
            expert_name = f"{expert_user.first_name} {expert_user.last_name}"
            post_id = await notifier.post_announcement_to_wall(event, expert_name)
            if post_id:
                event.wall_post_id = post_id
                await db.commit()

    await notifier.send_event_status_notification(
        expert_id=event.expert_id,
        event_name=event.name,
        approved=True,
        is_private=event.is_private,
    )
    return {"status": "ok"}


@router.post("/admin/{event_id}/reject")
async def reject_event(
    event_id: int,
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
):
    reason = body.get("reason", "Причина не указана")
    event = await event_crud.set_event_status(
        db=db, event_id=event_id, status="rejected", reason=reason
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    await notifier.send_event_status_notification(
        expert_id=event.expert_id,
        event_name=event.name,
        approved=False,
        is_private=event.is_private,
        reason=reason,
    )
    return {"status": "ok"}


@router.delete("/vote/{vote_id}/cancel", status_code=200)
async def cancel_event_vote(
    vote_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
    cache: redis.Redis = Depends(get_redis),
):
    voter_vk_id = current_user["vk_id"]
    success = await event_crud.delete_event_vote(
        db=db, vote_id=vote_id, voter_vk_id=voter_vk_id
    )
    if not success:
        raise HTTPException(
            status_code=404, detail="Голос для отмены не найден или у вас нет прав."
        )

    await cache.delete(f"user_profile:{voter_vk_id}")

    return {"status": "ok", "message": "Vote cancelled."}
