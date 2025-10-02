from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.all_models import User, ExpertProfile, ExpertTopic
from app.schemas.expert_schemas import ExpertCreate


async def create_expert_request(db: AsyncSession, expert_data: ExpertCreate) -> User:
    # 1. Проверяем, есть ли уже такой пользователь. Если нет - создаем.
    user_result = await db.execute(
        select(User).filter(User.vk_id == expert_data.user_data.vk_id)
    )
    db_user = user_result.scalars().first()

    if not db_user:
        db_user = User(**expert_data.user_data.model_dump())
        db.add(db_user)
        await db.flush()  # Получаем ID пользователя до коммита

    # 2. Создаем профиль эксперта. Проверяем, не подавал ли он заявку ранее.
    profile_result = await db.execute(
        select(ExpertProfile).filter(ExpertProfile.user_vk_id == db_user.vk_id)
    )
    db_profile = profile_result.scalars().first()
    if db_profile:
        # В MVP просто вернем ошибку или обновим заявку. Пока вернем пользователя.
        return db_user

    db_profile = ExpertProfile(
        user_vk_id=db_user.vk_id,
        **expert_data.profile_data.model_dump(exclude={"topics"}, by_alias=True)
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
    # Здесь более сложный запрос, чтобы собрать все данные
    query = (
        select(User, ExpertProfile)
        .join(ExpertProfile, User.vk_id == ExpertProfile.user_vk_id)
        .filter(ExpertProfile.status == "pending")
    )
    results = await db.execute(query)

    expert_requests = []
    for user, profile in results.all():
        # Получаем темы для каждого эксперта
        topics_result = await db.execute(
            select(ExpertTopic.topic_name).filter(ExpertTopic.expert_id == user.vk_id)
        )
        topics = topics_result.scalars().all()

        # Собираем данные в одну структуру для Pydantic
        expert_data = user.__dict__
        expert_data.update(profile.__dict__)
        expert_data["topics"] = topics
        expert_requests.append(expert_data)

    return expert_requests


async def set_expert_status(db: AsyncSession, vk_id: int, status: str) -> ExpertProfile:
    result = await db.execute(
        select(ExpertProfile).filter(ExpertProfile.user_vk_id == vk_id)
    )
    db_profile = result.scalars().first()
    if not db_profile:
        return None  # Эксперт не найден

    db_profile.status = status
    await db.commit()
    await db.refresh(db_profile)
    return db_profile
