from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis

from src.core.dependencies import (
    get_db,
    get_current_admin_user,
    get_current_user,
    get_redis,
)
from src.crud import promo_crud
from src.schemas import promo_schemas
from src.models import Tariff

router = APIRouter(prefix="/promo", tags=["Promo Codes"])


@router.post("/activate", status_code=200)
async def activate_promo(
    req: promo_schemas.PromoCodeActivateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    cache: redis.Redis = Depends(get_redis),
):
    """
    Активация промокода пользователем.
    Привязывает forced_tariff_id к пользователю.
    """
    try:
        promo = await promo_crud.activate_promo_code_for_user(
            db, code=req.code, user_vk_id=current_user["vk_id"]
        )

        await cache.delete(f"user_profile:{current_user['vk_id']}")

        tariff = await db.get(Tariff, promo.tariff_id)
        tariff_name = tariff.name if tariff else "Специальный"

        return {
            "status": "ok",
            "message": f"Промокод успешно активирован! Вам начислен тариф «{tariff_name}»",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/admin",
    status_code=201,
    response_model=promo_schemas.PromoCodeRead,
    dependencies=[Depends(get_current_admin_user)],
)
async def admin_create_promo_code(
    promo_data: promo_schemas.PromoCodeCreate, db: AsyncSession = Depends(get_db)
):
    try:
        return await promo_crud.create_promo_code(db=db, promo_data=promo_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin", dependencies=[Depends(get_current_admin_user)])
async def admin_get_all_promo_codes(
    db: AsyncSession = Depends(get_db), page: int = 1, size: int = 50
):
    items, total_count = await promo_crud.get_all_promo_codes_paginated(
        db=db, page=page, size=size
    )
    return {"items": items, "total_count": total_count, "page": page, "size": size}


@router.put(
    "/admin/{promo_id}",
    response_model=promo_schemas.PromoCodeRead,
    dependencies=[Depends(get_current_admin_user)],
)
async def admin_update_promo_code(
    promo_id: int,
    promo_data: promo_schemas.PromoCodeCreate,
    db: AsyncSession = Depends(get_db),
):
    updated_promo = await promo_crud.update_promo_code(
        db=db, promo_id=promo_id, promo_data=promo_data
    )
    if not updated_promo:
        raise HTTPException(status_code=404, detail="Promo code not found.")
    return updated_promo


@router.delete(
    "/admin/{promo_id}", status_code=204, dependencies=[Depends(get_current_admin_user)]
)
async def admin_delete_promo_code(promo_id: int, db: AsyncSession = Depends(get_db)):
    success = await promo_crud.delete_promo_code(db=db, promo_id=promo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Promo code not found.")
    return None
