from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.core.dependencies import get_db, get_notifier
from src.crud import event_crud
from src.schemas import event_schemas
from src.services.notifier import Notifier

router = APIRouter(prefix="/events", tags=["Events & Voting"])


class RejectionBody(BaseModel):
    reason: str

@router.post("/create", response_model=event_schemas.EventRead)
async def create_event(
    event_data: event_schemas.EventCreate,
    db: AsyncSession = Depends(get_db),
    # TODO: Добавить зависимость для получения ID эксперта из токена
    # пока захардкодим ID для теста
    expert_id: int = 842421089,
):
    try:
        new_event = await event_crud.create_event(
            db=db, event_data=event_data, expert_id=expert_id
        )
        # TODO: Отправить уведомление админу о новом мероприятии
        return new_event
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my", response_model=List[event_schemas.EventRead])
async def get_my_events(
    db: AsyncSession = Depends(get_db),
    expert_id: int = 842421089,  # TODO: Заменить на получение из токена
):
    results = await event_crud.get_my_events(db=db, expert_id=expert_id)

    response_events = []
    for event, votes_count, trust_count, distrust_count in results:
        event_data = event.__dict__
        event_data['name'] = event.event_name
        event_data['votes_count'] = votes_count or 0
        event_data['trust_count'] = trust_count or 0
        event_data['distrust_count'] = distrust_count or 0
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
        # 2. Отправить уведомление эксперту
        # await notifier.send_new_vote_notification(expert_id=event.expert_id, vote_data=vote_data)
        return {"status": "ok", "message": "Your vote has been accepted."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Роуты для Админки ---


@router.get("/admin/pending", response_model=List[event_schemas.EventRead])
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
    # await notifier.send_event_status_notification(expert_id=event.expert_id, event_name=event.event_name, approved=True)
    return {"status": "ok"}


@router.post("/admin/{event_id}/reject")
async def reject_event(
        event_id: int,
        body: RejectionBody,
        db: AsyncSession = Depends(get_db),
        notifier: Notifier = Depends(get_notifier)
):
    event = await event_crud.set_event_status(db=db, event_id=event_id, status='rejected')
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    # TODO: Сохранить причину отклонения в `event.rejection_reason`
    # await notifier.send_event_status_notification(..., approved=False, reason=body.reason)
    return {"status": "ok"}