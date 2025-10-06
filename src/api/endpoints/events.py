from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict

from src.core.dependencies import (
    get_db,
    get_notifier,
    get_current_user,
    get_current_admin_user,
)
from src.crud import event_crud
from src.schemas import event_schemas
from src.services.notifier import Notifier

router = APIRouter(prefix="/events", tags=["Events & Voting"])


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
    # Проверяем, что пользователь является экспертом
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
    # 1. Найти мероприятие по промо-слову
    event = await event_crud.get_event_by_promo(db, vote_data.promo_word)
    if not event or event.status != "approved":
        raise HTTPException(
            status_code=404, detail="Active event with this promo word not found."
        )

    # TODO: Проверить, не истекло ли время голосования

    try:
        await event_crud.create_vote(db=db, vote_data=vote_data, event=event)
        await notifier.send_new_vote_notification(
            expert_id=event.expert_id, vote_data=vote_data
        )
        return {"status": "ok", "message": "Your vote has been accepted."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/check-promo/{promo_word}", response_model=Dict[str, bool])
async def check_promo_word_availability(
    promo_word: str, db: AsyncSession = Depends(get_db)
):
    """Проверяет, занято ли указанное промо-слово."""
    event = await event_crud.get_event_by_promo(db, promo_word)
    return {"is_taken": event is not None}


@router.get("/public", response_model=List[event_schemas.EventRead])
async def get_public_events(db: AsyncSession = Depends(get_db)):
    """Отдает список публичных мероприятий для всех пользователей."""
    events = await event_crud.get_public_upcoming_events(db=db)
    return [
        event_schemas.EventRead.model_validate(event, from_attributes=True)
        for event in events
    ]


# --- Роуты для Админки ---


@router.get("/expert/{expert_id}", response_model=event_schemas.ExpertEventsResponse)
async def get_events_for_expert(expert_id: int, db: AsyncSession = Depends(get_db)):
    """Отдает список текущих и прошедших мероприятий для конкретного эксперта."""
    events = await event_crud.get_events_by_expert_id(db=db, expert_id=expert_id)
    return events


# --- Роуты для Админки ---
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


class RejectionBody(BaseModel):
    reason: str


@router.post("/admin/{event_id}/reject")
async def reject_event(
    event_id: int,
    body: RejectionBody,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
):
    event = await event_crud.set_event_status(
        db=db, event_id=event_id, status="rejected", reason=body.reason
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    await notifier.send_event_status_notification(
        expert_id=event.expert_id,
        event_name=event.event_name,
        approved=False,
        reason=body.reason,
    )
    return {"status": "ok"}
