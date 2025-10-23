# src/api/endpoints/mailings.py

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict

from src.core.dependencies import (
    get_db,
    get_current_user,
    get_current_admin_user,
    get_notifier,
)
from src.crud import mailing_crud
from src.schemas import mailing_schemas
from src.services.notifier import Notifier

router = APIRouter(prefix="/mailings", tags=["Mailings"])


@router.post("/create", response_model=mailing_schemas.MailingRead)
async def create_mailing(
    mailing_data: mailing_schemas.MailingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user),
    notifier: Notifier = Depends(get_notifier),
):
    if not current_user.get("is_expert"):
        raise HTTPException(
            status_code=403, detail="Только эксперты могут создавать рассылки."
        )

    expert_id = current_user["vk_id"]
    user_tariff = current_user.get("tariff_plan", "Начальный")

    try:
        new_mailing = await mailing_crud.create_mailing_request(
            db, expert_id, mailing_data, user_tariff
        )
        # TODO: Уведомить администратора о новой рассылке на модерацию
        return new_mailing
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/admin/pending",
    response_model=List[mailing_schemas.MailingRead],
    dependencies=[Depends(get_current_admin_user)],
)
async def get_pending_mailings(db: AsyncSession = Depends(get_db)):
    return await mailing_crud.get_pending_mailings(db)


@router.post("/admin/{mailing_id}/approve")
async def approve_mailing(
    mailing_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_admin_user),
):
    mailing = await mailing_crud.update_mailing_status(db, mailing_id, "approved")
    if not mailing:
        raise HTTPException(status_code=404, detail="Рассылка не найдена.")

    # ВАЖНО: Сама отправка должна происходить в фоновом воркере,
    # чтобы не блокировать API. Эндпоинт только меняет статус.

    return {"status": "ok", "message": "Mailing approved and scheduled for sending."}


@router.post("/admin/{mailing_id}/reject")
async def reject_mailing(
    mailing_id: int,
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_admin_user),
):
    reason = body.get("reason", "Причина не указана.")
    mailing = await mailing_crud.update_mailing_status(
        db, mailing_id, "rejected", reason
    )
    if not mailing:
        raise HTTPException(status_code=404, detail="Рассылка не найдена.")

    # TODO: Уведомить эксперта об отклонении

    return {"status": "ok", "message": "Mailing rejected."}
