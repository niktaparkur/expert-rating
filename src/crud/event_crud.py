from datetime import datetime, timezone, timedelta

from sqlalchemy import and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Optional
from loguru import logger

from src.models.all_models import Event, ExpertProfile, Vote, Theme
from src.schemas import event_schemas


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
    query = select(Vote).where(
        and_(Vote.event_id == event_id, Vote.voter_vk_id == voter_vk_id)
    )
    result = await db.execute(query)
    return result.scalars().first() is not None


async def create_event(
    db: AsyncSession, event_data: event_schemas.EventCreate, expert_id: int
):
    promo_normalized = event_data.promo_word.upper().strip()
    logger.info(f"Attempting to create event with promo_word: '{promo_normalized}'")

    query = select(Event).where(func.upper(Event.promo_word) == promo_normalized)
    result = await db.execute(query)
    conflicting_events = result.scalars().all()

    if conflicting_events:
        logger.warning(
            f"Found {len(conflicting_events)} existing events with the same promo word. Checking for time conflicts..."
        )
        buffer = timedelta(minutes=30)
        new_event_start = event_data.event_date.replace(tzinfo=timezone.utc) - buffer
        new_event_end = (
            new_event_start
            + timedelta(minutes=event_data.duration_minutes)
            + (buffer * 2)
        )

        for existing_event in conflicting_events:
            existing_start = existing_event.event_date.replace(tzinfo=timezone.utc)
            existing_end = existing_start + timedelta(
                minutes=existing_event.duration_minutes
            )

            if new_event_start < existing_end and new_event_end > existing_start:
                logger.error(
                    f"Time conflict detected for promo_word '{promo_normalized}'. "
                    f"New event interval ({new_event_start} to {new_event_end}) "
                    f"conflicts with existing event ID {existing_event.id} "
                    f"({existing_start} to {existing_end})."
                )
                raise ValueError(
                    "Это промо-слово уже занято на указанное время или близкое к нему."
                )

    logger.success(
        f"No time conflicts found for promo_word '{promo_normalized}'. Proceeding with creation."
    )
    db_event = Event(
        expert_id=expert_id,
        event_name=event_data.name,
        description=event_data.description,
        promo_word=promo_normalized,
        duration_minutes=event_data.duration_minutes,
        event_date=event_data.event_date,
        is_private=event_data.is_private,
        event_link=str(event_data.event_link) if event_data.event_link else None,
        voter_thank_you_message=event_data.voter_thank_you_message,
        send_reminder=event_data.send_reminder,
        start_date=datetime.now(timezone.utc),
        status="pending",
    )
    db.add(db_event)
    await db.commit()
    await db.refresh(db_event)
    return db_event


async def get_event_by_promo(db: AsyncSession, promo_word: str):
    now = datetime.now(timezone.utc)
    query = (
        select(Event)
        .filter(
            func.upper(Event.promo_word) == promo_word.upper(),
            Event.status == "approved",
            # Ищем событие, которое еще не закончилось
            Event.event_date + func.make_interval(mins=Event.duration_minutes) >= now,
        )
        .options(selectinload(Event.expert).selectinload(ExpertProfile.user))
        .order_by(
            Event.event_date.asc()
        )  # Берем самое раннее из будущих, если их несколько
    )
    result = await db.execute(query)
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
        query = query.where(Event.event_name.ilike(f"%{search_query}%"))
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
    query = select(Vote).where(
        Vote.id == vote_id,
        Vote.voter_vk_id == voter_vk_id,
        Vote.is_expert_vote.is_(True),
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
