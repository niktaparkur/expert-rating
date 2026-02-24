from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PromoCodeBase(BaseModel):
    code: str = Field(..., min_length=3, max_length=50)
    tariff_id: int
    activations_limit: Optional[int] = Field(None, gt=0)
    is_active: bool = True


class PromoCodeCreate(PromoCodeBase):
    pass


class PromoCodeRead(PromoCodeBase):
    id: int
    created_at: datetime
    activations_count: Optional[int] = 0

    class Config:
        from_attributes = True


class PromoCodeActivateRequest(BaseModel):
    code: str
