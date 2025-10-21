from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.dependencies import get_db, get_current_admin_user
from src.crud import promo_crud
from src.schemas import promo_schemas
from .tariffs import TARIFFS_DATA_LIST
from sqlalchemy import select

from ...models.all_models import PromoCode

router = APIRouter(prefix="/promo", tags=["Promo Codes"])


@router.post("/apply", response_model=promo_schemas.PromoCodeApplyResponse)
async def apply_promo_code(
    apply_data: promo_schemas.PromoCodeApply, db: AsyncSession = Depends(get_db)
):
    promo_code = await promo_crud.validate_and_get_promo_code(
        db, code=apply_data.code, user_vk_id=apply_data.user_vk_id
    )

    if not promo_code:
        basic_promo = await db.execute(
            select(PromoCode).where(PromoCode.code == apply_data.code.upper())
        )
        if basic_promo.scalars().first():
            raise HTTPException(
                status_code=403, detail="Лимит активаций для этого промокода исчерпан."
            )
        else:
            raise HTTPException(
                status_code=404, detail="Промокод не найден, истек или неактивен."
            )

    target_tariff = next(
        (t for t in TARIFFS_DATA_LIST if t["id"] == apply_data.tariff_id), None
    )
    if not target_tariff or target_tariff["price_votes"] == 0:
        raise HTTPException(
            status_code=400, detail="Промокод не применим к этому тарифу."
        )

    original_price = target_tariff["price_votes"]
    discount = promo_code.discount_percent
    final_price = round(original_price * (100 - discount) / 100)

    return {
        "original_price": original_price,
        "discount_percent": discount,
        "final_price": final_price,
        "code": promo_code.code,
    }


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
