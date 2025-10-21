from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PromoCodeBase(BaseModel):
    code: str = Field(..., max_length=50)
    discount_percent: int = Field(..., gt=0, le=100)
    expires_at: Optional[datetime] = None
    is_active: bool = True


class PromoCodeCreate(PromoCodeBase):
    pass


class PromoCodeRead(PromoCodeBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PromoCodeApply(BaseModel):
    code: str
    tariff_id: str


class PromoCodeApplyResponse(BaseModel):
    original_price: int
    discount_percent: int
    final_price: int
    code: str
