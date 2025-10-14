# src/api/endpoints/events.py

from datetime import datetime, timedelta, timezone
from typing import Dict, List

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

router = APIRouter(prefix="/events", tags=["Events & Voting"])

TARIFF_DURATION_LIMITS = {
    "Начальный": 60,
    "Стандарт": 720,
    "Профи": 1440,
}


@router.post("/create", response_model=event_schemas.EventRead)
async def create_event(
    event_data: event_schemas.EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
    notifier: Notifier = Depends(get_notifier),
):
    if not current_user.get("is_expert"):
        raise HTTPException(
            status_code=403, detail="Only approved experts can create events."
        )

    user_tariff = current_user.get("tariff_plan", "Начальный")
    max_duration = TARIFF_DURATION_LIMITS.get(user_tariff, 60)
    if event_data.duration_minutes > max_duration:
        raise HTTPException(
            status_code=400,
            detail=f"Duration exceeds limit for your tariff '{user_tariff}'. Maximum is {max_duration} minutes.",
        )

    expert_id = current_user["vk_id"]
    try:
        new_event = await event_crud.create_event(
            db=db, event_data=event_data, expert_id=expert_id
        )
        await notifier.send_new_event_to_admin(
            event_name=new_event.event_name, expert_name=current_user.get("first_name")
        )
        return new_event
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my", response_model=List[event_schemas.EventRead])
async def get_my_events(
    db: AsyncSession = Depends(get_db), current_user: Dict = Depends(get_current_user)
):
    if not current_user.get("is_expert"):
        raise HTTPException(status_code=403, detail="You are not an approved expert.")
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
):
    event = await event_crud.get_event_by_promo(db, vote_data.promo_word)
    if not event or event.status != "approved":
        raise HTTPException(
            status_code=404, detail="Active event with this promo word not found."
        )
    now = datetime.now(timezone.utc)
    start_time = event.event_date.replace(tzinfo=timezone.utc)
    end_time = start_time + timedelta(minutes=event.duration_minutes)
    if not (start_time <= now <= end_time):
        raise HTTPException(
            status_code=403, detail="Voting for this event is not active now."
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
