from typing import Optional

import redis.asyncio as redis
from loguru import logger
from sqlalchemy import func, and_, case, or_, String, desc, literal_column
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from src.models import (
    Event,
    ExpertProfile,
    Theme,
    User,
    ExpertRating,
    ExpertUpdateRequest,
    EventFeedback,
)
from src.schemas.expert_schemas import (
    CommunityVoteCreate,
    ExpertCreate,
    UserCreate,
    UserSettingsUpdate,
    UserVoteInfo,
    ExpertProfileUpdate,
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

    # НОВАЯ ЛОГИКА ПОДСЧЕТА (ExpertRating)
    # Считаем сумму vote_value (1, 0, -1)

    # 1. Рейтинг эксперта (как его оценили другие)
    rating_query = select(
        func.sum(case((ExpertRating.vote_value == 1, 1), else_=0)).label("trust"),
        func.sum(case((ExpertRating.vote_value == -1, 1), else_=0)).label("distrust"),
    ).where(ExpertRating.expert_id == vk_id)

    rating_res = await db.execute(rating_query)
    rating_counts = rating_res.first()

    trust_count = int(rating_counts.trust or 0)
    distrust_count = int(rating_counts.distrust or 0)
    total_rating = trust_count - distrust_count

    # Events count
    events_query = select(func.count(Event.id)).where(
        Event.expert_id == vk_id, Event.status == "approved"
    )
    events_res = await db.execute(events_query)
    events_count = events_res.scalar_one_or_none() or 0

    stats = {
        "expert": total_rating,  # Теперь общий рейтинг
        "community": 0,  # "Народный" и "Экспертный" теперь объединены в один общий ExpertRating
        "expert_trust": trust_count,
        "expert_distrust": distrust_count,
        "community_trust": 0,
        "community_distrust": 0,
        "events_count": events_count,
    }

    # 2. Как голосовал САМ пользователь (My Votes)
    my_votes_query = select(
        func.sum(case((ExpertRating.vote_value == 1, 1), else_=0)).label("trust"),
        func.sum(case((ExpertRating.vote_value == -1, 1), else_=0)).label("distrust"),
    ).where(ExpertRating.voter_id == vk_id)

    my_votes_res = await db.execute(my_votes_query)
    my_votes_counts = my_votes_res.first()
    my_votes_stats = {
        "trust": int(my_votes_counts.trust or 0),
        "distrust": int(my_votes_counts.distrust or 0),
    }

    return tuple(user_profile_tuple) + (stats, my_votes_stats)


async def update_user_regalia(db: AsyncSession, vk_id: int, regalia: str) -> bool:
    result = await db.execute(
        select(ExpertProfile).filter(ExpertProfile.user_vk_id == vk_id)
    )
    db_profile = result.scalars().first()
    if not db_profile:
        return False

    db_profile.regalia = regalia
    await db.commit()
    return True


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
    # НОВАЯ ЛОГИКА ТОПА: ExpertRating
    # Суммируем vote_value
    votes_subquery = (
        select(
            ExpertRating.expert_id,
            func.sum(ExpertRating.vote_value).label("rating_score"),
        )
        .group_by(ExpertRating.expert_id)
        .subquery()
    )

    total_score_expr = func.coalesce(votes_subquery.c.rating_score, 0)

    base_query = (
        select(
            ExpertProfile.user_vk_id,
            User.first_name,
            User.last_name,
            total_score_expr.label("total_expert_score"),
            literal_column("0").label(
                "total_community_score"
            ),  # Заглушка для совместимости со схемой
        )
        .join(User, ExpertProfile.user_vk_id == User.vk_id)
        .outerjoin(
            votes_subquery, ExpertProfile.user_vk_id == votes_subquery.c.expert_id
        )
        .where(ExpertProfile.status == "approved")
    )

    if region:
        base_query = base_query.where(ExpertProfile.region == region)

    if category_id:
        base_query = base_query.join(ExpertProfile.selected_themes).where(
            Theme.category_id == category_id
        )

    rank_column = (
        func.row_number()
        .over(
            order_by=[
                desc(total_score_expr),
                User.vk_id.asc(),
            ]
        )
        .label("rank")
    )

    ranked_cte = base_query.add_columns(rank_column).cte("ranked_experts")

    final_query = select(ranked_cte.c.user_vk_id, ranked_cte.c.rank)

    if search_query:
        search_term = f"%{search_query.lower()}%"
        final_query = final_query.where(
            or_(
                func.lower(ranked_cte.c.first_name).like(search_term),
                func.lower(ranked_cte.c.last_name).like(search_term),
            )
        )

    count_query = select(func.count()).select_from(final_query.subquery())
    total_count = (await db.execute(count_query)).scalar_one()

    final_query = final_query.order_by(ranked_cte.c.rank.asc())
    final_query = final_query.offset((page - 1) * size).limit(size)

    ranked_results = (await db.execute(final_query)).all()

    if not ranked_results:
        return [], 0

    ranks_map = {row.user_vk_id: row.rank for row in ranked_results}
    target_ids = list(ranks_map.keys())

    profiles_data = []

    for vk_id in target_ids:
        full_data = await get_full_user_profile_with_stats(db, vk_id)
        if full_data:
            user_obj, profile_obj, stats_dict, my_votes_stats = full_data

            topics = []
            if profile_obj and profile_obj.selected_themes:
                topics = [
                    f"{t.category.name} > {t.name}" for t in profile_obj.selected_themes
                ]

            rank = ranks_map[vk_id]
            profiles_data.append((user_obj, profile_obj, stats_dict, topics, rank))

    return profiles_data, total_count


async def update_expert_tariff(db: AsyncSession, vk_id: int, tariff_name: str) -> bool:
    # ТЕПЕРЬ ТАРИФ ОПРЕДЕЛЯЕТСЯ АВТОМАТИЧЕСКИ ПО ПОДПИСКЕ
    # Эта функция больше не нужна в старом виде, но оставим заглушку
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
    voter_vk_id: int,
    notifier: Notifier,
):
    # НОВАЯ ЛОГИКА: Upsert в ExpertRating + запись в EventFeedback (без ивента)

    # 1. Проверяем эксперта
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

    # 2. Определяем значение голоса
    vote_val = 1 if vote_data.vote_type == "trust" else -1

    # 3. Обновляем или создаем рейтинг (ExpertRating)
    rating_query = select(ExpertRating).filter(
        ExpertRating.expert_id == expert_vk_id, ExpertRating.voter_id == voter_vk_id
    )
    rating_res = await db.execute(rating_query)
    existing_rating = rating_res.scalars().first()

    if existing_rating:
        if existing_rating.vote_value == vote_val:
            raise ValueError("Вы уже оставили такой голос.")
        existing_rating.vote_value = vote_val
    else:
        new_rating = ExpertRating(
            expert_id=expert_vk_id, voter_id=voter_vk_id, vote_value=vote_val
        )
        db.add(new_rating)

    # 4. Пишем в историю (EventFeedback) - это "Народный" (event_id=None)
    # В EventFeedbacks мы храним комменты
    comment = (
        vote_data.comment_positive if vote_val == 1 else vote_data.comment_negative
    )

    feedback = EventFeedback(  # Импортировать модель!
        expert_id=expert_vk_id,
        voter_id=voter_vk_id,
        event_id=None,
        comment=comment,
        rating_snapshot=vote_val,
    )
    db.add(feedback)

    await db.commit()

    expert_name = f"{expert_profile.user.first_name} {expert_profile.user.last_name}"
    await notifier.send_vote_action_notification(
        user_vk_id=voter_vk_id,
        expert_name=expert_name,
        expert_vk_id=expert_vk_id,
        action="submitted",
        vote_type=vote_data.vote_type,
    )
    return feedback


