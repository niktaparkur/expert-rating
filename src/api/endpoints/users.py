from typing import Dict, List

import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.dependencies import get_current_user, get_db, get_redis
from src.crud import expert_crud
from src.schemas.event_schemas import EventRead
from src.schemas.expert_schemas import (
    UserAdminRead,
    UserCreate,
    UserSettingsUpdate,
    MyVoteRead,
    VotedExpertInfo,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserAdminRead)
async def read_users_me(current_user: Dict = Depends(get_current_user)):
    return current_user


@router.post("/register", response_model=UserAdminRead)
async def register_new_user(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Регистрирует нового пользователя в системе."""
    try:
        new_user = await expert_crud.create_user(db=db, user_data=user_data)
        response_data = UserAdminRead.model_validate(new_user, from_attributes=True)
        response_data.is_admin = new_user.vk_id == settings.ADMIN_ID
        return response_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me/votes", response_model=List[MyVoteRead])
async def get_my_votes(
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Возвращает список всех голосов, отданных текущим пользователем."""
    vk_id = current_user["vk_id"]
    votes_from_db = await expert_crud.get_user_votes(db, vk_id=vk_id)

    response_list = []
    for vote in votes_from_db:
        vote_data_dict = {
            "id": vote.id,
            "vote_type": vote.vote_type,
            "is_expert_vote": vote.is_expert_vote,
            "created_at": vote.created_at,
            "expert": None,
            "event": None,
        }

        if not vote.is_expert_vote and vote.expert and vote.expert.user:
            vote_data_dict["expert"] = VotedExpertInfo.model_validate(
                vote.expert.user, from_attributes=True
            )

        if (
            vote.is_expert_vote
            and vote.event
            and vote.event.expert
            and vote.event.expert.user
        ):
            event_expert_info = VotedExpertInfo.model_validate(
                vote.event.expert.user, from_attributes=True
            )
            event_data = EventRead.model_validate(vote.event, from_attributes=True)
            event_data.expert_info = event_expert_info
            vote_data_dict["event"] = event_data

        response_list.append(MyVoteRead.model_validate(vote_data_dict))

    return response_list


@router.put("/me/settings", response_model=UserAdminRead)
async def update_user_settings(
    settings_data: UserSettingsUpdate,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
):
    """Обновляет настройки текущего пользователя."""
    vk_id = current_user["vk_id"]
    try:
        await expert_crud.update_user_settings(
            db, vk_id=vk_id, settings_data=settings_data
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    cache_key = f"user_profile:{vk_id}"
    await cache.delete(cache_key)

    result = await expert_crud.get_full_user_profile_with_stats(db, vk_id=vk_id)
    if not result:
        raise HTTPException(status_code=404, detail="User not found after update.")

    user, profile, stats_dict, my_votes_stats_dict = result

    response_data = UserAdminRead.model_validate(user, from_attributes=True)
    response_data.stats = stats_dict
    response_data.my_votes_stats = my_votes_stats_dict
    response_data.is_admin = user.is_admin or (user.vk_id == settings.ADMIN_ID)

    if profile:
        response_data.is_expert = profile.status == "approved"
        response_data.status = profile.status
        response_data.show_community_rating = profile.show_community_rating
        response_data.tariff_plan = profile.tariff_plan
        response_data.topics = [
            f"{theme.category.name} > {theme.name}" for theme in profile.selected_themes
        ]

    response_data.allow_notifications = user.allow_notifications
    response_data.allow_expert_mailings = user.allow_expert_mailings

    return response_data
