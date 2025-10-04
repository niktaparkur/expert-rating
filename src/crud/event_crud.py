from sqlalchemy import func, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone

from src.models.all_models import Event, Vote
from src.schemas import event_schemas


# --- Функции для Мероприятий ---


async def create_event(
    db: AsyncSession, event_data: event_schemas.EventCreate, expert_id: int
):
    # TODO: Добавить проверку лимитов тарифа эксперта

    # Проверка, занято ли промо-слово
    existing_event = await get_event_by_promo(db, event_data.promo_word)
    if existing_event:
        raise ValueError("This promo word is already taken.")

    db_event = Event(
        expert_id=expert_id,
        event_name=event_data.name,
        promo_word=event_data.promo_word,
        duration_minutes=event_data.duration_minutes,
        event_date=event_data.event_date,
        start_date=datetime.now(timezone.utc),
        status="pending",
    )
    db.add(db_event)
    await db.commit()
    await db.refresh(db_event)
    return db_event


async def get_my_events(db: AsyncSession, expert_id: int):
    # Сложный запрос для подсчета голосов
    query = (
        select(
            Event,
            func.count(Vote.id).label("votes_count"),
            func.sum(case((Vote.vote_type == "trust", 1), else_=0)).label(
                "trust_count"
            ),
            func.sum(case((Vote.vote_type == "distrust", 1), else_=0)).label(
                "distrust_count"
            ),
        )
        .outerjoin(Vote, Event.id == Vote.event_id)
        .where(Event.expert_id == expert_id)
        .group_by(Event.id)
        .order_by(Event.start_date.desc())
    )
    results = await db.execute(query)
    return results.all()


# --- Функции для Голосования ---


async def get_event_by_promo(db: AsyncSession, promo_word: str):
    result = await db.execute(select(Event).filter(Event.promo_word == promo_word))
    return result.scalars().first()


async def create_vote(
    db: AsyncSession, vote_data: event_schemas.VoteCreate, event: Event
):
    # TODO: Добавить проверку лимитов голосов на мероприятии

    # Проверка, не голосовал ли пользователь уже на этом мероприятии
    existing_vote_result = await db.execute(
        select(Vote).filter(
            Vote.voter_vk_id == vote_data.voter_vk_id, Vote.event_id == event.id
        )
    )
    if existing_vote_result.scalars().first():
        raise ValueError("You have already voted in this event.")

    db_vote = Vote(
        voter_vk_id=vote_data.voter_vk_id,
        expert_vk_id=event.expert_id,
        event_id=event.id,
        is_expert_vote=True,
        vote_type=vote_data.vote_type,
        comment_positive=vote_data.comment_positive,
        comment_negative=vote_data.comment_negative,
    )
    db.add(db_vote)
    await db.commit()
    await db.refresh(db_vote)
    return db_vote


# --- Функции для Админки ---


async def get_pending_events(db: AsyncSession):
    result = await db.execute(select(Event).filter(Event.status == "pending"))
    return result.scalars().all()


async def set_event_status(db: AsyncSession, event_id: int, status: str):
    result = await db.execute(select(Event).filter(Event.id == event_id))
    db_event = result.scalars().first()
    if not db_event:
        return None
    db_event.status = status
    await db.commit()
    await db.refresh(db_event)
    return db_event
