from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.dependencies import (
    get_current_admin_user,
    get_current_user,
    get_db,
    get_notifier,
)
from src.crud import event_crud
from src.schemas import event_schemas
from src.services.notifier import Notifier
from src.schemas.expert_schemas import VotedExpertInfo
from loguru import logger

router = APIRouter(prefix="/events", tags=["Events & Voting"])

TARIFF_DURATION_LIMITS = {
    "Начальный": 60,
    "Стандарт": 720,
    "Профи": 1440,
}
TARIFF_VOTES_LIMITS = {
    "Начальный": 100,
    "Стандарт": 200,
    "Профи": 1000,
}


@router.post("/create", response_model=event_schemas.EventRead)
async def create_event(
    event_data: event_schemas.EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
    notifier: Notifier = Depends(get_notifier),
):
    logger.debug(
        f"Received event creation data: {event_data.model_dump_json(indent=2)}"
    )

    if not current_user.get("is_expert"):
        raise HTTPException(
            status_code=403,
            detail="Только одобренные эксперты могут создавать мероприятия.",
        )

    user_tariff = current_user.get("tariff_plan", "Начальный")
    max_duration = TARIFF_DURATION_LIMITS.get(user_tariff, 60)

    if not current_user.get("is_admin") and event_data.duration_minutes > max_duration:
        raise HTTPException(
            status_code=400,
            detail=f"Длительность превышает лимит для вашего тарифа '{user_tariff}'. Максимум: {max_duration} минут.",
        )

    expert_id = current_user["vk_id"]
    try:
        if isinstance(event_data.event_link, str) and not event_data.event_link.strip():
            event_data.event_link = None

        new_event = await event_crud.create_event(
            db=db, event_data=event_data, expert_id=expert_id
        )

        logger.success(
            f"Event '{new_event.event_name}' created successfully for expert {expert_id}."
        )

        await notifier.send_new_event_to_admin(
            event_name=new_event.event_name, expert_name=current_user.get("first_name")
        )
        return new_event
    except ValueError as e:
        logger.warning(f"Value error during event creation: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during event creation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error.")


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
    user_tariff = current_user.get("tariff_plan", "Начальный")

    if current_user.get("is_admin"):
        limit = float("inf")
    else:
        limit = TARIFF_VOTES_LIMITS.get(user_tariff, 100)

    response_events = []
    for event, votes, trust, distrust in results:
        event_data = event_schemas.EventRead.model_validate(event, from_attributes=True)
        event_data.votes_count = votes or 0
        event_data.trust_count = trust or 0
        event_data.distrust_count = distrust or 0
        event_data.has_tariff_warning = (votes or 0) > limit
        response_events.append(event_data)

    return response_events


@router.post("/vote")
async def submit_vote(
    vote_data: event_schemas.VoteCreate,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
):
    event = await event_crud.get_event_by_promo(db, vote_data.promo_word)
    if not event or event.status != "approved":
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
            status_code=403, detail="Голосование на этом мероприятии сейчас неактивно."
        )
    try:
        await event_crud.create_vote(db=db, vote_data=vote_data, event=event)
        await notifier.send_new_vote_notification(
            expert_id=event.expert_id, vote_data=vote_data
        )
        return {"status": "ok", "message": "Your vote has been accepted."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status/{promo_word}", response_model=Dict)
async def get_event_status_by_promo(
    promo_word: str,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
):
    event = await event_crud.get_event_by_promo(db, promo_word)
    if not event or event.status != "approved":
        return {"status": "not_found"}
    now = datetime.now(timezone.utc)
    start_time = event.event_date.replace(tzinfo=timezone.utc)
    end_time = start_time + timedelta(minutes=event.duration_minutes)
    status = "active"
    if now < start_time:
        status = "not_started"
    elif now > end_time:
        status = "finished"
    has_voted = await event_crud.check_if_user_voted_on_event(
        db=db, event_id=event.id, voter_vk_id=current_user.get("vk_id")
    )
    expert_profile = event.expert
    user = expert_profile.user
    return {
        "status": status,
        "event_name": event.event_name,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "current_user_has_voted": has_voted,
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
    events = await event_crud.get_events_by_expert_id(db=db, expert_id=expert_id)
    return events


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
    await notifier.send_event_status_notification(
        expert_id=event.expert_id, event_name=event.event_name, approved=True
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
        event_name=event.event_name,
        approved=False,
        reason=reason,
    )
    return {"status": "ok"}
