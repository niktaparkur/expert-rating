from sqlalchemy import (
    Column,
    BigInteger,
    Integer,
    String,
    Boolean,
    Float,
    TIMESTAMP,
    func,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from .base import Base


class DonutSubscription(Base):
    __tablename__ = "donut_subscriptions"

    user_id = Column(
        BigInteger, ForeignKey("users.vk_id", ondelete="CASCADE"), primary_key=True
    )

    is_active = Column(Boolean, default=False)

    amount = Column(Float, default=0.0)

    status = Column(String(50), default="inactive")

    next_payment_date = Column(TIMESTAMP(timezone=True), nullable=True)

    last_updated = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="subscription")


class PromoCode(Base):
    __tablename__ = "promo_codes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), unique=True, index=True)

    is_active = Column(Boolean, default=True)
