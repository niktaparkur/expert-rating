from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func
from loguru import logger

from src.models.all_models import PromoCode, PromoCodeActivation
from src.schemas import promo_schemas


async def validate_and_get_promo_code(
    db: AsyncSession, code: str, user_vk_id: int
) -> PromoCode | None:
    query = select(PromoCode).where(PromoCode.code == code.upper())
    result = await db.execute(query)
    promo = result.scalars().first()

    logger.debug(f"Attempting to validate promo code '{code}' for user '{user_vk_id}'.")

    if not promo:
        logger.warning(f"Promo code '{code}' not found in DB.")
        return None

    if not promo.is_active:
        logger.warning(f"Promo code '{promo.code}' is not active.")
        return None

    if promo.expires_at and promo.expires_at.replace(
        tzinfo=timezone.utc
    ) < datetime.now(timezone.utc):
        logger.warning(f"Promo code '{promo.code}' has expired.")
        return None

    if promo.activations_limit is not None and promo.activations_limit > 0:
        count_query = select(func.count(PromoCodeActivation.id)).where(
            PromoCodeActivation.promo_code_id == promo.id
        )
        activations_count = (await db.execute(count_query)).scalar_one_or_none() or 0
        logger.debug(
            f"Total activations for '{promo.code}': {activations_count}. Limit: {promo.activations_limit}."
        )
        if activations_count >= promo.activations_limit:
            logger.warning(
                f"Promo code '{promo.code}' has reached its total activation limit."
            )
            return None

    user_count_query = select(func.count(PromoCodeActivation.id)).where(
        PromoCodeActivation.promo_code_id == promo.id,
        PromoCodeActivation.user_vk_id == user_vk_id,
    )
    user_activations_count = (
        await db.execute(user_count_query)
    ).scalar_one_or_none() or 0
    logger.debug(
        f"User '{user_vk_id}' activations for '{promo.code}': {user_activations_count}. Limit: {promo.user_activations_limit}."
    )

    # ИСПРАВЛЕНИЕ: Добавляем проверку, что лимит больше нуля
    if (
        promo.user_activations_limit > 0
        and user_activations_count >= promo.user_activations_limit
    ):
        logger.warning(
            f"User '{user_vk_id}' has reached their activation limit for promo code '{promo.code}'."
        )
        return None

    logger.success(
        f"Promo code '{promo.code}' successfully validated for user '{user_vk_id}'."
    )
    return promo


async def log_promo_activation(db: AsyncSession, promo_code_id: int, user_vk_id: int):
    activation = PromoCodeActivation(promo_code_id=promo_code_id, user_vk_id=user_vk_id)
    db.add(activation)
    await db.commit()


async def create_promo_code(
    db: AsyncSession, promo_data: promo_schemas.PromoCodeCreate
) -> PromoCode:
    # Проверяем на существование кода без учета статуса и срока действия
    existing_code_res = await db.execute(
        select(PromoCode).where(PromoCode.code == promo_data.code.upper())
    )
    if existing_code_res.scalars().first():
        raise ValueError("A promo code with this code already exists.")

    db_promo_code = PromoCode(
        code=promo_data.code.upper(),
        discount_percent=promo_data.discount_percent,
        expires_at=promo_data.expires_at,
        is_active=promo_data.is_active,
        activations_limit=promo_data.activations_limit,
        user_activations_limit=promo_data.user_activations_limit,
    )
    db.add(db_promo_code)
    await db.commit()
    await db.refresh(db_promo_code)
    return db_promo_code


async def get_all_promo_codes_paginated(db: AsyncSession, page: int, size: int):
    base_query = select(PromoCode)

    count_query = select(func.count()).select_from(base_query.subquery())
    total_count_res = await db.execute(count_query)
    total_count = total_count_res.scalar_one()

    paginated_query = (
        base_query.order_by(desc(PromoCode.created_at))
        .offset((page - 1) * size)
        .limit(size)
    )
    results = await db.execute(paginated_query)

    return results.scalars().all(), total_count


async def update_promo_code(
    db: AsyncSession, promo_id: int, promo_data: promo_schemas.PromoCodeCreate
) -> Optional[PromoCode]:
    result = await db.execute(select(PromoCode).where(PromoCode.id == promo_id))
    db_promo_code = result.scalars().first()
    if not db_promo_code:
        return None

    update_data = promo_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "code":
            value = value.upper()
        setattr(db_promo_code, key, value)

    await db.commit()
    await db.refresh(db_promo_code)
    return db_promo_code


async def delete_promo_code(db: AsyncSession, promo_id: int) -> bool:
    result = await db.execute(select(PromoCode).where(PromoCode.id == promo_id))
    db_promo_code = result.scalars().first()
    if db_promo_code:
        await db.delete(db_promo_code)
        await db.commit()
        return True
    return False
