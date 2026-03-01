from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from src.core.dependencies import get_db
from src.models.tariff import Tariff
from src.schemas.base_schemas import TariffRead
from pydantic import BaseModel

from src.core.dependencies import get_current_admin_user

router = APIRouter(prefix="/tariffs", tags=["Tariffs"])


@router.get("", response_model=List[TariffRead])
async def get_all_tariffs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Tariff).where(Tariff.is_active).order_by(Tariff.price)
    )
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
                "id": t.id,
                "code": t.code,
                "name": t.name,
                "price_str": price_str,
                "price_votes": int(t.price),
                "features": features,
                "feature_headers": feature_headers,
                "vk_donut_link": t.vk_donut_link,
                "event_limit": t.event_limit,
                "event_duration_hours": t.event_duration_hours,
                "max_votes_per_event": t.max_votes_per_event,
                "is_active": t.is_active,
            }
        )

    return response


class TariffUpdate(BaseModel):
    name: str
    price: float
    event_limit: int
    event_duration_hours: int
    max_votes_per_event: int
    vk_donut_link: str | None = None
    is_active: bool


@router.put("/admin/{tariff_id}", dependencies=[Depends(get_current_admin_user)])
async def update_tariff(
    tariff_id: int, data: TariffUpdate, db: AsyncSession = Depends(get_db)
):
    tariff = await db.get(Tariff, tariff_id)
    if not tariff:
        raise HTTPException(status_code=404, detail="Tariff not found")

    for key, value in data.model_dump().items():
        setattr(tariff, key, value)

    await db.commit()
    return {"status": "ok"}
