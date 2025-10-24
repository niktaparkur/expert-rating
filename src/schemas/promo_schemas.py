from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PromoCodeBase(BaseModel):
    code: str = Field(..., max_length=50)
    discount_percent: int = Field(..., gt=0, le=100)
    expires_at: Optional[datetime] = None
    is_active: bool = True
    activations_limit: Optional[int] = Field(None, gt=0)
    user_activations_limit: Optional[int] = Field(1, gt=0)


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
    user_vk_id: int


class PromoCodeApplyResponse(BaseModel):
    original_price: int
    discount_percent: int
    final_price: int
    code: str
    order_context_id: str
