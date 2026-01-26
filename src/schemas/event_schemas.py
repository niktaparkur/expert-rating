from __future__ import annotations
from datetime import datetime, timezone
from pydantic import (
    BaseModel,
    model_validator,
    HttpUrl,
    field_serializer,
    Field,
    field_validator,
    ConfigDict
)
from typing import Optional, Any, List

from src.schemas.base_schemas import VotedExpertInfo


class EventBase(BaseModel):
    promo_word: str
    duration_minutes: int
    event_date: datetime


class EventAvailabilityCheck(BaseModel):
    promo_word: str
    event_date: datetime
    duration_minutes: int


class EventCreate(EventBase):
    name: str
    description: Optional[str] = None
    event_link: Optional[HttpUrl] = None
    is_private: bool = False
    voter_thank_you_message: Optional[str] = None
    send_reminder: bool = False

    @field_validator("event_date")
    @classmethod
    def event_date_must_be_in_future(cls, v: datetime) -> datetime:
        return v

    duration_minutes: int = Field(
        ..., gt=0, description="Длительность должна быть больше нуля."
    )


class EventRead(EventBase):
    id: int
    expert_id: int
    status: str
    name: str
    description: Optional[str] = None
    event_link: Optional[HttpUrl] = None
    is_private: bool
    votes_count: int = 0
    trust_count: int = 0
    distrust_count: int = 0
    has_tariff_warning: bool = False

    expert_info: Optional[VotedExpertInfo] = None

    model_config = ConfigDict(from_attributes=True)

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
    comment: str


class VoteCreate(VoteBase):
    promo_word: str
    voter_vk_id: int


class CurrentVoteStatus(BaseModel):
    has_voted: bool
    vote_value: int
    last_comment: Optional[str] = None


class EventStatusResponse(BaseModel):
    status: str
    event_name: str
    start_time: str
    end_time: str
    current_vote: Optional[CurrentVoteStatus] = None
    expert: dict


class ExpertEventsResponse(BaseModel):
    current: List[EventRead]
    past: List[EventRead]


class PaginatedEventsResponse(BaseModel):
    items: List[EventRead]
    total_count: int
    page: int
    size: int