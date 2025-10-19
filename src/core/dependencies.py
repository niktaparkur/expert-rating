import json
from typing import Optional, Dict

import httpx
import redis.asyncio as redis
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Header, status
from loguru import logger
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from src.core.config import settings
from src.crud import expert_crud
from src.services.notifier import Notifier

load_dotenv()

DATABASE_URL = settings.DATABASE_URL_ASYNC
engine = create_async_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


notifier = Notifier(token=settings.VK_BOT_TOKEN)


def get_notifier() -> Notifier:
    return notifier


redis_pool = redis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_redis() -> redis.Redis:
    return redis_pool


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
) -> Dict:
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is missing",
        )
    token_type, _, access_token = authorization.partition(" ")
    if token_type.lower() != "bearer" or not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token format"
        )

    params = {
        "token": access_token,
        "access_token": settings.VK_SERVICE_KEY,
        "v": "5.199",
    }
    token_cache_key = f"token_to_id:{access_token}"
    cached_id = await cache.get(token_cache_key)

    if cached_id:
        vk_user_id = int(cached_id)
        logger.debug(f"VK User ID {vk_user_id} found in token cache.")
    else:
        logger.debug("Checking token for user via VK API...")
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    "https://api.vk.com/method/secure.checkToken", params=params
                )
                response.raise_for_status()
                data = response.json()
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Could not connect to VK API: {e}",
                )
        if "error" in data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {data['error'].get('error_msg')}",
            )
        vk_user_id = data["response"]["user_id"]
        await cache.set(token_cache_key, vk_user_id, ex=300)

    cache_key = f"user_profile:{vk_user_id}"
    cached_user_str = await cache.get(cache_key)
    if cached_user_str:
        logger.success(f"User {vk_user_id} found in profile cache.")
        return json.loads(cached_user_str)

    logger.debug(f"User {vk_user_id} not in profile cache. Fetching from DB.")

    user_with_profile = await expert_crud.get_user_with_profile(db, vk_id=vk_user_id)
    if not user_with_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in database. Please register.",
        )

    user, profile = user_with_profile
    is_admin_flag = user.is_admin or (user.vk_id == settings.ADMIN_ID)

    current_user = {
        "vk_id": user.vk_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "photo_url": str(user.photo_url),
        "registration_date": user.registration_date,
        "is_admin": is_admin_flag,
        "is_expert": False,
        "status": None,
        "tariff_plan": "Начальный",
        "topics": [],
        "show_community_rating": True,
    }

    if profile:
        current_user["is_expert"] = profile.status == "approved"
        current_user["status"] = profile.status
        current_user["tariff_plan"] = profile.tariff_plan
        current_user["show_community_rating"] = profile.show_community_rating
        if profile.selected_themes:
            current_user["topics"] = [
                f"{theme.category.name} > {theme.name}"
                for theme in profile.selected_themes
            ]

    if current_user.get("registration_date"):
        current_user["registration_date"] = current_user[
            "registration_date"
        ].isoformat()

    await cache.set(cache_key, json.dumps(current_user), ex=3600)
    logger.info(f"User {vk_user_id} data has been cached.")

    return current_user


async def get_current_admin_user(current_user: Dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    return current_user
