from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    TIMESTAMP,
    Boolean,
    ForeignKey,
    Enum,
    BigInteger,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    expert_id = Column(
        BigInteger, ForeignKey("expert_profiles.user_vk_id", ondelete="CASCADE")
    )

    name = Column(String(128))
    description = Column(Text, nullable=True)
    promo_word = Column(
        String(100)
    )  # Индекс и уникальность контролируем логикой и Redis

    event_date = Column(TIMESTAMP(timezone=True), nullable=False)
    duration_minutes = Column(Integer)

    status = Column(Enum("pending", "approved", "rejected"), default="pending")
    rejection_reason = Column(Text)

    is_private = Column(Boolean, default=False)
    event_link = Column(Text, nullable=True)

    # Поля для рассылок и уведомлений
    voter_thank_you_message = Column(Text, nullable=True)
    send_reminder = Column(Boolean, default=False, server_default="0")
    reminder_sent = Column(Boolean, default=False, server_default="0")

    wall_post_id = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    expert = relationship("ExpertProfile", back_populates="events")
