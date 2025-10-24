import hashlib
import hmac
from typing import Dict
import json

import redis.asyncio as redis
from fastapi import APIRouter, Depends, Request
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.dependencies import get_db, get_redis
from src.crud import expert_crud
from .tariffs import TARIFFS_INFO

router = APIRouter(prefix="/payment", tags=["Payment"])


def check_vk_signature(params: Dict, secret_key: str) -> bool:
    if "sig" not in params:
        return False
    vk_sign = params.pop("sig")
    vk_params = {k: v for k, v in params.items() if k.startswith("vk_")}
    sorted_params = sorted(vk_params.items())
    query_string = "".join(f"{k}={v}" for k, v in sorted_params)
    hasher = hmac.new(secret_key.encode(), query_string.encode(), hashlib.md5)
    calculated_sign = hasher.hexdigest()
    return calculated_sign == vk_sign


@router.post("")
async def handle_payment_notification(
    request: Request,
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
):
    form_data = await request.form()
    params = dict(form_data)

    # if not check_vk_signature(params.copy(), settings.VK_APP_SECRET_KEY):
    #     logger.warning("Invalid signature for payment notification")
    #     return {"error": {"error_code": 10, "error_msg": "Invalid signature."}}

    notification_type = params.get("notification_type")

    if notification_type in ["get_item", "get_item_test"]:
        logger.info(f"Processing '{notification_type}'...")
        item_id = params.get("item")
        order_context_id = params.get("merchant_data")

        response_item = TARIFFS_INFO.get(item_id)
        if not response_item:
            logger.error(f"Unknown item_id requested: {item_id}")
            return {"error": {"error_code": 20, "error_msg": "Item not found."}}

        if order_context_id:
            cache_key = f"order_context:{order_context_id}"
            context_data_str = await cache.get(cache_key)
            if context_data_str:
                context_data = json.loads(context_data_str)
                final_price = context_data.get("final_price")
                logger.success(f"Found discounted price {final_price} in Redis for context {order_context_id}")
                response_item["price"] = final_price

        logger.success(f"Sending item info to VK: {response_item}")
        return {"response": response_item}

    elif notification_type in ["order_status_change", "order_status_change_test"]:
        logger.info("Processing 'order_status_change'...")
        status = params.get("status")
        if status == "chargeable":
            logger.info("Status is 'chargeable'. Trying to update tariff...")
            try:
                vk_id = int(params.get("user_id"))
                item_id = params.get("item")
                tariff_name = TARIFFS_INFO.get(item_id, {}).get("title")

                if not tariff_name:
                    logger.error(f"Cannot find tariff title for item_id: {item_id}")
                    raise ValueError("Invalid item ID")

                logger.info(
                    f"Attempting to update tariff for user {vk_id} to '{tariff_name}'"
                )

                success = await expert_crud.update_expert_tariff(
                    db=db, vk_id=vk_id, tariff_name=tariff_name
                )

                if not success:
                    logger.error(
                        f"expert_crud.update_expert_tariff returned False for user {vk_id}"
                    )
                    return {
                        "error": {
                            "error_code": 1,
                            "error_msg": "Technical error: Cannot update tariff in DB.",
                        }
                    }

                cache_key = f"user_profile:{vk_id}"
                await cache.delete(cache_key)
                logger.success(f"Cache for user {vk_id} has been invalidated.")

                logger.success(
                    f"Successfully updated tariff for user {vk_id}. Sending success response to VK."
                )
                response_data = {
                    "order_id": params.get("order_id"),
                    "app_order_id": int(params.get("order_id")),
                }
                return {"response": response_data}
            except Exception as e:
                logger.error(
                    f"EXCEPTION while processing chargeable status: {e}", exc_info=True
                )
                return {
                    "error": {
                        "error_code": 1,
                        "error_msg": "Technical error during processing.",
                    }
                }

        logger.info(f"Status is '{status}', not 'chargeable'. Acknowledging receipt.")
        return {
            "response": {
                "order_id": params.get("order_id"),
                "app_order_id": int(params.get("order_id")),
            }
        }

    else:
        logger.warning(f"Unknown notification type: {notification_type}")
        return {"error": {"error_code": 100, "error_msg": "Unknown notification type."}}
