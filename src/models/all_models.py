from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    TIMESTAMP,
    Boolean,
    ForeignKey,
    BigInteger,
    Enum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base


class User(Base):
    __tablename__ = "Users"
    vk_id = Column(BigInteger, primary_key=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    photo_url = Column(Text)
    registration_date = Column(TIMESTAMP(timezone=True), server_default=func.now())
    is_expert = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)

    allow_notifications = Column(
        Boolean, default=True, nullable=False, server_default="1"
    )
    allow_expert_mailings = Column(
        Boolean, default=True, nullable=False, server_default="1"
    )

    expert_profile = relationship(
        "ExpertProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Event(Base):
    __tablename__ = "Events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    expert_id = Column(
        BigInteger, ForeignKey("ExpertProfiles.user_vk_id", ondelete="CASCADE")
    )
    promo_word = Column(String(100), unique=True)
    event_name = Column(String(128))
    event_link = Column(Text, nullable=True)
    start_date = Column(TIMESTAMP(timezone=True))
    duration_minutes = Column(Integer)
    event_date = Column(TIMESTAMP(timezone=True), nullable=False)
    status = Column(Enum("pending", "approved", "rejected"), default="pending")
    rejection_reason = Column(Text)
    show_contacts = Column(Boolean)
    is_private = Column(Boolean, default=False, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    voter_thank_you_message = Column(Text, nullable=True)
    send_reminder = Column(Boolean, default=False, server_default="0", nullable=False)

    expert = relationship("ExpertProfile", back_populates="events")


class Vote(Base):
    __tablename__ = "Votes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    voter_vk_id = Column(BigInteger, ForeignKey("Users.vk_id", ondelete="CASCADE"))
    expert_vk_id = Column(
        BigInteger, ForeignKey("ExpertProfiles.user_vk_id", ondelete="CASCADE")
    )
    event_id = Column(
        Integer, ForeignKey("Events.id", ondelete="SET NULL"), nullable=True
    )
    vote_type = Column(Enum("trust", "distrust"))
    comment_positive = Column(Text)
    comment_negative = Column(Text)
    is_expert_vote = Column(Boolean)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    expert = relationship("ExpertProfile", foreign_keys=[expert_vk_id])
    event = relationship("Event", foreign_keys=[event_id])


class Category(Base):
    __tablename__ = "Categories"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    themes = relationship(
        "Theme", back_populates="category", cascade="all, delete-orphan"
    )


class Theme(Base):
    __tablename__ = "Themes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey("Categories.id"), nullable=False)
    category = relationship("Category", back_populates="themes")


class Region(Base):
    __tablename__ = "Regions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)


class ExpertSelectedThemes(Base):
    __tablename__ = "ExpertSelectedThemes"
    expert_vk_id = Column(
        BigInteger,
        ForeignKey("ExpertProfiles.user_vk_id", ondelete="CASCADE"),
        primary_key=True,
    )
    theme_id = Column(
        Integer, ForeignKey("Themes.id", ondelete="CASCADE"), primary_key=True
    )


class ExpertProfile(Base):
    __tablename__ = "ExpertProfiles"
    user_vk_id = Column(
        BigInteger, ForeignKey("Users.vk_id", ondelete="CASCADE"), primary_key=True
    )
    status = Column(Enum("pending", "approved", "rejected"), default="pending")
    rejection_reason = Column(Text)
    region = Column(String(255))
    social_link = Column(Text)
    regalia = Column(Text)
    performance_link = Column(Text)
    referrer_info = Column(Text)
    tariff_plan = Column(String(50), default="Начальный")
    tariff_expiry_date = Column(TIMESTAMP(timezone=True))
    show_contacts_default = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    show_community_rating = Column(Boolean, nullable=False, server_default="1")
    user = relationship("User", back_populates="expert_profile")
    events = relationship(
        "Event", back_populates="expert", cascade="all, delete-orphan"
    )
    selected_themes = relationship(
        "Theme", secondary="ExpertSelectedThemes", back_populates="experts"
    )


class PromoCode(Base):
    __tablename__ = "PromoCodes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_percent = Column(Integer, nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    activations_limit = Column(Integer, nullable=True)
    user_activations_limit = Column(Integer, nullable=False, default=1)

    activations = relationship(
        "PromoCodeActivation", back_populates="promo_code", cascade="all, delete-orphan"
    )


class PromoCodeActivation(Base):
    __tablename__ = "PromoCodeActivations"
    id = Column(Integer, primary_key=True, autoincrement=True)
    promo_code_id = Column(
        Integer, ForeignKey("PromoCodes.id", ondelete="CASCADE"), nullable=False
    )
    user_vk_id = Column(
        BigInteger, ForeignKey("Users.vk_id", ondelete="CASCADE"), nullable=False
    )
    activated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    promo_code = relationship("PromoCode", back_populates="activations")
    user = relationship("User")


Theme.experts = relationship(
    "ExpertProfile", secondary="ExpertSelectedThemes", back_populates="selected_themes"
)
