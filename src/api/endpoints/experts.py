# /src/api/endpoints/experts.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.dependencies import get_db, get_notifier
from src.crud import expert_crud
from src.schemas import expert_schemas
from src.services.notifier import Notifier

router = APIRouter(prefix="/experts", tags=["Experts"])


@router.post("/register", status_code=201)
async def register_expert(
    expert_data: expert_schemas.ExpertCreate,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
):
    try:
        await expert_crud.create_expert_request(db=db, expert_data=expert_data)
        await notifier.send_new_request_to_admin(expert_data.user_data.model_dump())
        return {"status": "ok", "message": "Request sent for moderation"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/top", response_model=List[expert_schemas.UserAdminRead])
async def get_top_experts(db: AsyncSession = Depends(get_db)):
    # Используем существующую функцию, но в будущем ее можно улучшить для сортировки по рейтингу
    approved_experts = await expert_crud.get_experts_by_status(db=db, status="approved")
    response_users = []
    for user, profile in approved_experts:
        user_data = user.__dict__
        user_data["status"] = profile.status if profile else None
        # TODO: Добавить загрузку тем для каждого эксперта, если нужно
        response_users.append(user_data)
    return response_users


@router.get("/{vk_id}", response_model=expert_schemas.UserAdminRead)
async def get_expert_profile(vk_id: int, db: AsyncSession = Depends(get_db)):
    user_with_profile = await expert_crud.get_user_with_profile_by_vk_id(
        db=db, vk_id=vk_id
    )
    if not user_with_profile:
        raise HTTPException(status_code=404, detail="Expert not found")

    user, profile = user_with_profile
    user_data = user.__dict__
    user_data["status"] = profile.status if profile else None
    # TODO: Добавить статистику (рейтинги, кол-во мероприятий)
    return user_data


@router.get("/admin/pending", response_model=List[expert_schemas.ExpertRequestRead])
async def get_pending_experts(db: AsyncSession = Depends(get_db)):
    pending_experts = await expert_crud.get_pending_experts(db=db)
    return pending_experts


@router.get("/admin/all_users", response_model=List[expert_schemas.UserAdminRead])
async def get_all_users(db: AsyncSession = Depends(get_db)):
    users_with_profiles = await expert_crud.get_all_users_with_profiles(db=db)
    response_users = []
    for user, profile in users_with_profiles:
        user_data = user.__dict__
        user_data["status"] = profile.status if profile else None
        response_users.append(user_data)
    return response_users


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


@router.post("/admin/{vk_id}/reject", status_code=200)
async def reject_expert(
    vk_id: int,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
):
    profile = await expert_crud.set_expert_status(db=db, vk_id=vk_id, status="rejected")
    if not profile:
        raise HTTPException(status_code=404, detail="Expert profile not found")
    await notifier.send_moderation_result(
        vk_id=vk_id, approved=False, reason="Несоответствие требованиям"
    )
    return {"status": "ok", "message": "Expert rejected"}


@router.post("/admin/{vk_id}/delete", status_code=200)
async def delete_expert_endpoint(vk_id: int, db: AsyncSession = Depends(get_db)):
    success = await expert_crud.delete_user_by_vk_id(db=db, vk_id=vk_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "ok", "message": "User deleted"}
