from datetime import datetime

from pydantic import BaseModel, model_validator
from typing import Optional, Any


class EventBase(BaseModel):
    promo_word: str
    duration_minutes: int
    event_date: datetime


class EventCreate(EventBase):
    name: str


class EventRead(EventBase):
    id: int
    expert_id: int
    status: str
    name: str
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
