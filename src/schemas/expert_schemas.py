from __future__ import annotations
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, HttpUrl, field_validator, ConfigDict
from src.schemas.base_schemas import VotedExpertInfo


class StatsPublic(BaseModel):
    expert: int = 0
    community: int = 0
    events_count: int = 0


class StatsPrivate(StatsPublic):
    expert_trust: int = 0
    expert_distrust: int = 0
    community_trust: int = 0
    community_distrust: int = 0


class UserBase(BaseModel):
    vk_id: int = Field(..., gt=0)
    first_name: str
    last_name: str
    photo_url: str


class UserCreate(UserBase):
    pass


class UserRegaliaUpdate(BaseModel):
    regalia: str = Field(..., max_length=500)


class MyVotesStats(BaseModel):
    trust: int = 0
    distrust: int = 0


class UserVoteInfo(BaseModel):
    vote_type: str  # "trust" / "distrust"
    comment: Optional[str] = None


class UserPublicRead(UserBase):
    is_expert: bool
    status: Optional[str] = None
    stats: StatsPublic = Field(default_factory=StatsPublic)
    topics: List[str] = []
    show_community_rating: bool = True
    regalia: Optional[str] = None
    social_link: Optional[str] = None
    tariff_plan: Optional[str] = "Начальный"
    current_user_vote_info: Optional[UserVoteInfo] = None
    rank: Optional[int] = None  # Поле для топа

    model_config = ConfigDict(from_attributes=True)


class UserPrivateRead(UserPublicRead):
    registration_date: datetime
    is_admin: bool
    email: Optional[str] = None
    allow_notifications: bool = True
    allow_expert_mailings: bool = True
    my_votes_stats: MyVotesStats = Field(default_factory=MyVotesStats)
    stats: StatsPrivate = Field(default_factory=StatsPrivate)
    next_payment_date: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MyVoteRead(BaseModel):
    id: int
    # В новой БД у нас числа, но фронт ждет строки. Конвертацию сделаем в эндпоинте.
    vote_type: str
    # is_expert_vote больше нет в модели Feedback явно, но мы можем его вычислять (есть event_id или нет)
    is_expert_vote: bool
    created_at: datetime
    expert: Optional[VotedExpertInfo] = None
    event: Optional["EventRead"] = None

    model_config = ConfigDict(from_attributes=True)


class ExpertProfileBase(BaseModel):
    theme_ids: List[int] = Field(..., min_length=1, max_length=3)
    region: str
    social_link: HttpUrl
    regalia: str
    performance_link: HttpUrl
    referrer: Optional[str] = Field(None, alias="referrer_info")

    @field_validator("social_link", "performance_link")
    @classmethod
    def validate_urls(cls, v: HttpUrl, info) -> HttpUrl:
        # Pydantic v2 validator signature might differ, assuming standard here
        # Simplified validation for MVP
        return v


class ExpertCreate(BaseModel):
    user_data: UserCreate
    profile_data: ExpertProfileBase


class ExpertRequestRead(BaseModel):
    vk_id: int
    first_name: str
    last_name: str
    photo_url: str
    regalia: str
    social_link: str
    performance_link: str
    region: str
    topics: List[str]

    model_config = ConfigDict(from_attributes=True)


class CommunityVoteCreate(BaseModel):
    vote_type: str  # "trust" / "distrust"
    comment_positive: Optional[str] = None
    comment_negative: Optional[str] = None


class UserSettingsUpdate(BaseModel):
    show_community_rating: Optional[bool] = None
    allow_notifications: Optional[bool] = None
    allow_expert_mailings: Optional[bool] = None


class PaginatedUsersResponse(BaseModel):
    items: List[UserPublicRead]
    total_count: int
    page: int
    size: int


class PaginatedAdminUsersResponse(BaseModel):
    items: List[UserPrivateRead]
    total_count: int
    page: int
    size: int


class ExpertProfileUpdate(BaseModel):
    region: str
    social_link: HttpUrl
    regalia: str = Field(..., max_length=500)


class ExpertUpdateRequestRead(BaseModel):
    id: int
    expert_vk_id: int
    new_data: Dict[str, Any]
    status: str
    created_at: datetime
    expert_info: Optional[ExpertRequestRead] = None

    model_config = ConfigDict(from_attributes=True)


from src.schemas.event_schemas import EventRead  # noqa: E402

MyVoteRead.model_rebuild()
