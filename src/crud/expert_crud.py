from datetime import datetime, timedelta, timezone
from typing import Optional

import redis.asyncio as redis
from loguru import logger
from sqlalchemy import func, and_, case, or_, String, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from src.models.all_models import (
    Event,
    ExpertProfile,
    Theme,
    User,
    Vote,
)
from src.schemas.expert_schemas import (
    CommunityVoteCreate,
    ExpertCreate,
    UserCreate,
    UserSettingsUpdate,
    UserVoteInfo,
)
from src.services.notifier import Notifier


async def create_expert_request(db: AsyncSession, expert_data: ExpertCreate) -> User:
    user_result = await db.execute(
        select(User).filter(User.vk_id == expert_data.user_data.vk_id)
    )
    db_user = user_result.scalars().first()
    if not db_user:
        db_user = User(**expert_data.user_data.model_dump())
        db.add(db_user)
        await db.flush()
    profile_result = await db.execute(
        select(ExpertProfile).filter(ExpertProfile.user_vk_id == db_user.vk_id)
    )
    if profile_result.scalars().first():
        raise ValueError("Вы уже подавали заявку или являетесь экспертом.")
    profile_data = expert_data.profile_data.model_dump(
        exclude={"theme_ids"}, by_alias=True
    )
    db_profile = ExpertProfile(user_vk_id=db_user.vk_id, **profile_data)
    if expert_data.profile_data.theme_ids:
        themes_result = await db.execute(
            select(Theme).filter(Theme.id.in_(expert_data.profile_data.theme_ids))
        )
        db_profile.selected_themes = themes_result.scalars().all()
    db.add(db_profile)
    await db.commit()
    await db.refresh(db_user)
    return db_user


async def get_user_with_profile(db: AsyncSession, vk_id: int):
    query = (
        select(User, ExpertProfile)
        .outerjoin(ExpertProfile, User.vk_id == ExpertProfile.user_vk_id)
        .filter(User.vk_id == vk_id)
        .options(
            selectinload(ExpertProfile.selected_themes).selectinload(Theme.category)
        )
    )
    result = await db.execute(query)
    return result.first()


async def get_full_user_profile_with_stats(db: AsyncSession, vk_id: int):
    user_profile_tuple = await get_user_with_profile(db, vk_id)
    if not user_profile_tuple:
        return None

    community_query = select(func.count(Vote.id)).where(
        Vote.expert_vk_id == vk_id,
        Vote.is_expert_vote.is_(False),
        Vote.vote_type == "trust",
    )
    community_res = await db.execute(community_query)
    community_count = community_res.scalar_one_or_none() or 0
    expert_query = select(func.count(Vote.id)).where(
        Vote.expert_vk_id == vk_id,
        Vote.is_expert_vote.is_(True),
        Vote.vote_type == "trust",
    )
    expert_res = await db.execute(expert_query)
    expert_count = expert_res.scalar_one_or_none() or 0
    events_query = select(func.count(Event.id)).where(
        Event.expert_id == vk_id, Event.status == "approved"
    )
    events_res = await db.execute(events_query)
    events_count = events_res.scalar_one_or_none() or 0
    stats = {
        "community": community_count,
        "expert": expert_count,
        "events_count": events_count,
    }

    my_votes_query = select(
        func.sum(case((Vote.vote_type == "trust", 1), else_=0)).label("trust"),
        func.sum(case((Vote.vote_type == "distrust", 1), else_=0)).label("distrust"),
    ).where(Vote.voter_vk_id == vk_id)
    my_votes_res = await db.execute(my_votes_query)
    my_votes_counts = my_votes_res.first()
    my_votes_stats = {
        "trust": int(my_votes_counts.trust or 0),
        "distrust": int(my_votes_counts.distrust or 0),
    }

    return tuple(user_profile_tuple) + (stats, my_votes_stats)


async def get_pending_experts(db: AsyncSession):
    query = (
        select(User, ExpertProfile)
        .join(ExpertProfile, User.vk_id == ExpertProfile.user_vk_id)
        .filter(ExpertProfile.status == "pending")
        .options(
            selectinload(ExpertProfile.selected_themes).selectinload(Theme.category)
        )
    )
    results = await db.execute(query)
    return results.all()


async def set_expert_status(
    db: AsyncSession, vk_id: int, status: str
) -> Optional[ExpertProfile]:
    result = await db.execute(
        select(ExpertProfile).filter(ExpertProfile.user_vk_id == vk_id)
    )
    db_profile = result.scalars().first()
    if not db_profile:
        return None
    db_profile.status = status
    user_result = await db.execute(select(User).filter(User.vk_id == vk_id))
    db_user = user_result.scalars().first()
    if db_user:
        db_user.is_expert = status == "approved"
    await db.commit()
    await db.refresh(db_profile)
    return db_profile


