from __future__ import annotations
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from pydantic import BaseModel, Field, HttpUrl

if TYPE_CHECKING:
    from src.schemas.event_schemas import EventRead


# --- Сначала базовые, независимые схемы ---
class Stats(BaseModel):
    expert: int = 0
    community: int = 0
    events_count: int = 0


class UserBase(BaseModel):
    vk_id: int = Field(..., gt=0)
    first_name: str
    last_name: str
    photo_url: str


class UserCreate(UserBase):
    pass


class MyVotesStats(BaseModel):
    trust: int = 0
    distrust: int = 0


class VotedExpertInfo(BaseModel):
    vk_id: int
    first_name: str
    last_name: str
    photo_url: HttpUrl

    class Config:
        from_attributes = True


# --- Схемы, которые могут зависеть от чего-то ---
class UserAdminRead(UserBase):
    registration_date: datetime
    is_expert: bool
    is_admin: bool
    status: Optional[str] = None
    stats: Stats = Field(default_factory=Stats)
    my_votes_stats: MyVotesStats = Field(default_factory=MyVotesStats)
    topics: List[str] = []
    show_community_rating: bool = True
    regalia: Optional[str] = None
    social_link: Optional[str] = None
    tariff_plan: Optional[str] = "Начальный"
    current_user_has_voted: bool = False

    class Config:
        from_attributes = True


# --- Схемы с циклическими зависимостями ---
class MyVoteRead(BaseModel):
    id: int
    vote_type: str
    is_expert_vote: bool
    created_at: datetime
    expert: Optional[VotedExpertInfo] = None
    event: Optional[EventRead] = None

    class Config:
        from_attributes = True


# --- Остальные ---
class ExpertProfileBase(BaseModel):
    theme_ids: List[int] = Field(..., min_length=1, max_length=3)
    region: str
    social_link: HttpUrl
    regalia: str
    performance_link: HttpUrl
    referrer: Optional[str] = Field(None, alias="referrer_info")


class ExpertCreate(BaseModel):
    user_data: UserCreate
    profile_data: ExpertProfileBase


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
        from_attributes = True


class CommunityVoteCreate(BaseModel):
    voter_vk_id: int
    vote_type: str
    comment_positive: Optional[str] = None
    comment_negative: Optional[str] = None


class UserSettingsUpdate(BaseModel):
    show_community_rating: Optional[bool] = None


from src.schemas.event_schemas import EventRead

MyVoteRead.model_rebuild()
