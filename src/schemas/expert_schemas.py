from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional
from datetime import datetime


# --- Вложенная схема для Статистики ---
class Stats(BaseModel):
    expert: int = 0
    narodny: int = 0
    meropriyatiy: int = 0


# --- Схемы для Пользователей ---
class UserBase(BaseModel):
    vk_id: int = Field(..., gt=0)
    first_name: str
    last_name: str
    photo_url: HttpUrl


class UserCreate(UserBase):
    pass


# --- Финальная схема для отображения пользователя/эксперта ---
class UserAdminRead(UserBase):
    registration_date: datetime
    is_expert: bool
    status: Optional[str] = None
    stats: Stats = Field(default_factory=Stats)
    topics: List[str] = [] # <-- ИСПРАВЛЕНИЕ: Добавляем поле для тем

    class Config:
        from_attributes = True


# --- Схемы для Профиля Эксперта ---
class ExpertProfileBase(BaseModel):
    topics: List[str]
    region: str
    social_link: HttpUrl
    regalia: str
    performance_link: HttpUrl
    referrer: Optional[str] = Field(None, alias="referrer_info")


class ExpertCreate(BaseModel):
    user_data: UserCreate
    profile_data: ExpertProfileBase


# Схема для отображения заявки в админке
class ExpertRequestRead(BaseModel):
    # Данные из User
    vk_id: int
    first_name: str
    last_name: str
    photo_url: HttpUrl

    # Данные из ExpertProfile
    regalia: str
    social_link: HttpUrl
    performance_link: HttpUrl
    region: str
    topics: List[str]

    class Config:
        from_attributes = True


# --- Схемы для Голосования ---
class NarodVoteCreate(BaseModel):
    voter_vk_id: int
    vote_type: str  # 'trust' or 'distrust'
    comment_positive: Optional[str] = None
    comment_negative: Optional[str] = None