from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class MailingCreate(BaseModel):
    message: str = Field(..., min_length=10, max_length=1024)


class MailingRead(BaseModel):
    id: int
    expert_vk_id: int
    message: str
    status: str
    rejection_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
