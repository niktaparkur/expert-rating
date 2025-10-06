from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.dependencies import (
    get_db,
    get_notifier,
    get_current_admin_user,
)  # <-- Импортируем новую зависимость
from src.crud import expert_crud
from src.schemas import expert_schemas
from src.services.notifier import Notifier

router = APIRouter(prefix="/experts", tags=["Experts"])


# ... (публичные эндпоинты без изменений) ...
@router.post("/register", status_code=201)
async def register_expert(
    expert_data: expert_schemas.ExpertCreate,
    db: AsyncSession = Depends(get_db),
    notifier: Notifier = Depends(get_notifier),
):
    try:
        await expert_crud.create_expert_request(db=db, expert_data=expert_data)
        user_info_for_notifier = {
            **expert_data.user_data.model_dump(),
            "regalia": expert_data.profile_data.regalia,
        }
        await notifier.send_new_request_to_admin(user_info_for_notifier)
        return {"status": "ok", "message": "Request sent for moderation"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/top", response_model=List[expert_schemas.UserAdminRead])
async def get_top_experts(db: AsyncSession = Depends(get_db)):
    approved_experts_data = await expert_crud.get_experts_by_status(
        db=db, status="approved"
    )

    response_users = []
    for user, profile, stats_dict, topics in approved_experts_data:
        user_data = expert_schemas.UserAdminRead.model_validate(
            user, from_attributes=True
        )
        user_data.status = profile.status
        user_data.stats = expert_schemas.Stats(**stats_dict)
        user_data.topics = topics
        response_users.append(user_data)

    return response_users


@router.get("/{vk_id}", response_model=expert_schemas.UserAdminRead)
async def get_expert_profile(vk_id: int, db: AsyncSession = Depends(get_db)):
    result = await expert_crud.get_user_with_profile_by_vk_id(db=db, vk_id=vk_id)
    if not result:
        raise HTTPException(status_code=404, detail="Expert not found")

    user, profile, stats_dict = result
    topics = []
    if profile and profile.topics:
        topics = [topic.topic_name for topic in profile.topics]

    response_data = expert_schemas.UserAdminRead.model_validate(
        user, from_attributes=True
    )
    response_data.stats = expert_schemas.Stats(**stats_dict)
    response_data.topics = topics
    if profile:
        response_data.status = profile.status

    return response_data


@router.post("/{vk_id}/vote", status_code=201)
async def vote_for_expert_narod(
    vk_id: int,
    vote_data: expert_schemas.NarodVoteCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        await expert_crud.create_narod_vote(db=db, vk_id=vk_id, vote_data=vote_data)
        return {"status": "ok", "message": "Your vote has been accepted."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Роуты для Админки ---
# ИСПРАВЛЕНИЕ: Добавляем `Depends(get_current_admin_user)` ко всем админским эндпоинтам
@router.get(
    "/admin/pending",
    response_model=List[expert_schemas.ExpertRequestRead],
    dependencies=[Depends(get_current_admin_user)],
)
async def get_pending_experts(db: AsyncSession = Depends(get_db)):
    pending_experts = await expert_crud.get_pending_experts(db=db)
    response = []
    for user, profile in pending_experts:
        data = {
            "vk_id": user.vk_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "photo_url": user.photo_url,
            "regalia": profile.regalia,
            "social_link": profile.social_link,
            "performance_link": profile.performance_link,
            "region": profile.region,
            "topics": [topic.topic_name for topic in profile.topics],
        }
        response.append(expert_schemas.ExpertRequestRead.model_validate(data))
    return response


@router.get(
    "/admin/all_users",
    response_model=List[expert_schemas.UserAdminRead],
    dependencies=[Depends(get_current_admin_user)],
)
async def get_all_users(db: AsyncSession = Depends(get_db)):
    users_with_profiles = await expert_crud.get_all_users_with_profiles(db=db)
    response_users = []
    for user, profile in users_with_profiles:
        user_data = expert_schemas.UserAdminRead.model_validate(
            user, from_attributes=True
        )
        if profile:
            user_data.status = profile.status
        response_users.append(user_data)
    return response_users


@router.post(
    "/admin/{vk_id}/approve",
    status_code=200,
    dependencies=[Depends(get_current_admin_user)],
)
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


@router.post(
    "/admin/{vk_id}/reject",
    status_code=200,
    dependencies=[Depends(get_current_admin_user)],
)
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


@router.post(
    "/admin/{vk_id}/delete",
    status_code=200,
    dependencies=[Depends(get_current_admin_user)],
)
async def delete_expert_endpoint(vk_id: int, db: AsyncSession = Depends(get_db)):
    success = await expert_crud.delete_user_by_vk_id(db=db, vk_id=vk_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "ok", "message": "User deleted"}
