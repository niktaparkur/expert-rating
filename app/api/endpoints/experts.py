from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_notifier
from app.crud import expert_crud
from app.schemas import expert_schemas
from app.services.notifier import Notifier

router = APIRouter(
    prefix="/experts",  # Добавляем префикс для всех эндпоинтов в этом файле
    tags=["Experts"],  # Группируем в документации Swagger
)


@router.post("/register", status_code=201)
async def register_expert(
    expert_data: expert_schemas.ExpertCreate,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
):
    # TODO: Здесь будет проверка токена VK Bridge, которая вернет vk_id
    # Пока для теста мы доверяем vk_id из тела запроса
    if expert_data.user_data.vk_id is None:
        raise HTTPException(status_code=400, detail="VK ID is required")

    await expert_crud.create_expert_request(db=db, expert_data=expert_data)

    # Отправляем уведомление админу
    await notifier.send_new_request_to_admin(expert_data.user_data.model_dump())

    return {"status": "ok", "message": "Request sent for moderation"}


@router.get("/admin/pending", response_model=List[expert_schemas.ExpertRequestRead])
async def get_pending_experts(db: AsyncSession = Depends(get_db)):
    pending_experts = await expert_crud.get_pending_experts(db=db)
    return pending_experts


@router.post("/admin/{vk_id}/approve", status_code=200)
async def approve_expert(
    vk_id: int,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
):
    profile = await expert_crud.set_expert_status(db=db, vk_id=vk_id, status="approved")
    if not profile:
        raise HTTPException(status_code=404, detail="Expert profile not found")

    await notifier.send_moderation_result(vk_id=vk_id, approved=True)
    return {"status": "ok", "message": "Expert approved"}


# Аналогичный эндпоинт для /reject
@router.post("/admin/{vk_id}/reject", status_code=200)
async def reject_expert(
    vk_id: int,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
):
    # В реальном приложении здесь бы принималась причина отклонения
    profile = await expert_crud.set_expert_status(db=db, vk_id=vk_id, status="rejected")
    if not profile:
        raise HTTPException(status_code=404, detail="Expert profile not found")

    await notifier.send_moderation_result(
        vk_id=vk_id, approved=False, reason="Несоответствие требованиям"
    )
    return {"status": "ok", "message": "Expert rejected"}
