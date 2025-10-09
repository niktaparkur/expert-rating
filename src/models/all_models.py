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
    registration_date = Column(TIMESTAMP, server_default=func.now())
    is_expert = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)


class Event(Base):
    __tablename__ = "Events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    expert_id = Column(
        BigInteger, ForeignKey("ExpertProfiles.user_vk_id", ondelete="CASCADE")
    )
    promo_word = Column(String(100), unique=True)
    event_name = Column(String(255))
    event_link = Column(Text, nullable=True)
    start_date = Column(TIMESTAMP)
    duration_minutes = Column(Integer)
    event_date = Column(TIMESTAMP, nullable=False)
    status = Column(Enum("pending", "approved", "rejected"), default="pending")
    rejection_reason = Column(Text)
    show_contacts = Column(Boolean)
    is_private = Column(Boolean, default=False, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())


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
    created_at = Column(TIMESTAMP, server_default=func.now())


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
    tariff_expiry_date = Column(TIMESTAMP)
    show_contacts_default = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    show_community_rating = Column(Boolean, nullable=False, server_default="1")

    selected_themes = relationship(
        "Theme", secondary="ExpertSelectedThemes", back_populates="experts"
    )


Theme.experts = relationship(
    "ExpertProfile", secondary="ExpertSelectedThemes", back_populates="selected_themes"
)
