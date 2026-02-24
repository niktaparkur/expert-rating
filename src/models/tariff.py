from sqlalchemy import Column, Integer, String, Float, Boolean, Text
from .base import Base


class Tariff(Base):
    __tablename__ = "tariffs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(
        String(50), unique=True, index=True, nullable=False
    )  # 'tariff_start', 'tariff_standard', 'tariff_pro', 'tariff_unlimited'
    name = Column(
        String(100), nullable=False
    )  # 'Начальный', 'Стандарт', 'Профи', 'Безлимит'
    price = Column(Float, default=0.0)
    price_votes = Column(Integer, default=0)
    vk_donut_link = Column(Text, nullable=True)

    event_limit = Column(Integer, default=3)
    event_duration_hours = Column(Integer, default=1)
    max_votes_per_event = Column(Integer, default=100)

    is_active = Column(Boolean, default=True)
