from datetime import datetime

from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional


# --- Схемы для Пользователей ---
class UserBase(BaseModel):
    vk_id: int = Field(..., gt=0)
    first_name: str
    last_name: str
    photo_url: HttpUrl


class UserCreate(UserBase):
    pass


# --- Схемы для Экспертов ---
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
    vk_id: int
    first_name: str
    last_name: str
    photo_url: HttpUrl
    regalia: str
    social_link: HttpUrl
    performance_link: HttpUrl
    region: str
    topics: List[str]

    class Config:
        from_attributes = (
            True  # Позволяет Pydantic читать данные из объектов SQLAlchemy
        )

class UserAdminRead(UserBase):
    registration_date: datetime
    is_expert: bool
    status: Optional[str] = None # Статус из профиля, если он есть

    class Config:
        from_attributes = True
