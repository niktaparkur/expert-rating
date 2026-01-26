import uuid
from datetime import timedelta
from ipaddress import ip_address

from yookassa import Configuration, Payment
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
    BackgroundTasks,
)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
import redis.asyncio as redis
from loguru import logger

from src.core.dependencies import get_db, get_redis, get_current_user
from src.crud import expert_crud, promo_crud
from .tariffs import TARIFFS_INFO
from src.schemas import payment_schemas
from src.services.notifier import Notifier
from src.services import report_generator
from src.core.dependencies import get_notifier

from src.core.config import settings

Configuration.configure(settings.YOOKASSA_SHOP_ID, settings.YOOKASSA_SECRET_KEY)
router = APIRouter(prefix="/payment", tags=["Payment"])

REPORT_PRICE = 500
engine = create_async_engine(settings.DATABASE_URL_ASYNC)

YOOKASSA_TRUSTED_IPS = [
    "185.71.76.0/27",
    "185.71.77.0/27",
    "77.75.153.0/25",
    "77.75.156.11",
    "77.75.156.35",
    "77.75.154.128/25",
    "2a02:5180::/32",
]


@router.post("/yookassa/webhook", status_code=status.HTTP_200_OK)
async def yookassa_webhook(
    notification: payment_schemas.YooKassaNotification,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
    notifier: Notifier = Depends(get_notifier),
):
    client_ip = request.headers.get("x-forwarded-for") or request.client.host
    is_trusted = any(
        ip_address(client_ip) in ip_network
        for ip_network in [ip_address(net) for net in YOOKASSA_TRUSTED_IPS]
    )
    if not is_trusted:
        logger.warning(f"Untrusted IP {client_ip} tried to access YooKassa webhook.")
        raise HTTPException(status_code=403, detail="Forbidden IP")

    logger.info(f"Received YooKassa webhook: event='{notification.event}'")

    if notification.event == "payment.succeeded":
        payment_object = notification.object
        metadata = payment_object.metadata
        internal_order_id = metadata.internal_order_id

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
            tariff_id = metadata.tariff_id
            user_vk_id = metadata.user_vk_id

            if "report_expert_" in tariff_id:
                expert_id_to_report = metadata.expert_id
                logger.info(
                    f"Report payment succeeded for expert {expert_id_to_report}"
                )

                async def generation_task():
                    async with AsyncSession(engine) as task_db:
                        report_path = await report_generator.generate_expert_report(
                            task_db, expert_id_to_report
                        )
                        if report_path:
                            await notifier.send_document(
                                user_vk_id, report_path, "Ваш отчет по эксперту готов!"
                            )
                        else:
                            await notifier.send_message(
                                user_vk_id,
                                "Не удалось сгенерировать отчет. Обратитесь в поддержку.",
                            )

                background_tasks.add_task(generation_task)

            else:
                tariff_name_map = {
                    "tariff_standard": "Стандарт",
                    "tariff_pro": "Профи",
                }
                tariff_name = tariff_name_map.get(tariff_id)

                if not tariff_name:
                    raise ValueError(f"Unknown tariff_id in metadata: {tariff_id}")

                success = await expert_crud.update_expert_tariff(
                    db=db, vk_id=user_vk_id, tariff_name=tariff_name
                )
                if not success:
                    raise ValueError("Failed to update expert tariff in DB.")

                await cache.delete(f"user_profile:{user_vk_id}")
                await notifier.send_message(
                    peer_id=user_vk_id,
                    message=f"✅ Оплата прошла успешно! Ваш тариф обновлен до '{tariff_name}'. Спасибо!",
                )
                logger.success(
                    f"Successfully processed tariff payment for user {user_vk_id}, tariff '{tariff_name}'."
                )

            await cache.set(processed_key, "1", ex=timedelta(days=3))

        except Exception as e:
            logger.error(f"Error processing payment {payment_object.id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal processing error",
            )

    return Response(status_code=status.HTTP_200_OK)


