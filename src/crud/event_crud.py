from datetime import datetime, timezone, timedelta

from sqlalchemy import and_, case, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Optional
from loguru import logger
from dateutil.parser import isoparse

from src.models import Event, ExpertProfile, ExpertRating, EventFeedback, Theme
from src.schemas import event_schemas


async def get_expert_approved_event_count_current_month(db: AsyncSession, expert_id: int) -> int:
    now = datetime.now(timezone.utc)
    # Текущий календарный месяц (с начала 1-го числа)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    query = select(func.count(Event.id)).where(
        Event.expert_id == expert_id,
        Event.status == "approved",
        Event.created_at >= start_of_month
    )
    result = await db.execute(query)
    return result.scalar_one()


async def check_event_availability(
        db: AsyncSession, promo_word: str, event_date: datetime, duration_minutes: int
) -> bool:
    promo_normalized = promo_word.upper().strip()

    query = select(Event).where(
        func.upper(Event.promo_word) == promo_normalized,
        Event.status.in_(["approved", "pending"]),
    )
    result = await db.execute(query)
    conflicting_events = result.scalars().all()

    if not conflicting_events:
        return True

    buffer = timedelta(minutes=30)

    new_event_start = event_date
    if isinstance(new_event_start, str):
        new_event_start = isoparse(new_event_start)
    if new_event_start.tzinfo is None:
        new_event_start = new_event_start.replace(tzinfo=timezone.utc)

    new_event_start -= buffer
    new_event_end = new_event_start + timedelta(minutes=duration_minutes) + (buffer * 2)

    for existing_event in conflicting_events:
        existing_start = existing_event.event_date
        if existing_start.tzinfo is None:
            existing_start = existing_start.replace(tzinfo=timezone.utc)

        existing_end = existing_start + timedelta(
            minutes=existing_event.duration_minutes
        )

        if new_event_start < existing_end and new_event_end > existing_start:
            logger.warning(
                f"Availability check failed for '{promo_normalized}' on {event_date}. "
                f"Conflict with event ID {existing_event.id}."
            )
            return False

    return True


async def delete_event_by_id(db: AsyncSession, event_id: int, expert_id: int) -> bool:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalars().first()

    if not event or event.expert_id != expert_id:
        return False

    now = datetime.now(timezone.utc)
    event_start_time = event.event_date.replace(tzinfo=timezone.utc)
    if now >= event_start_time:
        raise ValueError(
            "Нельзя удалить мероприятие, которое уже началось или завершилось."
        )

    await db.delete(event)
    await db.commit()
    return True


async def stop_event_voting(
        db: AsyncSession, event_id: int, expert_id: int
) -> Optional[Event]:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalars().first()

    if not event or event.expert_id != expert_id:
        return None

    now = datetime.now(timezone.utc)
    event_start_time = event.event_date.replace(tzinfo=timezone.utc)
    event_end_time = event_start_time + timedelta(minutes=event.duration_minutes)

    if not (event_start_time <= now < event_end_time):
        raise ValueError(
            "Можно остановить только то голосование, которое идет в данный момент."
        )

    new_duration = (now - event_start_time).total_seconds() / 60
    event.duration_minutes = int(new_duration)

    await db.commit()
    await db.refresh(event)
    return event


async def check_if_user_voted_on_event(
        db: AsyncSession, event_id: int, voter_vk_id: int
) -> bool:
    if not voter_vk_id:
        return False
    query = select(EventFeedback).where(
        and_(EventFeedback.event_id == event_id, EventFeedback.voter_id == voter_vk_id)
    )
    result = await db.execute(query)
    return result.scalars().first() is not None


async def create_event(
        db: AsyncSession, event_data: event_schemas.EventCreate, expert_id: int
):
    is_available = await check_event_availability(
        db,
        promo_word=event_data.promo_word,
        event_date=event_data.event_date,
        duration_minutes=event_data.duration_minutes,
    )
    if not is_available:
        raise ValueError(
            "Это промо-слово уже занято на указанное время или близкое к нему."
        )

    promo_normalized = event_data.promo_word.upper().strip()

    db_event = Event(
        expert_id=expert_id,
        name=event_data.name,
        description=event_data.description,
        promo_word=promo_normalized,
        duration_minutes=event_data.duration_minutes,
        event_date=event_data.event_date,
        is_private=event_data.is_private,
        event_link=str(event_data.event_link) if event_data.event_link else None,
        voter_thank_you_message=event_data.voter_thank_you_message,
        send_reminder=event_data.send_reminder,
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
            func.count(EventFeedback.id).label("votes_count"),
            func.sum(case((EventFeedback.rating_snapshot == 1, 1), else_=0)).label(
                "trust_count"
            ),
            func.sum(case((EventFeedback.rating_snapshot == -1, 1), else_=0)).label(
                "distrust_count"
            ),
        )
        .outerjoin(EventFeedback, Event.id == EventFeedback.event_id)
        .where(Event.expert_id == expert_id)
        .group_by(Event.id)
        .order_by(Event.event_date.desc())
    )
    results = await db.execute(query)
    return results.all()


