from sqlalchemy import (
    Column,
    BigInteger,
    String,
    Text,
    TIMESTAMP,
    Boolean,
    func,
    Integer,
    ForeignKey,
    Enum,
    JSON,
)
from sqlalchemy.orm import relationship
from .base import Base


class ExpertProfile(Base):
    __tablename__ = "expert_profiles"

    user_vk_id = Column(
        BigInteger, ForeignKey("users.vk_id", ondelete="CASCADE"), primary_key=True
    )

    status = Column(Enum("pending", "approved", "rejected"), default="pending")
    rejection_reason = Column(Text, nullable=True)

    region = Column(String(255))
    social_link = Column(Text)
    regalia = Column(Text)
    performance_link = Column(Text)
    referrer_info = Column(Text)

    # Показывать ли народный рейтинг в профиле
    show_community_rating = Column(Boolean, default=True, server_default="1")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Связи
    user = relationship("User", back_populates="expert_profile")
    events = relationship(
        "Event", back_populates="expert", cascade="all, delete-orphan"
    )
    selected_themes = relationship(
        "Theme", secondary="expert_themes", back_populates="experts"
    )


class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    themes = relationship(
        "Theme", back_populates="category", cascade="all, delete-orphan"
    )


class Theme(Base):
    __tablename__ = "themes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    category_id = Column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )

    category = relationship("Category", back_populates="themes")
    experts = relationship(
        "ExpertProfile", secondary="expert_themes", back_populates="selected_themes"
    )


class ExpertSelectedThemes(Base):
    __tablename__ = "expert_themes"
    expert_vk_id = Column(
        BigInteger,
        ForeignKey("expert_profiles.user_vk_id", ondelete="CASCADE"),
        primary_key=True,
    )
    theme_id = Column(
        Integer, ForeignKey("themes.id", ondelete="CASCADE"), primary_key=True
    )


class ExpertUpdateRequest(Base):
    __tablename__ = "expert_update_requests"
    id = Column(Integer, primary_key=True, autoincrement=True)
    expert_vk_id = Column(
        BigInteger, ForeignKey("expert_profiles.user_vk_id", ondelete="CASCADE")
    )

    new_data = Column(JSON, nullable=False)
    status = Column(Enum("pending", "approved", "rejected"), default="pending")
    admin_comment = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    expert = relationship("ExpertProfile")
