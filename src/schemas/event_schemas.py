from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, model_validator, HttpUrl, field_serializer
from typing import Optional, Any, List, TYPE_CHECKING

from src.schemas.base_schemas import VotedExpertInfo

if TYPE_CHECKING:
    pass


class EventBase(BaseModel):
    promo_word: str
    duration_minutes: int
    event_date: datetime


class EventCreate(EventBase):
    name: str
    event_link: Optional[HttpUrl] = None
    is_private: bool = False
    voter_thank_you_message: Optional[str] = None
    send_reminder: bool = False


class EventRead(EventBase):
    id: int
    expert_id: int
    status: str
    name: str
    event_link: Optional[HttpUrl] = None
    is_private: bool
    votes_count: int = 0
    trust_count: int = 0
    distrust_count: int = 0
    has_tariff_warning: bool = False

    expert_info: Optional[VotedExpertInfo] = None

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def get_name_from_event_name(cls, data: Any) -> Any:
        if hasattr(data, "event_name"):
            data.name = data.event_name
        return data

    @field_serializer("event_date")
    def serialize_dt(self, dt: datetime, _info):
        return dt.isoformat().replace("+00:00", "Z")


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
    meropriyatiy: int = 0


class ExpertEventsResponse(BaseModel):
    current: List[EventRead]
    past: List[EventRead]


class PaginatedEventsResponse(BaseModel):
    items: List[EventRead]
    total_count: int
    page: int
    size: int


EventRead.model_rebuild()
