from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from src.core.dependencies import get_db
from src.models.tariff import Tariff
from src.schemas.base_schemas import TariffRead

router = APIRouter(prefix="/tariffs", tags=["Tariffs"])


@router.get("", response_model=List[TariffRead])
async def get_all_tariffs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tariff).where(Tariff).order_by(Tariff.price))
    tariffs = result.scalars().all()

    response = []
    for t in tariffs:
        features = []
        feature_headers = []

        if t.event_duration_hours < 24:
            features.append(
                {
                    "text": f"до {t.event_duration_hours} часов",
                    "tooltip": "Длительность голосования",
                }
            )
            feature_headers.append("Срок активности слова")
        elif t.event_duration_hours == 24:
            features.append(
                {"text": "до 24 часов", "tooltip": "Длительность голосования"}
            )
            feature_headers.append("Срок активности слова")
        else:
            features.append(
                {
                    "text": f"{t.event_duration_hours} часа",
                    "tooltip": "Длительность голосования",
                }
            )
            feature_headers.append("Срок активности слова")

        if t.event_limit > 1000:
            features.append({"text": "Неограниченно", "tooltip": "Мероприятий в месяц"})
            feature_headers.append("Мероприятия в месяц")
        else:
            features.append(
                {
                    "text": f"{t.event_limit} мероприятия в месяц",
                    "tooltip": "Мероприятий в месяц",
                }
            )
            feature_headers.append("Мероприятия в месяц")

        if t.max_votes_per_event > 10000:
            features.append(
                {"text": "Неограниченно", "tooltip": "Голосов на мероприятие"}
            )
            feature_headers.append("Голосов на мероприятии")
        else:
            features.append(
                {
                    "text": f"{t.max_votes_per_event} голосов на мероприятии",
                    "tooltip": "Голосов на мероприятие",
                }
            )
            feature_headers.append("Голосов на мероприятии")

        price_str = "0 ₽" if t.price == 0 else f"{int(t.price)} ₽"

        response.append(
            {
                "id": t.code,
                "name": t.name,
                "price_str": price_str,
                "price_votes": int(t.price),
                "features": features,
                "feature_headers": feature_headers,
                "vk_donut_link": t.vk_donut_link,
            }
        )

    return response
