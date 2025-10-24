# src/schemas/expert_schemas.py

from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl
from src.schemas.base_schemas import VotedExpertInfo

# НЕ ИМПОРТИРУЕМ EventRead ЗДЕСЬ НАПРЯМУЮ


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


class UserVoteInfo(BaseModel):
    vote_type: str
    comment: Optional[str] = None


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
    current_user_vote_info: Optional[UserVoteInfo] = None
    allow_notifications: bool = True
    allow_expert_mailings: bool = True

    class Config:
        from_attributes = True


class MyVoteRead(BaseModel):
    id: int
    vote_type: str
    is_expert_vote: bool
    created_at: datetime
    expert: Optional[VotedExpertInfo] = None
    # ИЗМЕНЕНИЕ: Используем строковую аннотацию для отложенного определения типа
    event: Optional["EventRead"] = None

    class Config:
        from_attributes = True


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
    allow_notifications: Optional[bool] = None
    allow_expert_mailings: Optional[bool] = None


class PaginatedUsersResponse(BaseModel):
    items: List[UserAdminRead]
    total_count: int
    page: int
    size: int


from src.schemas.event_schemas import EventRead  # noqa: E402

MyVoteRead.model_rebuild()