async def get_event_by_promo(db: AsyncSession, promo_word: str):
    now = datetime.now(timezone.utc)
    query = (
        select(Event)
        .filter(
            func.upper(Event.promo_word) == promo_word.upper(),
            Event.status == "approved",
            Event.event_date <= now,
            func.timestampadd(text("MINUTE"), Event.duration_minutes, Event.event_date)
            >= func.now(),
        )
        .options(selectinload(Event.expert).selectinload(ExpertProfile.user))
        .order_by(Event.event_date.asc())
    )
    result = await db.execute(query)
    return result.scalars().first()


async def create_vote(
        db: AsyncSession, vote_data: event_schemas.VoteCreate, event: Event
):
    existing_feedback = await db.execute(
        select(EventFeedback).filter(
            EventFeedback.voter_id == vote_data.voter_vk_id,
            EventFeedback.event_id == event.id
        )
    )
    if existing_feedback.scalars().first():
        raise ValueError("Вы уже оставили отзыв к этому мероприятию.")

    target_value = 0
    if vote_data.vote_type == "trust":
        target_value = 1
    elif vote_data.vote_type == "distrust":
        target_value = -1

    rating_query = select(ExpertRating).filter(
        ExpertRating.expert_id == event.expert_id,
        ExpertRating.voter_id == vote_data.voter_vk_id
    )
    rating_res = await db.execute(rating_query)
    existing_rating = rating_res.scalars().first()

    if vote_data.vote_type == "remove":
        if existing_rating:
            await db.delete(existing_rating)
    elif vote_data.vote_type in ["trust", "distrust"]:
        if existing_rating:
            existing_rating.vote_value = target_value
        else:
            new_rating = ExpertRating(
                expert_id=event.expert_id,
                voter_id=vote_data.voter_vk_id,
                vote_value=target_value
            )
            db.add(new_rating)

    snapshot_val = 0
    if vote_data.vote_type == "trust":
        snapshot_val = 1
    elif vote_data.vote_type == "distrust":
        snapshot_val = -1

    db_feedback = EventFeedback(
        voter_id=vote_data.voter_vk_id,
        expert_id=event.expert_id,
        event_id=event.id,
        comment=vote_data.comment,
        rating_snapshot=snapshot_val
    )
    db.add(db_feedback)

    await db.commit()
    await db.refresh(db_feedback)
    return db_feedback


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
    now = datetime.now(timezone.utc)
    query = (
        select(Event)
        .where(
            and_(
                Event.status == "approved",
                Event.is_private.is_(False),
                Event.event_date >= now,
            )
        )
        .order_by(Event.event_date.asc())
    )
    results = await db.execute(query)
    return results.scalars().all()


async def get_events_by_expert_id(db: AsyncSession, expert_id: int):
    now = datetime.now(timezone.utc)
    query = (
        select(Event)
        .where(
            and_(
                Event.expert_id == expert_id,
                Event.status == "approved",
            )
        )
        .order_by(Event.event_date.desc())
    )
    result = await db.execute(query)
    all_events = result.scalars().all()

    current_events = []
    past_events = []
    for event in all_events:
        start_time_aware = event.event_date.replace(tzinfo=timezone.utc)
        end_time = start_time_aware + timedelta(minutes=event.duration_minutes)
        if end_time < now:
            past_events.append(event)
        else:
            current_events.append(event)

    current_events.sort(key=lambda e: e.event_date)
    return {"current": current_events, "past": past_events}


async def get_public_events_feed(
        db: AsyncSession,
        page: int,
        size: int,
        search_query: Optional[str] = None,
        region: Optional[str] = None,
        category_id: Optional[int] = None,
):
    now = datetime.now(timezone.utc)

    query = (
        select(Event)
        .join(Event.expert)
        .where(
            and_(
                Event.status == "approved",
                Event.is_private.is_(False),
                Event.event_date >= now,
            )
        )
        .options(selectinload(Event.expert).selectinload(ExpertProfile.user))
    )

    if search_query:
        query = query.where(Event.name.ilike(f"%{search_query}%"))
    if region:
        query = query.where(ExpertProfile.region == region)
    if category_id:
        query = query.join(ExpertProfile.selected_themes).where(
            Theme.category_id == category_id
        )

    count_query = select(func.count()).select_from(query.distinct().subquery())
    total_count_res = await db.execute(count_query)
    total_count = total_count_res.scalar_one()

    paginated_query = (
        query.order_by(Event.event_date.asc()).offset((page - 1) * size).limit(size)
    )

    results = await db.execute(paginated_query)
    return results.scalars().unique().all(), total_count


async def delete_event_vote(db: AsyncSession, vote_id: int, voter_vk_id: int) -> bool:
    query = select(EventFeedback).where(
        EventFeedback.id == vote_id,
        EventFeedback.voter_id == voter_vk_id
    )
    result = await db.execute(query)
    vote_to_delete = result.scalars().first()

    if vote_to_delete:
        await db.delete(vote_to_delete)
        await db.commit()
        return True
    return False


async def get_events_for_reminding(db: AsyncSession):
    now = datetime.now(timezone.utc)
    start_time_threshold = now + timedelta(minutes=15)

    query = select(Event).where(
        and_(
            Event.status == "approved",
            Event.send_reminder.is_(True),
            Event.reminder_sent.is_(False),
            Event.event_date.between(now, start_time_threshold),
        )
    )
    result = await db.execute(query)
    return result.scalars().all()


async def mark_reminder_as_sent(db: AsyncSession, event_id: int):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalars().first()
    if event:
        event.reminder_sent = True
        await db.commit()