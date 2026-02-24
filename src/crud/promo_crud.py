from typing import Optional, List, Tuple

from sqlalchemy import desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from loguru import logger

from src.models import PromoCode
from src.schemas import promo_schemas


async def validate_and_get_promo_code(
    db: AsyncSession, code: str, user_vk_id: int
) -> Optional[PromoCode]:
    if not code:
        return None

    query = select(PromoCode).where(PromoCode.code == code.upper())
    result = await db.execute(query)
    promo = result.scalars().first()

    logger.debug(f"Validating promo code '{code}' for user '{user_vk_id}'.")

    if not promo:
        logger.warning(f"Promo code '{code}' not found.")
        return None

    if not promo.is_active:
        logger.warning(f"Promo code '{promo.code}' is inactive.")
        return None

    logger.success(f"Promo code '{promo.code}' is valid.")
    return promo


async def create_promo_code(
    db: AsyncSession, promo_data: promo_schemas.PromoCodeCreate
) -> PromoCode:
    existing_code_res = await db.execute(
        select(PromoCode).where(PromoCode.code == promo_data.code.upper())
    )
    if existing_code_res.scalars().first():
        raise ValueError("A promo code with this code already exists.")

    db_promo_code = PromoCode(
        code=promo_data.code.upper(),
        is_active=promo_data.is_active,
    )
    db.add(db_promo_code)
    await db.commit()
    await db.refresh(db_promo_code)
    return db_promo_code


async def get_all_promo_codes_paginated(
    db: AsyncSession, page: int, size: int
) -> Tuple[List[PromoCode], int]:
    base_query = select(PromoCode)

    count_query = select(func.count()).select_from(base_query.subquery())
    total_count_res = await db.execute(count_query)
    total_count = total_count_res.scalar_one()

    paginated_query = (
        base_query.order_by(desc(PromoCode.id)).offset((page - 1) * size).limit(size)
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

    db_promo_code.code = promo_data.code.upper()
    db_promo_code.is_active = promo_data.is_active

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