async def get_all_users_paginated(
    db: AsyncSession,
    page: int,
    size: int,
    search_query: Optional[str] = None,
    user_type_filter: Optional[str] = None,
    date_sort_order: Optional[str] = None,
):
    query = select(User, ExpertProfile).outerjoin(
        ExpertProfile, User.vk_id == ExpertProfile.user_vk_id
    )
    if user_type_filter == "expert":
        query = query.where(User.is_expert.is_(True))
    elif user_type_filter == "user":
        query = query.where(User.is_expert.is_(False))
    if search_query:
        search_term = f"%{search_query.lower()}%"
        query = query.where(
            or_(
                func.lower(User.first_name).like(search_term),
                func.lower(User.last_name).like(search_term),
                func.cast(User.vk_id, String).like(f"{search_term}%"),
            )
        )
    if date_sort_order == "asc":
        query = query.order_by(User.registration_date.asc())
    else:
        query = query.order_by(User.registration_date.desc())
    count_query = select(func.count()).select_from(query.subquery())
    total_count_res = await db.execute(count_query)
    total_count = total_count_res.scalar_one()
    offset = (page - 1) * size
    paginated_query = query.offset(offset).limit(size)
    results = await db.execute(paginated_query)
    return results.all(), total_count


async def delete_user_by_vk_id(
    db: AsyncSession, vk_id: int, cache: redis.Redis
) -> bool:
    result = await db.execute(select(User).filter(User.vk_id == vk_id))
    db_user = result.scalars().first()
    if db_user:
        await db.delete(db_user)
        await db.commit()
        logger.info(f"User {vk_id} deleted from database.")
        cache_key = f"user_profile:{vk_id}"
        await cache.delete(cache_key)
        logger.success(f"Cache for user {vk_id} has been invalidated.")
        return True
    logger.warning(f"Attempted to delete non-existent user {vk_id}.")
    return False


async def get_top_experts_paginated(
    db: AsyncSession,
    page: int,
    size: int,
    search_query: Optional[str] = None,
    region: Optional[str] = None,
    category_id: Optional[int] = None,
):
    expert_rating = (
        select(Vote.expert_vk_id, func.count(Vote.id).label("expert_rating"))
        .where(Vote.is_expert_vote.is_(True), Vote.vote_type == "trust")
        .group_by(Vote.expert_vk_id)
        .subquery()
    )

    base_query = (
        select(ExpertProfile)
        .join(User)
        .where(ExpertProfile.status == "approved")
        .join(
            expert_rating,
            ExpertProfile.user_vk_id == expert_rating.c.expert_vk_id,
            isouter=True,
        )
        .options(
            selectinload(ExpertProfile.user),
            selectinload(ExpertProfile.selected_themes).selectinload(Theme.category),
        )
    )

    if search_query:
        search_term = f"%{search_query.lower()}%"
        base_query = base_query.join(ExpertProfile.selected_themes, isouter=True).where(
            or_(
                func.lower(User.first_name).like(search_term),
                func.lower(User.last_name).like(search_term),
                func.lower(Theme.name).like(search_term),
            )
        )

    if region:
        base_query = base_query.where(ExpertProfile.region == region)

    if category_id:
        base_query = base_query.join(ExpertProfile.selected_themes).where(
            Theme.category_id == category_id
        )

    count_query = select(
        func.count(func.distinct(ExpertProfile.user_vk_id))
    ).select_from(base_query.subquery())
    total_count_res = await db.execute(count_query)
    total_count = total_count_res.scalar_one()

    paginated_query = (
        base_query.order_by(desc(func.coalesce(expert_rating.c.expert_rating, 0)))
        .offset((page - 1) * size)
        .limit(size)
    )

    results = await db.execute(paginated_query)
    profiles = results.scalars().unique().all()

    experts_with_stats = []
    for profile in profiles:
        full_expert_data = await get_full_user_profile_with_stats(
            db, vk_id=profile.user_vk_id
        )
        if full_expert_data:
            user_obj, profile_obj, stats_dict, my_votes_stats_dict = full_expert_data
            topics = [
                f"{theme.category.name} > {theme.name}"
                for theme in profile_obj.selected_themes
            ]
            experts_with_stats.append((user_obj, profile_obj, stats_dict, topics))

    return experts_with_stats, total_count


async def update_expert_tariff(db: AsyncSession, vk_id: int, tariff_name: str) -> bool:
    result = await db.execute(
        select(ExpertProfile).filter(ExpertProfile.user_vk_id == vk_id)
    )
    db_profile = result.scalars().first()
    if not db_profile:
        return False
    if tariff_name == "Стандарт":
        db_profile.tariff_plan = "Стандарт"
    elif tariff_name == "Профи":
        db_profile.tariff_plan = "Профи"
    else:
        return False
    db_profile.tariff_expiry_date = datetime.now(timezone.utc) + timedelta(days=30)
    await db.commit()
    return True


async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
    result = await db.execute(select(User).filter(User.vk_id == user_data.vk_id))
    if result.scalars().first():
        raise ValueError("User with this VK ID already exists.")
    db_user = User(**user_data.model_dump())
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


