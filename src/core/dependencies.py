from typing import Optional, Dict

import httpx
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


async def get_current_user(
        authorization: Optional[str] = Header(None), db: AsyncSession = Depends(get_db)
) -> Dict:
    if authorization is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header is missing")

    token_type, _, access_token = authorization.partition(" ")
    if token_type.lower() != "bearer" or not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token format")

    params = {"token": access_token, "access_token": settings.VK_SERVICE_KEY, "v": "5.199"}
    logger.debug("Checking token for user via VK API...")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("https://api.vk.com/method/secure.checkToken", params=params)
            response.raise_for_status()
            data = response.json()
        except httpx.RequestError as e:
            logger.error(f"VK API request error: {e}")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Could not connect to VK API")
        except Exception:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Token check failed")

    if "error" in data:
        error_info = data['error']
        logger.warning(f"Invalid token from VK API: {error_info.get('error_msg')}")
        if error_info.get('error_code') == 10 and "limit reached" in error_info.get('error_reason', ''):
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                                detail="Rate limit reached. Please try again later.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail=f"Invalid token: {error_info.get('error_msg')}")

    vk_user_id = data["response"]["user_id"]
    user_with_profile_and_stats = await expert_crud.get_user_with_profile_by_vk_id(db, vk_id=vk_user_id)

    if not user_with_profile_and_stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="User not found in database. Please register.")

    user, profile, stats_dict = user_with_profile_and_stats
    is_admin_flag = user.is_admin or (user.vk_id == settings.ADMIN_ID)

    current_user = {
        "vk_id": user.vk_id, "first_name": user.first_name, "last_name": user.last_name,
        "photo_url": user.photo_url, "registration_date": user.registration_date,
        "is_admin": is_admin_flag, "is_expert": False, "status": None,
        "tariff_plan": "Начальный", "stats": stats_dict,
    }

    if profile:
        current_user["is_expert"] = profile.status == "approved"
        current_user["status"] = profile.status
        current_user["tariff_plan"] = profile.tariff_plan

    return current_user


async def get_current_admin_user(current_user: Dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    return current_user