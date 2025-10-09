from typing import Dict, Any

import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.dependencies import get_current_user, get_db, get_redis
from src.crud import expert_crud
from src.schemas.expert_schemas import UserAdminRead, UserCreate, UserSettingsUpdate

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

    result = await expert_crud.get_user_with_profile_by_vk_id(db, vk_id=vk_id)
    if not result:
        raise HTTPException(status_code=404, detail="User not found after update.")

    user, profile, stats_dict = result

    response_data_dict: Dict[str, Any] = {
        "vk_id": user.vk_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "photo_url": str(user.photo_url),
        "registration_date": user.registration_date.isoformat(),
        "is_admin": user.is_admin or (user.vk_id == settings.ADMIN_ID),
        "is_expert": False,
        "status": None,
        "stats": stats_dict,
        "topics": [],
        "show_community_rating": True,
        "tariff_plan": "Начальный",
    }

    if profile:
        response_data_dict["is_expert"] = profile.status == "approved"
        response_data_dict["status"] = profile.status
        response_data_dict["show_community_rating"] = profile.show_community_rating
        response_data_dict["tariff_plan"] = profile.tariff_plan
        response_data_dict["topics"] = [
            f"{theme.category.name} > {theme.name}" for theme in profile.selected_themes
        ]

    return UserAdminRead(**response_data_dict)
