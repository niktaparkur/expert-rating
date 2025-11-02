from pydantic import BaseModel

class YooKassaAmount(BaseModel):
    value: str
    currency: str

class YooKassaMetadata(BaseModel):
    internal_order_id: str
    user_vk_id: int
    tariff_id: str

class YooKassaPaymentObject(BaseModel):
    id: str
    status: str
    amount: YooKassaAmount
    description: str
    metadata: YooKassaMetadata
    paid: bool
    test: bool

class YooKassaNotification(BaseModel):
    type: str
    event: str
    object: YooKassaPaymentObject