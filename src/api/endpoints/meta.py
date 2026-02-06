from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.core.dependencies import get_db, get_optional_validated_vk_id
from src.crud import meta_crud

router = APIRouter(prefix="/meta", tags=["Metadata"])


@router.get("/themes")
async def get_all_themes(
    db: AsyncSession = Depends(get_db),
    vk_id: int | None = Depends(get_optional_validated_vk_id),
):
    return await meta_crud.get_all_themes(db)


@router.get("/regions", response_model=List[str])
async def get_all_regions(
    db: AsyncSession = Depends(get_db),
    vk_id: int | None = Depends(get_optional_validated_vk_id),
):
    return await meta_crud.get_all_regions(db)




