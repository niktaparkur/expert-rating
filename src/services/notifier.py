from datetime import datetime
from typing import Optional
from aionvk import Bot, Button, KeyboardBuilder

from src.core.config import settings
from src.schemas import event_schemas


class Notifier:
    def __init__(self, token: str):
        if not token:
            print("WARNING: VK_BOT_TOKEN is not set. Notifier will not send messages.")
            self.bot = None
        else:
            self.bot = Bot(token=token)

    async def send_message(self, peer_id: int, message: str, keyboard=None):
        if not self.bot or not peer_id:
            return
        try:
            await self.bot.send_message(
                peer_id=peer_id, text=message, keyboard=keyboard
            )
        except Exception as e:
            print(f"Failed to send VK message to {peer_id}: {e}")

    async def send_new_request_to_admin(self, user_data: dict):
        vk_id = user_data.get("vk_id")
        first_name = user_data.get("first_name", "")
        last_name = user_data.get("last_name", "")
        message = (
            f"🔔 Новая заявка на регистрацию эксперта!\n\n"
            f"👤 Пользователь: {first_name} {last_name} (vk.com/id{vk_id})"
        )
        kb = KeyboardBuilder(inline=True)
        deep_link = f"https://vk.com/app{settings.VK_APP_ID}#/admin?vk_id={vk_id}"
        kb.add(Button.open_link("Рассмотреть заявку", link=deep_link))
        await self.send_message(settings.ADMIN_ID, message, kb.build())

    async def send_new_event_to_admin(self, event_name: str, expert_name: str):
        message = (
            f"📅 Новое мероприятие на модерацию!\n\n"
            f"Название: «{event_name}»\n"
            f"От эксперта: {expert_name}"
        )
        kb = KeyboardBuilder(inline=True)
        deep_link = f"https://vk.com/app{settings.VK_APP_ID}#/admin"
        kb.add(Button.open_link("В админ-панель", link=deep_link))
        await self.send_message(settings.ADMIN_ID, message, kb.build())

    async def send_moderation_result(
        self, vk_id: int, approved: bool, reason: Optional[str] = None
    ):
        if approved:
            message = "✅ Ваша заявка на регистрацию в 'Рейтинге экспертов' одобрена! Теперь вам доступен личный кабинет в приложении."
        else:
            message = f"❌ К сожалению, ваша заявка на регистрацию была отклонена.\nПричина: {reason or 'не указана'}"
        await self.send_message(vk_id, message)

    async def send_event_status_notification(
        self,
        expert_id: int,
        event_name: str,
        approved: bool,
        reason: Optional[str] = None,
    ):
        if approved:
            message = f"✅ Ваше мероприятие «{event_name}» одобрено и появится в афише!"
        else:
            message = f"❌ Ваше мероприятие «{event_name}» отклонено.\nПричина: {reason or 'не указана'}"
        await self.send_message(expert_id, message)

    async def send_new_vote_notification(
        self, expert_id: int, vote_data: event_schemas.VoteCreate
    ):
        vote_type_text = (
            "👍 (доверяю)" if vote_data.vote_type == "trust" else "👎 (не доверяю)"
        )
        message = (
            f"🗳️ Новый голос на мероприятии!\n\n"
            f"Вы получили новый голос: {vote_type_text}\n"
            f"Мероприятие: {vote_data.promo_word}"
        )
        await self.send_message(expert_id, message)

    async def send_vote_action_notification(
        self,
        user_vk_id: int,
        expert_name: Optional[str] = None,
        expert_vk_id: Optional[int] = None,
        action: Optional[str] = None,
        vote_type: Optional[str] = None,
        message_override: Optional[str] = None,
    ):
        if message_override:
            await self.send_message(user_vk_id, message_override)
            return

        vote_map = {"trust": "«👍 Доверие»", "distrust": "«👎 Недоверие»"}
        vote_text = vote_map.get(vote_type, "") if vote_type else ""

        if action == "submitted":
            message = (
                f"✅ Ваш голос {vote_text} за эксперта {expert_name} был успешно учтен."
            )
        elif action == "updated":
            message = (
                f"🔄 Ваш голос за эксперта {expert_name} был изменен на {vote_text}."
            )
        elif action == "cancelled":
            message = f"🗑️ Ваш голос за эксперта {expert_name} был отменен."
        else:
            return

        kb = KeyboardBuilder(inline=True)
        deep_link = f"https://vk.com/app{settings.VK_APP_ID}#/expert/{expert_vk_id}"
        kb.add(Button.open_link("Перейти к профилю", link=deep_link))
        await self.send_message(user_vk_id, message, kb.build())

    async def send_event_reminder(
        self, expert_id: int, event_name: str, event_date: datetime
    ):
        time_str = event_date.strftime("%H:%M")
        message = (
            f"⏰ Напоминание!\n\n"
            f"Ваше мероприятие «{event_name}» начнется сегодня в {time_str}."
        )
        # Можно добавить кнопку для перехода в приложение
        await self.send_message(expert_id, message)

    async def close(self):
        if self.bot:
            await self.bot.close()
