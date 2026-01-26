from sqlalchemy import (
    Column,
    BigInteger,
    String,
    Text,
    TIMESTAMP,
    Boolean,
    func,
    Integer,
)
from sqlalchemy.orm import relationship
from .base import Base


class User(Base):
    __tablename__ = "users"

    # VK ID не автоинкремент, мы получаем его от VK
    vk_id = Column(BigInteger, primary_key=True, autoincrement=False)

    first_name = Column(String(255))
    last_name = Column(String(255))
    photo_url = Column(Text)
    email = Column(String(255), unique=True, nullable=True)
    registration_date = Column(TIMESTAMP(timezone=True), server_default=func.now())

    is_expert = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)

    # Настройки уведомлений
    allow_notifications = Column(Boolean, default=False, server_default="0")
    allow_expert_mailings = Column(Boolean, default=True, server_default="1")

    # Связи (используем строки для Lazy Loading и избежания циклических импортов)
    expert_profile = relationship(
        "ExpertProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    subscription = relationship(
        "DonutSubscription",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Region(Base):
    __tablename__ = "regions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