async def delete_community_vote(
    db: AsyncSession, expert_vk_id: int, voter_vk_id: int
) -> bool:
    # Удаляем из ExpertRating (обнуляем влияние на рейтинг)
    query = select(ExpertRating).where(
        ExpertRating.voter_id == voter_vk_id, ExpertRating.expert_id == expert_vk_id
    )
    result = await db.execute(query)
    rating = result.scalars().first()

    if rating:
        await db.delete(rating)
        # В историю можно добавить запись о снятии голоса, если нужно
        await db.commit()
        return True
    return False


async def get_user_vote_for_expert(
    db: AsyncSession, expert_vk_id: int, voter_vk_id: int
) -> Optional[UserVoteInfo]:
    if not voter_vk_id:
        return None
    # Ищем в ExpertRating
    query = select(ExpertRating).where(
        and_(
            ExpertRating.expert_id == expert_vk_id, ExpertRating.voter_id == voter_vk_id
        )
    )
    result = await db.execute(query)
    rating = result.scalars().first()

    if not rating:
        return None

    vote_type = "trust" if rating.vote_value == 1 else "distrust"

    # Комментарий берем из ПОСЛЕДНЕГО отзыва
    feedback_query = (
        select(EventFeedback)
        .where(
            EventFeedback.expert_id == expert_vk_id,
            EventFeedback.voter_id == voter_vk_id,
        )
        .order_by(EventFeedback.created_at.desc())
    )

    feedback_res = await db.execute(feedback_query)
    last_feedback = feedback_res.scalars().first()

    comment = last_feedback.comment if last_feedback else None

    return UserVoteInfo(vote_type=vote_type, comment=comment)


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


