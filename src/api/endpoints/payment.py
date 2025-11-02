import hashlib
import hmac
import uuid
from datetime import timedelta
from typing import Dict
import json

from yookassa import Configuration, Payment
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

import redis.asyncio as redis
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.dependencies import get_db, get_redis, get_current_user
from src.crud import expert_crud
from .tariffs import TARIFFS_INFO
from src.schemas import payment_schemas
from src.services.notifier import Notifier
from src.core.dependencies import get_notifier

from src.core.config import settings


Configuration.configure(settings.YOOKASSA_SHOP_ID, settings.YOOKASSA_SECRET_KEY)
router = APIRouter(prefix="/payment", tags=["Payment"])


@router.post("/yookassa/webhook", status_code=status.HTTP_200_OK)
async def yookassa_webhook(
    notification: payment_schemas.YooKassaNotification,
    request: Request,
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
    notifier: Notifier = Depends(get_notifier),
):
    """
    Принимает HTTP-уведомления от ЮKassa.
    """
    # 1. Проверка IP-адреса (базовая безопасность)
    # Список актуальных IP можно найти в документации ЮKassa
    # yookassa_ips = ["185.71.76.0/27", "185.71.77.0/27", "77.75.153.0/25", "77.75.154.128/25", "2a02:5180::/32"]
    # client_ip = request.client.host

    # Эту проверку можно будет включить на проде. Для локального теста (с ngrok) ее лучше закомментировать.
    # is_valid_ip = any(ipaddress.ip_address(client_ip) in ipaddress.ip_network(net) for net in yookassa_ips)
    # if not is_valid_ip:
    #     logger.warning(f"Received webhook from untrusted IP: {client_ip}")
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Untrusted IP")

    logger.info(f"Received YooKassa webhook: event='{notification.event}'")

    # 2. Обрабатываем только успешные платежи
    if notification.event == "payment.succeeded":
        payment_object = notification.object
        metadata = payment_object.metadata
        internal_order_id = metadata.internal_order_id

        # 3. Защита от повторной обработки (идемпотентность)
        processed_key = f"yookassa_processed:{internal_order_id}"
        if await cache.get(processed_key):
            logger.warning(
                f"Payment {payment_object.id} (order {internal_order_id}) has already been processed. Skipping."
            )
            return Response(status_code=status.HTTP_200_OK)

        logger.success(
            f"Processing successful payment {payment_object.id} for user {metadata.user_vk_id}"
        )

        try:
            # 4. Применяем тариф
            tariff_name_map = {
                "tariff_standard": "Стандарт",
                "tariff_pro": "Профи",
            }
            tariff_name = tariff_name_map.get(metadata.tariff_id)

            if not tariff_name:
                raise ValueError(f"Unknown tariff_id in metadata: {metadata.tariff_id}")

            success = await expert_crud.update_expert_tariff(
                db=db, vk_id=metadata.user_vk_id, tariff_name=tariff_name
            )

            if not success:
                raise ValueError("Failed to update expert tariff in DB.")

            # 5. Инвалидируем кеш и уведомляем пользователя
            await cache.delete(f"user_profile:{metadata.user_vk_id}")
            await notifier.send_message(  # Используем базовый метод для простоты
                peer_id=metadata.user_vk_id,
                message=f"✅ Оплата прошла успешно! Ваш тариф обновлен до '{tariff_name}'. Спасибо!",
            )

            # 6. Помечаем платеж как обработанный
            await cache.set(processed_key, "1", ex=timedelta(days=3))
            logger.success(
                f"Successfully processed payment for user {metadata.user_vk_id}, tariff '{tariff_name}'."
            )

        except Exception as e:
            logger.error(f"Error processing payment {payment_object.id}: {e}")
            # В случае ошибки мы не отвечаем 200, чтобы ЮKassa попробовала прислать уведомление еще раз
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal processing error",
            )

    # 7. Подтверждаем получение уведомления
    return Response(status_code=status.HTTP_200_OK)


@router.post("/yookassa/create-payment")
async def create_yookassa_payment(
    payment_data: dict,  # Просто для примера, потом сделаем Pydantic модель
    current_user: dict = Depends(get_current_user),
    cache: redis.Redis = Depends(get_redis),
):
    tariff_id = payment_data.get("tariff_id")
    final_price = payment_data.get("final_price")

    if not tariff_id or not final_price:
        raise HTTPException(
            status_code=400, detail="tariff_id and final_price are required."
        )

    # Создаем уникальный idempotence_key для ЮKassa
    idempotence_key = str(uuid.uuid4())

    # Создаем наш внутренний order_id для отслеживания
    internal_order_id = str(uuid.uuid4())

    payment_description = (
        f"Оплата тарифа '{tariff_id}' для пользователя VK ID {current_user['vk_id']}"
    )

    try:
        payment = Payment.create(
            {
                "amount": {
                    "value": str(final_price),  # Цена в рублях, как строка
                    "currency": "RUB",
                },
                "confirmation": {
                    "type": "redirect",
                    # ВАЖНО: Этот URL должен быть страницей-заглушкой
                    # на вашем фронтенде, которая просто закроется.
                    "return_url": f"https://vk.com/app{settings.VK_APP_ID}",
                },
                "capture": True,
                "description": payment_description,
                "metadata": {
                    "internal_order_id": internal_order_id,
                    "user_vk_id": current_user["vk_id"],
                    "tariff_id": tariff_id,
                },
            },
            idempotence_key,
        )

        # Сохраняем информацию о заказе в Redis для последующей проверки через webhook
        await cache.set(
            f"yookassa_order:{internal_order_id}", payment.id, ex=86400
        )  # Храним сутки

        confirmation_url = payment.confirmation.confirmation_url
        logger.success(
            f"Created YooKassa payment {payment.id} for user {current_user['vk_id']}. URL: {confirmation_url}"
        )

        return {"confirmation_url": confirmation_url}

    except Exception as e:
        logger.error(f"YooKassa payment creation failed: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при создании платежа.")


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
                logger.success(
                    f"Found discounted price {final_price} in Redis for context {order_context_id}"
                )
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
