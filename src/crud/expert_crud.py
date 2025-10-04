from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from src.models.all_models import User, ExpertProfile, ExpertTopic
from src.schemas.expert_schemas import ExpertCreate


async def create_expert_request(db: AsyncSession, expert_data: ExpertCreate) -> User:
    """Создает пользователя (если его нет) и заявку на становление экспертом."""
    # 1. Проверяем, есть ли уже такой пользователь. Если нет - создаем.
    user_result = await db.execute(
        select(User).filter(User.vk_id == expert_data.user_data.vk_id)
    )
    db_user = user_result.scalars().first()

    if not db_user:
        db_user = User(**expert_data.user_data.model_dump())
        db.add(db_user)
        await db.flush()

    # 2. Создаем профиль эксперта. Проверяем, не подавал ли он заявку ранее.
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

    # 3. Добавляем темы экспертизы
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
        .options(
            selectinload(ExpertProfile.topics)
        )  # Эффективно подгружаем связанные темы
    )
    results = await db.execute(query)

    expert_requests = []
    for user, profile in results.all():
        expert_data = user.__dict__
        expert_data.update(profile.__dict__)
        expert_data["topics"] = [topic.topic_name for topic in profile.topics]
        expert_requests.append(expert_data)

    return expert_requests


async def set_expert_status(db: AsyncSession, vk_id: int, status: str) -> ExpertProfile:
    """Устанавливает статус профиля эксперта (approved/rejected)."""
    result = await db.execute(
        select(ExpertProfile).filter(ExpertProfile.user_vk_id == vk_id)
    )
    db_profile = result.scalars().first()
    if not db_profile:
        return None

    db_profile.status = status
    # Также обновляем флаг is_expert у самого пользователя
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
    )
    results = await db.execute(query)
    return results.all()


async def get_user_with_profile_by_vk_id(db: AsyncSession, vk_id: int):
    """Получает одного конкретного пользователя с его профилем."""
    query = (
        select(User, ExpertProfile)
        .outerjoin(ExpertProfile, User.vk_id == ExpertProfile.user_vk_id)
        .filter(User.vk_id == vk_id)
    )
    result = await db.execute(query)
    return result.first()
