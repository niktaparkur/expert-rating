from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func

from src.models.all_models import PromoCode
from src.schemas import promo_schemas


async def get_promo_code_by_code(db: AsyncSession, code: str) -> PromoCode | None:
    query = select(PromoCode).where(PromoCode.code == code.upper())
    result = await db.execute(query)
    promo = result.scalars().first()
    if not promo:
        return None
    if not promo.is_active:
        return None
    if promo.expires_at and promo.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return None
    return promo


async def create_promo_code(db: AsyncSession, promo_data: promo_schemas.PromoCodeCreate) -> PromoCode:
    existing_code = await get_promo_code_by_code(db, promo_data.code)
    if existing_code:
        raise ValueError("A promo code with this code already exists.")

    db_promo_code = PromoCode(
        code=promo_data.code.upper(),
        discount_percent=promo_data.discount_percent,
        expires_at=promo_data.expires_at,
        is_active=promo_data.is_active,
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

    paginated_query = base_query.order_by(desc(PromoCode.created_at)).offset((page - 1) * size).limit(size)
    results = await db.execute(paginated_query)

    return results.scalars().all(), total_count


async def update_promo_code(db: AsyncSession, promo_id: int,
                            promo_data: promo_schemas.PromoCodeCreate) -> PromoCode | None:
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
