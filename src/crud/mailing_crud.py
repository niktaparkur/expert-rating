# src/crud/mailing_crud.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func

from src.models.all_models import Mailings, Vote
from src.schemas import mailing_schemas

# Лимиты тарифов (дублируем для CRUD)
TARIFF_MAILING_LIMITS = {"Начальный": 1, "Стандарт": 2, "Профи": 4}


async def create_mailing_request(
    db: AsyncSession,
    expert_id: int,
    mailing_data: mailing_schemas.MailingCreate,
    user_tariff: str,
) -> Mailings:
    # 1. Проверка лимита по тарифу
    limit = TARIFF_MAILING_LIMITS.get(user_tariff, 1)

    # Считаем количество уже созданных (не отклоненных) рассылок в этом месяце
    query = select(func.count(Mailings.id)).where(
        and_(
            Mailings.expert_vk_id == expert_id,
            Mailings.status != "rejected",
            func.DATE_FORMAT(Mailings.created_at, "%Y-%m")
            == func.DATE_FORMAT(func.now(), "%Y-%m"),
        )
    )
    result = await db.execute(query)
    current_mailings_count = result.scalar_one()

    if current_mailings_count >= limit:
        raise ValueError(
            f"Превышен лимит рассылок для вашего тарифа ({current_mailings_count}/{limit} в этом месяце)."
        )

    # 2. Создание объекта рассылки
    new_mailing = Mailings(
        expert_vk_id=expert_id, message=mailing_data.message, status="pending"
    )
    db.add(new_mailing)
    await db.commit()
    await db.refresh(new_mailing)
    return new_mailing


async def get_pending_mailings(db: AsyncSession):
    query = (
        select(Mailings)
        .where(Mailings.status == "pending")
        .order_by(Mailings.created_at.asc())
    )
    result = await db.execute(query)
    return result.scalars().all()


async def update_mailing_status(
    db: AsyncSession, mailing_id: int, status: str, reason: str = None
) -> Mailings | None:
    result = await db.execute(select(Mailings).where(Mailings.id == mailing_id))
    mailing = result.scalars().first()
    if not mailing:
        return None

    mailing.status = status
    if reason:
        mailing.rejection_reason = reason

    await db.commit()
    await db.refresh(mailing)
    return mailing


async def get_trust_voters_for_expert(db: AsyncSession, expert_id: int) -> list[int]:
    """Возвращает список VK ID пользователей, проголосовавших 'trust' за эксперта."""
    query = (
        select(Vote.voter_vk_id)
        .where(and_(Vote.expert_vk_id == expert_id, Vote.vote_type == "trust"))
        .distinct()
    )

    result = await db.execute(query)
    return result.scalars().all()
