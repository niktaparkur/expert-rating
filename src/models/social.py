from sqlalchemy import Column, BigInteger, Integer, Text, TIMESTAMP, func, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


class ExpertRating(Base):
    """
    Текущее состояние рейтинга (Стейт).
    Один пользователь - один голос за одного эксперта.
    Здесь хранится только ПОСЛЕДНЕЕ актуальное решение.
    """

    __tablename__ = "expert_ratings"

    expert_id = Column(
        BigInteger,
        ForeignKey("expert_profiles.user_vk_id", ondelete="CASCADE"),
        primary_key=True,
    )
    voter_id = Column(
        BigInteger, ForeignKey("users.vk_id", ondelete="CASCADE"), primary_key=True
    )

    # 1 = Trust, -1 = Distrust, 0 = Neutral (снял голос / воздержался)
    # Используем Integer для удобства суммирования в SQL
    vote_value = Column(Integer, nullable=False, default=0)

    updated_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class EventFeedback(Base):
    """
    История (Лог) взаимодействий.
    Сюда пишется каждый факт оставления отзыва на мероприятии.
    Это отображается в "Мои голоса".
    """

    __tablename__ = "event_feedbacks"

    id = Column(Integer, primary_key=True, autoincrement=True)

    expert_id = Column(
        BigInteger, ForeignKey("expert_profiles.user_vk_id", ondelete="CASCADE")
    )
    voter_id = Column(BigInteger, ForeignKey("users.vk_id", ondelete="CASCADE"))
    event_id = Column(
        Integer, ForeignKey("events.id", ondelete="SET NULL"), nullable=True
    )

    comment = Column(Text, nullable=True)

    # Какой был голос в момент написания этого отзыва/фидбека.
    # 1 = Trust, -1 = Distrust, 0 = Neutral
    rating_snapshot = Column(Integer, nullable=False, default=0)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    expert = relationship("ExpertProfile")
    event = relationship("Event")
