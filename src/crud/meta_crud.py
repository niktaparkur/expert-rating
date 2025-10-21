from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from src.models.all_models import Category, Region


async def get_all_themes(db: AsyncSession):
    query = select(Category).options(selectinload(Category.themes))
    result = await db.execute(query)
    categories = result.scalars().unique().all()

    response = []
    for category in categories:
        response.append(
            {
                "id": category.id,
                "name": category.name,
                "items": [
                    {"id": theme.id, "name": theme.name} for theme in category.themes
                ],
            }
        )
    return response


async def get_all_regions(db: AsyncSession) -> list[str]:
    query = select(Region.name).order_by(Region.name)
    result = await db.execute(query)
    return result.scalars().all()
