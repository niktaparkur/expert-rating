from pydantic import BaseModel, HttpUrl


class VotedExpertInfo(BaseModel):
    vk_id: int
    first_name: str
    last_name: str
    photo_url: HttpUrl

    class Config:
        from_attributes = True


class TariffFeature(BaseModel):
    text: str
    tooltip: str


class TariffRead(BaseModel):
    id: str
    name: str
    price_str: str
    price_votes: int
    features: list[TariffFeature]
    feature_headers: list[str]
    vk_donut_link: str | None = None

