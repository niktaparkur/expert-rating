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

from fastapi import BackgroundTasks
from src.schemas.mailing_schemas import AdminBroadcastCreate
from src.models import User
from sqlalchemy import select

router = APIRouter(prefix="/mailings", tags=["Mailings"])


@router.post("/admin/broadcast", dependencies=[Depends(get_current_admin_user)])
async def send_admin_broadcast(
    data: AdminBroadcastCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
):
    query = select(User.vk_id).where(User.allow_notifications)

    if data.target_group == "experts":
        query = query.where(User.is_expert)
    elif data.target_group == "users":
        query = query.where(not User.is_expert)

    result = await db.execute(query)
    user_ids = result.scalars().all()

    if not user_ids:
        return {"status": "ok", "message": "No users found for broadcast."}

    background_tasks.add_task(_broadcast_task, user_ids, data.message, notifier)

    return {
        "status": "ok",
        "message": f"Рассылка запущена для {len(user_ids)} пользователей.",
    }


async def _broadcast_task(user_ids: list[int], message: str, notifier: Notifier):
    for vk_id in user_ids:
        try:
            await notifier.send_message(
                vk_id, f"📢 Сообщение от администратора:\n\n{message}"
            )
        except Exception as e:
            print(f"Failed to send broadcast to {vk_id}: {e}")


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

    return {"status": "ok", "message": "Mailing rejected."}