async def get_user_votes(
    db: AsyncSession, vk_id: int
) -> list[ExpertRating]:  # Временно возвращаем Rating, но лучше Feedback
    # Возвращаем историю отзывов
    query = (
        select(EventFeedback)  # <-- NEW MODEL
        .where(EventFeedback.voter_id == vk_id)
        .options(
            selectinload(EventFeedback.expert).selectinload(ExpertProfile.user),
            selectinload(EventFeedback.event)
            .selectinload(Event.expert)
            .selectinload(ExpertProfile.user),
        )
        .order_by(EventFeedback.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


async def update_user_email(db: AsyncSession, vk_id: int, email: str) -> Optional[User]:
    result = await db.execute(select(User).filter(User.vk_id == vk_id))
    db_user = result.scalars().first()
    if db_user:
        db_user.email = email
        await db.commit()
        await db.refresh(db_user)
        return db_user
    return None


async def create_profile_update_request(
    db: AsyncSession, vk_id: int, update_data: ExpertProfileUpdate
) -> ExpertUpdateRequest:
    existing_request = await db.execute(
        select(ExpertUpdateRequest).filter(
            ExpertUpdateRequest.expert_vk_id == vk_id,
            ExpertUpdateRequest.status == "pending",
        )
    )
    request_obj = existing_request.scalars().first()

    json_data = update_data.model_dump(mode="json")

    if request_obj:
        request_obj.new_data = json_data
        request_obj.created_at = func.now()
    else:
        request_obj = ExpertUpdateRequest(
            expert_vk_id=vk_id, new_data=json_data, status="pending"
        )
        db.add(request_obj)

    await db.commit()
    await db.refresh(request_obj)
    return request_obj


async def get_pending_update_requests(db: AsyncSession):
    query = (
        select(ExpertUpdateRequest)
        .where(ExpertUpdateRequest.status == "pending")
        .options(
            selectinload(ExpertUpdateRequest.expert).selectinload(ExpertProfile.user),
            selectinload(ExpertUpdateRequest.expert)
            .selectinload(ExpertProfile.selected_themes)
            .selectinload(Theme.category),
        )
        .order_by(ExpertUpdateRequest.created_at.asc())
    )
    result = await db.execute(query)
    return result.scalars().all()


async def process_update_request(
    db: AsyncSession, request_id: int, action: str, admin_comment: str = None
):
    request = await db.get(ExpertUpdateRequest, request_id)
    if not request:
        return None

    request.status = "approved" if action == "approve" else "rejected"
    request.admin_comment = admin_comment

    if action == "approve":
        profile = await db.get(ExpertProfile, request.expert_vk_id)
        if profile:
            new_data = request.new_data
            if "region" in new_data:
                profile.region = new_data["region"]
            if "social_link" in new_data:
                profile.social_link = new_data["social_link"]
            if "regalia" in new_data:
                profile.regalia = new_data["regalia"]

    await db.commit()
    await db.refresh(request)
    return request
