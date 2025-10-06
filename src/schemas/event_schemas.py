from datetime import datetime

from pydantic import BaseModel, model_validator, HttpUrl
from typing import Optional, Any, List

from src.schemas.expert_schemas import UserBase


class EventBase(BaseModel):
    promo_word: str
    duration_minutes: int
    event_date: datetime


class EventCreate(EventBase):
    name: str
    event_link: Optional[HttpUrl] = None
    is_private: bool = False


class EventRead(EventBase):
    id: int
    expert_id: int
    status: str
    name: str
    event_link: Optional[HttpUrl] = None # <-- ДОБАВЛЕНО
    is_private: bool
    votes_count: int = 0
    trust_count: int = 0
    distrust_count: int = 0

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def get_name_from_event_name(cls, data: Any) -> Any:
        if hasattr(data, "event_name"):
            data.name = data.event_name
        return data


class VoteBase(BaseModel):
    vote_type: str
    comment_positive: Optional[str] = None
    comment_negative: Optional[str] = None


class VoteCreate(VoteBase):
    promo_word: str
    voter_vk_id: int


class Stats(BaseModel):
    expert: int = 0
    narodny: int = 0
    meropriyatiy: int = 0  # Мероприятий


class UserAdminRead(UserBase):
    registration_date: datetime
    is_expert: bool
    status: Optional[str] = None
    stats: Stats = Stats()

    class Config:
        from_attributes = True

class ExpertEventsResponse(BaseModel):
    current: List[EventRead]
    past: List[EventRead]