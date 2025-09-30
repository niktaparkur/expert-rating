from sqlalchemy import (Column, Integer, String, Text, TIMESTAMP, Boolean,
                        ForeignKey, BigInteger, Enum)
from sqlalchemy.sql import func
from .base import Base

class User(Base):
    __tablename__ = 'Users'
    vk_id = Column(BigInteger, primary_key=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    photo_url = Column(Text)
    registration_date = Column(TIMESTAMP, server_default=func.now())
    is_expert = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)

class ExpertProfile(Base):
    __tablename__ = 'ExpertProfiles'
    user_vk_id = Column(BigInteger, ForeignKey('Users.vk_id', ondelete='CASCADE'), primary_key=True)
    status = Column(Enum('pending', 'approved', 'rejected'), default='pending')
    rejection_reason = Column(Text)
    region = Column(String(255))
    social_link = Column(Text)
    regalia = Column(Text)
    performance_link = Column(Text)
    referrer_info = Column(Text)
    tariff_plan = Column(String(50), default='Начальный')
    tariff_expiry_date = Column(TIMESTAMP)
    show_contacts_default = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

class ExpertTopic(Base):
    __tablename__ = 'ExpertTopics'
    id = Column(Integer, primary_key=True, autoincrement=True)
    expert_id = Column(BigInteger, ForeignKey('ExpertProfiles.user_vk_id', ondelete='CASCADE'))
    topic_name = Column(String(255))

class Event(Base):
    __tablename__ = 'Events'
    id = Column(Integer, primary_key=True, autoincrement=True)
    expert_id = Column(BigInteger, ForeignKey('ExpertProfiles.user_vk_id', ondelete='CASCADE'))
    promo_word = Column(String(100), unique=True)
    event_name = Column(String(255))
    start_date = Column(TIMESTAMP)
    duration_minutes = Column(Integer)
    status = Column(Enum('pending', 'approved', 'rejected'), default='pending')
    rejection_reason = Column(Text)
    show_contacts = Column(Boolean)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Vote(Base):
    __tablename__ = 'Votes'
    id = Column(Integer, primary_key=True, autoincrement=True)
    voter_vk_id = Column(BigInteger, ForeignKey('Users.vk_id', ondelete='CASCADE'))
    expert_vk_id = Column(BigInteger, ForeignKey('ExpertProfiles.user_vk_id', ondelete='CASCADE'))
    event_id = Column(Integer, ForeignKey('Events.id', ondelete='SET NULL'), nullable=True)
    vote_type = Column(Enum('trust', 'distrust'))
    comment_positive = Column(Text)
    comment_negative = Column(Text)
    is_expert_vote = Column(Boolean)
    created_at = Column(TIMESTAMP, server_default=func.now())