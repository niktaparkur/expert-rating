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
from src.schemas import expert_schemas

from src.crud import event_crud

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


async def get_validated_vk_id(
    authorization: Optional[str] = Header(None),
    cache: redis.Redis = Depends(get_redis),
) -> int:
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

    token_cache_key = f"token_to_id:{access_token}"
    cached_id = await cache.get(token_cache_key)

    if cached_id:
        vk_user_id = int(cached_id)
        logger.trace(f"VK User ID {vk_user_id} found in token cache.")
        return vk_user_id

    logger.trace("Checking token via VK API...")
    params = {
        "token": access_token,
        "access_token": settings.VK_SERVICE_KEY,
        "v": "5.199",
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://api.vk.com/method/secure.checkToken", params=params
            )
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            logger.error(f"VK API connection error: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not connect to VK API",
            )

    if "error" in data:
        error_msg = data["error"].get("error_msg", "Unknown error")
        logger.warning(f"Invalid token attempt: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {error_msg}",
        )

    vk_user_id = data["response"]["user_id"]

    await cache.set(token_cache_key, vk_user_id, ex=300)
    return vk_user_id


async def get_optional_validated_vk_id(
    authorization: Optional[str] = Header(None),
    cache: redis.Redis = Depends(get_redis),
) -> Optional[int]:
    if authorization is None:
        return None
    return await get_validated_vk_id(authorization, cache)


async def get_current_user(
    vk_user_id: int = Depends(get_validated_vk_id),
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
) -> Dict:
    cache_key = f"user_profile:{vk_user_id}"
    cached_user_str = await cache.get(cache_key)

    if cached_user_str:
        user_dict = json.loads(cached_user_str)
        if user_dict.get("is_expert") and "event_usage" not in user_dict:
            logger.info(
                f"Cache for user {vk_user_id} is outdated (missing event_usage), refreshing..."
            )
        else:
            return user_dict

    return await fetch_and_cache_user_profile(vk_user_id, db, cache)


async def fetch_and_cache_user_profile(
    vk_user_id: int, db: AsyncSession, cache: redis.Redis
) -> Dict:
    result = await expert_crud.get_full_user_profile_with_stats(db, vk_id=vk_user_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in database. Please register.",
        )

    user, profile, stats_dict, my_votes_stats_dict = result

    response_data = expert_schemas.UserPrivateRead.model_validate(
        user, from_attributes=True
    )

    response_data.stats = expert_schemas.StatsPrivate(**stats_dict)
    response_data.my_votes_stats = expert_schemas.MyVotesStats(**my_votes_stats_dict)
    response_data.is_admin = user.is_admin or (user.vk_id == settings.ADMIN_ID)

    if profile:
        response_data.is_expert = profile.status == "approved"
        response_data.status = profile.status
        response_data.show_community_rating = profile.show_community_rating
        response_data.regalia = profile.regalia
        response_data.social_link = str(profile.social_link)
        if profile.selected_themes:
            response_data.topics = [
                f"{theme.category.name} > {theme.name}"
                for theme in profile.selected_themes
            ]
        # Tariff logic based on DonutSubscription
        current_tariff_name = "Начальный"
        current_tariff_limit = 3 # Default fallback

        # Fetch relevant tariffs
        from src.models.tariff import Tariff
        from sqlalchemy import select
        
        # Optimization: could cache this
        tariffs_result = await db.execute(select(Tariff).where(Tariff.is_active == True).order_by(Tariff.price.desc()))
        all_tariffs = tariffs_result.scalars().all()
        
        start_tariff = next((t for t in all_tariffs if t.price == 0), None)
        if start_tariff:
            current_tariff_limit = start_tariff.event_limit

        if user.subscription and user.subscription.is_active:
            for tariff in all_tariffs:
                if user.subscription.amount >= tariff.price:
                    current_tariff_name = tariff.name
                    current_tariff_limit = tariff.event_limit
                    break
            
            if user.subscription.next_payment_date:
                response_data.next_payment_date = (
                    user.subscription.next_payment_date
                )
        
        response_data.tariff_plan = current_tariff_name

        # Event usage logic
        if response_data.is_expert:
            limit = current_tariff_limit
            current_count = (
                await event_crud.get_expert_active_event_count_current_month(
                    db, vk_user_id
                )
            )
            response_data.event_usage = expert_schemas.EventUsage(
                current_count=current_count, limit=limit
            )

    current_user_dict = response_data.model_dump(mode="json")
    cache_key = f"user_profile:{vk_user_id}"
    await cache.set(cache_key, json.dumps(current_user_dict), ex=3600)
    return current_user_dict


async def get_current_admin_user(current_user: Dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    return current_user


async def check_idempotency_key(
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    cache: redis.Redis = Depends(get_redis),
) -> Optional[str]:
    if not x_idempotency_key:
        return None

    cached_res = await cache.get(f"idempotency:{x_idempotency_key}")
    if cached_res:
        from src.core.exceptions import IdempotentException

        raise IdempotentException(content=json.loads(cached_res))

    return x_idempotency_key


async def save_idempotency_result(
    key: str, result: dict, cache: redis.Redis, expire: int = 86400  # 24 hours
):
    if key:
        await cache.set(f"idempotency:{key}", json.dumps(result), ex=expire)