async def create_community_vote(
    db: AsyncSession,
    expert_vk_id: int,
    vote_data: CommunityVoteCreate,
    notifier: Notifier,
):
    expert_profile_res = await db.execute(
        select(ExpertProfile)
        .options(selectinload(ExpertProfile.user))
        .filter(
            ExpertProfile.user_vk_id == expert_vk_id, ExpertProfile.status == "approved"
        )
    )
    expert_profile = expert_profile_res.scalars().first()
    if not expert_profile:
        raise ValueError("Эксперт не найден или не одобрен.")

    existing_vote_res = await db.execute(
        select(Vote).filter(
            Vote.voter_vk_id == vote_data.voter_vk_id,
            Vote.expert_vk_id == expert_vk_id,
            Vote.is_expert_vote.is_(False),
        )
    )
    if existing_vote_res.scalars().first():
        raise ValueError(
            "Вы уже голосовали за этого эксперта. Вы можете отменить свой голос в профиле."
        )

    db_vote = Vote(
        voter_vk_id=vote_data.voter_vk_id,
        expert_vk_id=expert_vk_id,
        event_id=None,
        is_expert_vote=False,
        vote_type=vote_data.vote_type,
        comment_positive=vote_data.comment_positive,
        comment_negative=vote_data.comment_negative,
    )
    db.add(db_vote)
    await db.commit()
    await db.refresh(db_vote)

    expert_name = f"{expert_profile.user.first_name} {expert_profile.user.last_name}"
    await notifier.send_vote_action_notification(
        user_vk_id=vote_data.voter_vk_id,
        expert_name=expert_name,
        expert_vk_id=expert_vk_id,
        action="submitted",
        vote_type=vote_data.vote_type,
    )
    return db_vote


async def delete_community_vote(
    db: AsyncSession, expert_vk_id: int, voter_vk_id: int
) -> bool:
    query = select(Vote).where(
        Vote.voter_vk_id == voter_vk_id,
        Vote.expert_vk_id == expert_vk_id,
        Vote.is_expert_vote.is_(False),
    )
    result = await db.execute(query)
    vote_to_delete = result.scalars().first()

    if vote_to_delete:
        await db.delete(vote_to_delete)
        await db.commit()
        return True
    return False


async def get_user_vote_for_expert(
    db: AsyncSession, expert_vk_id: int, voter_vk_id: int
) -> Optional[UserVoteInfo]:
    if not voter_vk_id:
        return None
    query = select(Vote).where(
        and_(
            Vote.expert_vk_id == expert_vk_id,
            Vote.voter_vk_id == voter_vk_id,
            Vote.is_expert_vote.is_(False),
        )
    )
    result = await db.execute(query)
    vote = result.scalars().first()
    if not vote:
        return None
    comment = (
        vote.comment_positive if vote.vote_type == "trust" else vote.comment_negative
    )
    return UserVoteInfo(vote_type=vote.vote_type, comment=comment)  # type: ignore


async def update_user_settings(
    db: AsyncSession, vk_id: int, settings_data: UserSettingsUpdate
) -> User | ExpertProfile | None:
    update_data = settings_data.model_dump(exclude_unset=True)
    object_to_return = None

    if "show_community_rating" in update_data:
        result = await db.execute(
            select(ExpertProfile).filter(ExpertProfile.user_vk_id == vk_id)
        )
        db_profile = result.scalars().first()
        if not db_profile:
            raise ValueError("Expert profile not found.")

        db_profile.show_community_rating = update_data["show_community_rating"]
        object_to_return = db_profile

    if "allow_notifications" in update_data or "allow_expert_mailings" in update_data:
        result = await db.execute(select(User).filter(User.vk_id == vk_id))
        db_user = result.scalars().first()
        if not db_user:
            logger.error(f"User {vk_id}: User object not found for update.")
            raise ValueError("User not found.")

        if "allow_notifications" in update_data:
            db_user.allow_notifications = update_data["allow_notifications"]
        if "allow_expert_mailings" in update_data:
            db_user.allow_expert_mailings = update_data["allow_expert_mailings"]

        if not object_to_return:
            object_to_return = db_user

    if object_to_return:
        await db.commit()
        await db.refresh(object_to_return)
        return object_to_return

    return None


async def withdraw_expert_request(db: AsyncSession, vk_id: int) -> bool:
    result = await db.execute(
        select(ExpertProfile).filter(
            ExpertProfile.user_vk_id == vk_id, ExpertProfile.status == "pending"
        )
    )
    db_profile = result.scalars().first()
    if db_profile:
        await db.delete(db_profile)
        await db.commit()
        logger.info(f"Expert request for user {vk_id} has been withdrawn.")
        return True
    logger.warning(f"No pending request found for user {vk_id} to withdraw.")
    return False


async def get_user_votes(db: AsyncSession, vk_id: int) -> list[Vote]:
    query = (
        select(Vote)
        .where(Vote.voter_vk_id == vk_id)
        .options(
            selectinload(Vote.expert).selectinload(ExpertProfile.user),
            selectinload(Vote.event)
            .selectinload(Event.expert)
            .selectinload(ExpertProfile.user),
        )
        .order_by(Vote.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()