@router.post("/reports/{expert_id}/create-payment")
async def create_report_payment(
    expert_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
):
    user_vk_id = current_user["vk_id"]
    user_email = current_user.get("email")
    if not user_email:
        raise HTTPException(
            status_code=400,
            detail="Email пользователя не найден. Пожалуйста, укажите его в настройках профиля.",
        )

    expert_profile = await expert_crud.get_user_with_profile(db, vk_id=expert_id)
    if not expert_profile or not expert_profile[0]:
        raise HTTPException(status_code=404, detail="Эксперт не найден.")

    expert_name = f"{expert_profile[0].first_name} {expert_profile[0].last_name}"
    tariff_id = f"report_expert_{expert_id}"
    idempotence_key = str(uuid.uuid4())
    internal_order_id = str(uuid.uuid4())
    payment_description = f"Оплата PDF-отчета по эксперту {expert_name} (ID {expert_id}) для пользователя VK ID {user_vk_id}"

    try:
        payment_payload = {
            "amount": {"value": str(REPORT_PRICE), "currency": "RUB"},
            "confirmation": {
                "type": "redirect",
                "return_url": f"https://vk.com/app{settings.VK_APP_ID}#/expert/{expert_id}",
            },
            "capture": True,
            "description": payment_description,
            "metadata": {
                "internal_order_id": internal_order_id,
                "user_vk_id": user_vk_id,
                "tariff_id": tariff_id,
                "expert_id": expert_id,
            },
            "receipt": {
                "customer": {"email": user_email},
                "items": [
                    {
                        "description": f"PDF-отчет по голосам за эксперта {expert_name}",
                        "quantity": "1.00",
                        "amount": {"value": str(REPORT_PRICE), "currency": "RUB"},
                        "vat_code": "1",
                        "payment_mode": "full_prepayment",
                        "payment_subject": "service",
                    }
                ],
            },
        }

        payment = Payment.create(payment_payload, idempotence_key)
        await cache.set(f"yookassa_order:{internal_order_id}", payment.id, ex=86400)
        confirmation_url = payment.confirmation.confirmation_url
        logger.success(
            f"Created YooKassa report payment {payment.id} for user {user_vk_id}. URL: {confirmation_url}"
        )
        return {"confirmation_url": confirmation_url}
    except Exception as e:
        logger.error(f"YooKassa report payment creation failed: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при создании платежа.")


@router.post("/yookassa/create-payment")
async def create_yookassa_payment(
    payment_data: payment_schemas.YooKassaPaymentCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
):
    tariff_id = payment_data.tariff_id
    user_vk_id = current_user["vk_id"]
    user_email = current_user.get("email")

    if not user_email:
        raise HTTPException(
            status_code=400,
            detail="Email пользователя не найден. Пожалуйста, укажите его в настройках профиля.",
        )

    tariff_info = TARIFFS_INFO.get(tariff_id)
    if not tariff_info:
        raise HTTPException(status_code=404, detail="Тариф не найден.")

    final_price = tariff_info["price"]

    if payment_data.promo_code:
        promo = await promo_crud.validate_and_get_promo_code(
            db, code=payment_data.promo_code, user_vk_id=user_vk_id
        )
        if promo:
            final_price = round(final_price * (100 - promo.discount_percent) / 100)
            logger.info(
                f"Promo '{promo.code}' applied for user {user_vk_id}. New price: {final_price}"
            )
        else:
            logger.warning(
                f"User {user_vk_id} tried to use invalid promo code '{payment_data.promo_code}'."
            )

    tariff_title = tariff_info["title"]
    idempotence_key = str(uuid.uuid4())
    internal_order_id = str(uuid.uuid4())
    payment_description = (
        f"Оплата тарифа '{tariff_title}' для пользователя VK ID {user_vk_id}"
    )

    try:
        payment_payload = {
            "amount": {"value": str(final_price), "currency": "RUB"},
            "confirmation": {
                "type": "redirect",
                "return_url": f"https://vk.com/app{settings.VK_APP_ID}",
            },
            "capture": True,
            "description": payment_description,
            "metadata": {
                "internal_order_id": internal_order_id,
                "user_vk_id": user_vk_id,
                "tariff_id": tariff_id,
            },
            "receipt": {
                "customer": {"email": user_email},
                "items": [
                    {
                        "description": f"Доступ к тарифу «{tariff_title}» на 30 дней",
                        "quantity": "1.00",
                        "amount": {"value": str(final_price), "currency": "RUB"},
                        "vat_code": "1",
                        "payment_mode": "full_prepayment",
                        "payment_subject": "service",
                    }
                ],
            },
        }

        payment = Payment.create(payment_payload, idempotence_key)
        await cache.set(f"yookassa_order:{internal_order_id}", payment.id, ex=86400)
        confirmation_url = payment.confirmation.confirmation_url
        logger.success(
            f"Created YooKassa payment {payment.id} for user {user_vk_id}. URL: {confirmation_url}"
        )
        return {"confirmation_url": confirmation_url}
    except Exception as e:
        logger.error(f"YooKassa payment creation failed: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при создании платежа.")
