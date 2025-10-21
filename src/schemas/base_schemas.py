from pydantic import BaseModel, HttpUrl


class VotedExpertInfo(BaseModel):
    vk_id: int
    first_name: str
    last_name: str
    photo_url: HttpUrl

    class Config:
        from_attributes = True
