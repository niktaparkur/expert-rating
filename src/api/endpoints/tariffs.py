from fastapi import APIRouter
from typing import List, Dict

router = APIRouter(prefix="/tariffs", tags=["Tariffs"])

TARIFFS_INFO: Dict[str, Dict] = {
    "tariff_standard": {
        "title": "Стандарт",
    },
    "tariff_pro": {
        "title": "Профи",
    },
}

TARIFFS_DATA_LIST = [
    {
        "id": "tariff_start",
        "name": "Начальный",
        "price_str": "Бесплатно",
        "price_votes": 0,
        "features": [
            {"text": "До 3 мероприятий в месяц"},
            {"text": "До 100 голосов на мероприятии"},
            {"text": "До 1 часа длительность голосования"},
        ],
    },
    {
        "id": "tariff_standard",
        "name": "Стандарт",
        "price_str": "299 голосов",
        "price_votes": 299,
        "features": [
            {"text": "До 10 мероприятий в месяц"},
            {"text": "До 200 голосов"},
            {"text": "До 12 часов длительность голосования"},
            {"text": "2 рассылки в месяц"},
        ],
    },
    {
        "id": "tariff_pro",
        "name": "Профи",
        "price_str": "729 голосов",
        "price_votes": 729,
        "features": [
            {"text": "До 30 мероприятий в месяц"},
            {"text": "До 1000 голосов"},
            {"text": "До 24 часов длительность голосования"},
            {"text": "4 рассылки в месяц"},
        ],
    },
]


@router.get("", response_model=List[dict])
async def get_all_tariffs():
    return TARIFFS_DATA_LIST
