from sqlalchemy import func, case, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone

from src.models.all_models import Event, Vote
from src.schemas import event_schemas


async def create_event(
    db: AsyncSession, event_data: event_schemas.EventCreate, expert_id: int
):
    promo_normalized = event_data.promo_word.upper().strip()
    existing_event = await get_event_by_promo(db, promo_normalized)
    if existing_event:
        raise ValueError("This promo word is already taken.")

    db_event = Event(
        expert_id=expert_id,
        event_name=event_data.name,
        promo_word=promo_normalized,
        duration_minutes=event_data.duration_minutes,
        event_date=event_data.event_date,
        is_private=event_data.is_private,
        event_link=str(event_data.event_link) if event_data.event_link else None,
        start_date=datetime.now(timezone.utc),
        status="pending",
    )
    db.add(db_event)
    await db.commit()
    await db.refresh(db_event)
    return db_event


async def get_my_events(db: AsyncSession, expert_id: int):
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


async def get_event_by_promo(db: AsyncSession, promo_word: str):
    result = await db.execute(
        select(Event).filter(func.upper(Event.promo_word) == promo_word.upper())
    )
    return result.scalars().first()


async def create_vote(
    db: AsyncSession, vote_data: event_schemas.VoteCreate, event: Event
):
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


async def get_pending_events(db: AsyncSession):
    result = await db.execute(select(Event).filter(Event.status == "pending"))
    return result.scalars().all()


async def set_event_status(
    db: AsyncSession, event_id: int, status: str, reason: str = None
):
    result = await db.execute(select(Event).filter(Event.id == event_id))
    db_event = result.scalars().first()
    if not db_event:
        return None
    db_event.status = status
    if status == "rejected" and reason:
        db_event.rejection_reason = reason
    await db.commit()
    await db.refresh(db_event)
    return db_event


async def get_public_upcoming_events(db: AsyncSession):
    query = (
        select(Event)
        .where(
            and_(
                Event.status == "approved",
                Event.is_private.is_(False),
                Event.event_date >= datetime.now(timezone.utc),
            )
        )
        .order_by(Event.event_date.asc())
        .limit(20)
    )
    results = await db.execute(query)
    return results.scalars().all()


async def get_events_by_expert_id(db: AsyncSession, expert_id: int):
    """Получает все одобренные мероприятия конкретного эксперта."""
    now = datetime.now(timezone.utc)

    # Запрос для текущих/будущих мероприятий
    current_query = (
        select(Event)
        .where(
            and_(
                Event.expert_id == expert_id,
                Event.status == "approved",
                Event.event_date >= now,
            )
        )
        .order_by(Event.event_date.asc())
    )
    current_results = await db.execute(current_query)

    # Запрос для прошедших мероприятий
    past_query = (
        select(Event)
        .where(
            and_(
                Event.expert_id == expert_id,
                Event.status == "approved",
                Event.event_date < now,
            )
        )
        .order_by(Event.event_date.desc())
    )
    past_results = await db.execute(past_query)

    return {
        "current": current_results.scalars().all(),
        "past": past_results.scalars().all(),
    }
