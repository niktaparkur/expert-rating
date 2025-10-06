from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from datetime import datetime, timedelta, timezone

from src.models.all_models import User, ExpertProfile, ExpertTopic, Event, Vote
from src.schemas.expert_schemas import ExpertCreate, UserCreate, NarodVoteCreate


async def create_expert_request(db: AsyncSession, expert_data: ExpertCreate) -> User:
    """Создает пользователя (если его нет) и заявку на становление экспертом."""
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
    db_profile = profile_result.scalars().first()
    if db_profile:
        raise ValueError("Вы уже подавали заявку или являетесь экспертом.")

    db_profile = ExpertProfile(
        user_vk_id=db_user.vk_id,
        **expert_data.profile_data.model_dump(exclude={"topics"}, by_alias=True),
    )
    db.add(db_profile)

    for topic_name in expert_data.profile_data.topics:
        db_topic = ExpertTopic(expert_id=db_user.vk_id, topic_name=topic_name)
        db.add(db_topic)

    await db.commit()
    await db.refresh(db_user)
    return db_user


async def get_pending_experts(db: AsyncSession):
    """Получает список заявок на регистрацию для админки."""
    query = (
        select(User, ExpertProfile)
        .join(ExpertProfile, User.vk_id == ExpertProfile.user_vk_id)
        .filter(ExpertProfile.status == "pending")
        .options(selectinload(ExpertProfile.topics))
    )
    results = await db.execute(query)
    return results.all()


async def set_expert_status(db: AsyncSession, vk_id: int, status: str) -> ExpertProfile:
    """Устанавливает статус профиля эксперта (approved/rejected)."""
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


async def get_all_users_with_profiles(db: AsyncSession):
    """Получает ВСЕХ пользователей с их профилями (если есть) для админки."""
    query = (
        select(User, ExpertProfile)
        .outerjoin(ExpertProfile, User.vk_id == ExpertProfile.user_vk_id)
        .order_by(User.registration_date.desc())
    )
    results = await db.execute(query)
    return results.all()


async def delete_user_by_vk_id(db: AsyncSession, vk_id: int) -> bool:
    """Полностью удаляет пользователя и все связанные с ним данные."""
    result = await db.execute(select(User).filter(User.vk_id == vk_id))
    db_user = result.scalars().first()
    if db_user:
        await db.delete(db_user)
        await db.commit()
        return True
    return False


async def get_experts_by_status(db: AsyncSession, status: str):
    """Получает список экспертов по заданному статусу (например, 'approved')."""
    query = (
        select(User, ExpertProfile)
        .join(ExpertProfile, User.vk_id == ExpertProfile.user_vk_id)
        .filter(ExpertProfile.status == status)
        .options(selectinload(ExpertProfile.topics))
    )
    results = await db.execute(query)
    users_with_profiles = results.all()

    experts_with_stats = []
    for user, profile in users_with_profiles:
        full_expert_data = await get_user_with_profile_by_vk_id(db, vk_id=user.vk_id)
        if full_expert_data:
            user_obj, profile_obj, stats_dict = full_expert_data
            topics = [topic.topic_name for topic in profile.topics]
            experts_with_stats.append((user_obj, profile_obj, stats_dict, topics))

    return experts_with_stats


async def get_user_with_profile_by_vk_id(db: AsyncSession, vk_id: int):
    """Получает одного пользователя с профилем и ПОДСЧИТЫВАЕТ СТАТИСТИКУ."""
    query = (
        select(User, ExpertProfile)
        .outerjoin(ExpertProfile, User.vk_id == ExpertProfile.user_vk_id)
        .filter(User.vk_id == vk_id)
        .options(
            selectinload(ExpertProfile.topics)
        )  # <-- ИСПРАВЛЕНИЕ: Добавляем загрузку тем
    )
    result = await db.execute(query)
    user_profile_tuple = result.first()
    if not user_profile_tuple:
        return None

    # ... (код подсчета статистики остается без изменений) ...
    narodny_query = select(func.count(Vote.id)).where(
        Vote.expert_vk_id == vk_id,
        Vote.is_expert_vote.is_(False),
        Vote.vote_type == "trust",
    )
    narodny_res = await db.execute(narodny_query)
    narodny_count = narodny_res.scalar_one_or_none() or 0

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
        "narodny": narodny_count,
        "expert": expert_count,
        "meropriyatiy": events_count,
    }

    return tuple(user_profile_tuple) + (stats,)


async def update_expert_tariff(db: AsyncSession, vk_id: int, tariff_name: str) -> bool:
    """Обновляет тариф эксперта."""
    result = await db.execute(
        select(ExpertProfile).filter(ExpertProfile.user_vk_id == vk_id)
    )
    db_profile = result.scalars().first()

    if not db_profile:
        return False

    if tariff_name == "tariff_standard":
        db_profile.tariff_plan = "Стандарт"
    elif tariff_name == "tariff_pro":
        db_profile.tariff_plan = "Профи"
    else:
        return False

    db_profile.tariff_expiry_date = datetime.now(timezone.utc) + timedelta(days=30)

    await db.commit()
    return True


async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
    """Создает нового пользователя в базе данных."""
    result = await db.execute(select(User).filter(User.vk_id == user_data.vk_id))
    if result.scalars().first():
        raise ValueError("User with this VK ID already exists.")

    db_user = User(**user_data.model_dump())
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


async def create_narod_vote(db: AsyncSession, vk_id: int, vote_data: NarodVoteCreate):
    """Создает 'народный' голос за эксперта."""
    expert_profile_res = await db.execute(
        select(ExpertProfile).filter(
            ExpertProfile.user_vk_id == vk_id, ExpertProfile.status == "approved"
        )
    )
    if not expert_profile_res.scalars().first():
        raise ValueError("Expert not found or not approved.")

    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    existing_vote_res = await db.execute(
        select(Vote).filter(
            Vote.voter_vk_id == vote_data.voter_vk_id,
            Vote.expert_vk_id == vk_id,
            Vote.is_expert_vote.is_(False),
            Vote.created_at >= twenty_four_hours_ago,
        )
    )
    if existing_vote_res.scalars().first():
        raise ValueError("You can vote for this expert only once every 24 hours.")

    db_vote = Vote(
        voter_vk_id=vote_data.voter_vk_id,
        expert_vk_id=vk_id,
        event_id=None,
        is_expert_vote=False,
        vote_type=vote_data.vote_type,
        comment_positive=vote_data.comment_positive,
        comment_negative=vote_data.comment_negative,
    )
    db.add(db_vote)
    await db.commit()
    await db.refresh(db_vote)
    return db_vote
