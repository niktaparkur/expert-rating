from typing import Dict, List

import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.dependencies import (
    get_current_user,
    get_db,
    get_redis,
    get_validated_vk_id,
)
from src.crud import expert_crud
from src.schemas.event_schemas import EventRead
from src.schemas.expert_schemas import (
    UserPrivateRead,
    UserCreate,
    UserSettingsUpdate,
    MyVoteRead,
    VotedExpertInfo,
    UserRegaliaUpdate,
)
from pydantic import EmailStr, TypeAdapter
from loguru import logger

router = APIRouter(prefix="/users", tags=["Users"])


@router.put("/me/email", response_model=UserPrivateRead)
async def update_user_email(
    email_data: dict,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
):
    vk_id = current_user["vk_id"]
    email_to_update = email_data.get("email")

    if not email_to_update:
        raise HTTPException(status_code=400, detail="Email field is required.")

    try:
        email_validator = TypeAdapter(EmailStr)
        validated_email = email_validator.validate_python(email_to_update)

        updated_user = await expert_crud.update_user_email(
            db, vk_id=vk_id, email=validated_email
        )
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found.")

        await cache.delete(f"user_profile:{vk_id}")

        result = await expert_crud.get_full_user_profile_with_stats(db, vk_id=vk_id)
        if not result:
            raise HTTPException(
                status_code=404, detail="User disappeared after update."
            )

        user, profile, stats_dict, my_votes_stats_dict = result

        response_data = UserPrivateRead.model_validate(user, from_attributes=True)
        response_data.stats = stats_dict
        response_data.my_votes_stats = my_votes_stats_dict
        response_data.is_admin = user.is_admin or (user.vk_id == settings.ADMIN_ID)
        response_data.email = user.email

        if profile:
            response_data.is_expert = profile.status == "approved"
            response_data.status = profile.status
            response_data.show_community_rating = profile.show_community_rating
            response_data.tariff_plan = profile.tariff_plan
            response_data.topics = [
                f"{theme.category.name} > {theme.name}"
                for theme in profile.selected_themes
            ]
            response_data.regalia = profile.regalia
            response_data.social_link = str(profile.social_link)

        response_data.allow_notifications = user.allow_notifications
        response_data.allow_expert_mailings = user.allow_expert_mailings

        return response_data

    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный формат email.")
    except Exception as e:
        if "Duplicate entry" in str(e) and "for key 'email'" in str(e):
            raise HTTPException(status_code=409, detail="Этот email уже используется.")
        logger.error(f"Failed to update email for user {vk_id}: {e}")
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера.")


@router.put("/me/regalia", response_model=UserPrivateRead)
async def update_user_regalia(
    regalia_data: UserRegaliaUpdate,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
):
    vk_id = current_user["vk_id"]
    if not current_user.get("is_expert"):
        raise HTTPException(
            status_code=403, detail="Только эксперты могут менять описание."
        )

    try:
        success = await expert_crud.update_user_regalia(
            db, vk_id=vk_id, regalia=regalia_data.regalia
        )
        if not success:
            raise HTTPException(status_code=404, detail="User profile not found.")

        await cache.delete(f"user_profile:{vk_id}")

        result = await expert_crud.get_full_user_profile_with_stats(db, vk_id=vk_id)
        if not result:
            raise HTTPException(status_code=404, detail="User disappeared.")

        user, profile, stats_dict, my_votes_stats_dict = result
        response_data = UserPrivateRead.model_validate(user, from_attributes=True)
        response_data.stats = stats_dict
        response_data.my_votes_stats = my_votes_stats_dict
        response_data.is_admin = user.is_admin or (user.vk_id == settings.ADMIN_ID)

        if profile:
            response_data.is_expert = profile.status == "approved"
            response_data.status = profile.status
            response_data.show_community_rating = profile.show_community_rating
            response_data.tariff_plan = profile.tariff_plan
            response_data.regalia = profile.regalia
            response_data.social_link = str(profile.social_link)
            response_data.topics = [
                f"{theme.category.name} > {theme.name}"
                for theme in profile.selected_themes
            ]

        return response_data

    except Exception as e:
        logger.error(f"Failed to update regalia for user {vk_id}: {e}")
        raise HTTPException(status_code=500, detail="Server error.")


@router.get("/me", response_model=UserPrivateRead)
async def read_users_me(current_user: Dict = Depends(get_current_user)):
    return current_user


@router.post("/register", response_model=UserPrivateRead)
async def register_new_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    vk_id_from_token: int = Depends(get_validated_vk_id),
):
    try:
        user_data.vk_id = vk_id_from_token

        new_user = await expert_crud.create_user(db=db, user_data=user_data)
        response_data = UserPrivateRead.model_validate(new_user, from_attributes=True)
        response_data.is_admin = new_user.vk_id == settings.ADMIN_ID
        return response_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me/votes", response_model=List[MyVoteRead])
async def get_my_votes(
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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


@router.put("/me/settings", response_model=UserPrivateRead)
async def update_user_settings(
    settings_data: UserSettingsUpdate,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
):
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

    response_data = UserPrivateRead.model_validate(user, from_attributes=True)
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
