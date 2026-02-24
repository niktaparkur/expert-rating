from typing import Optional
from sqlalchemy import desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from src.models import PromoCode, PromoActivation, User


async def create_promo_code(db: AsyncSession, promo_data) -> PromoCode:
    existing = await db.execute(
        select(PromoCode).where(PromoCode.code == promo_data.code.upper())
    )
    if existing.scalars().first():
        raise ValueError("Промокод с таким текстом уже существует.")

    db_promo = PromoCode(
        code=promo_data.code.upper(),
        tariff_id=promo_data.tariff_id,
        activations_limit=promo_data.activations_limit,
        is_active=promo_data.is_active,
    )
    db.add(db_promo)
    await db.commit()
    await db.refresh(db_promo)
    return db_promo


async def get_all_promo_codes_paginated(db: AsyncSession, page: int, size: int):
    base_query = select(PromoCode).options(selectinload(PromoCode.tariff))
    count_query = select(func.count()).select_from(base_query.subquery())
    total_count = (await db.execute(count_query)).scalar_one()

    paginated_query = (
        base_query.order_by(desc(PromoCode.id)).offset((page - 1) * size).limit(size)
    )
    results = await db.execute(paginated_query)

    return results.scalars().all(), total_count


async def update_promo_code(
    db: AsyncSession, promo_id: int, promo_data
) -> Optional[PromoCode]:
    db_promo = await db.get(PromoCode, promo_id)
    if not db_promo:
        return None
    db_promo.code = promo_data.code.upper()
    db_promo.tariff_id = promo_data.tariff_id
    db_promo.activations_limit = promo_data.activations_limit
    db_promo.is_active = promo_data.is_active
    await db.commit()
    await db.refresh(db_promo)
    return db_promo


async def delete_promo_code(db: AsyncSession, promo_id: int) -> bool:
    db_promo = await db.get(PromoCode, promo_id)
    if db_promo:
        await db.delete(db_promo)
        await db.commit()
        return True
    return False


async def activate_promo_code_for_user(db: AsyncSession, code: str, user_vk_id: int):
    result = await db.execute(select(PromoCode).where(PromoCode.code == code.upper()))
    promo = result.scalars().first()

    if not promo:
        raise ValueError("Промокод не найден.")
    if not promo.is_active:
        raise ValueError("Промокод неактивен.")

    activation_check = await db.execute(
        select(PromoActivation).where(
            PromoActivation.promo_id == promo.id, PromoActivation.user_id == user_vk_id
        )
    )
    if activation_check.scalars().first():
        raise ValueError("Вы уже активировали этот промокод.")

    if promo.activations_limit is not None:
        count_res = await db.execute(
            select(func.count(PromoActivation.id)).where(
                PromoActivation.promo_id == promo.id
            )
        )
        used_count = count_res.scalar_one()
        if used_count >= promo.activations_limit:
            raise ValueError("Лимит активаций этого промокода исчерпан.")

    user = await db.get(User, user_vk_id)
    if not user:
        raise ValueError("Пользователь не найден.")

    user.forced_tariff_id = promo.tariff_id

    activation = PromoActivation(promo_id=promo.id, user_id=user_vk_id)
    db.add(activation)

    await db.commit()
    return promo
