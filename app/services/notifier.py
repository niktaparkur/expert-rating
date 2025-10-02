import os
from typing import Optional
from aionvk import Bot, Button, KeyboardBuilder  # Убедись, что aionvk установлен
from dotenv import load_dotenv

# Загружаем переменные окружения, чтобы получить ID админа и приложения
load_dotenv()

ADMIN_ID = int(os.environ.get("ADMIN_ID", 0))
APP_ID = int(os.environ.get("APP_ID", 0))


class Notifier:
    def __init__(self, token: str):
        if not token:
            print("WARNING: VK_BOT_TOKEN is not set. Notifier will not send messages.")
            self.bot = None
        else:
            self.bot = Bot(token=token)

    async def send_new_request_to_admin(self, user_data: dict):
        if not self.bot:
            return

        vk_id = user_data.get('vk_id')
        first_name = user_data.get('first_name', '')
        last_name = user_data.get('last_name', '')

        user_link = f"https://vk.com/id{vk_id}"
        message = (
            f"🔔 Новая заявка на регистрацию эксперта!\n\n"
            f"👤 Пользователь: {first_name} {last_name} ({user_link})\n"
            f"📝 Регалии: {user_data.get('regalia', 'не указано')}"
        )

        kb = KeyboardBuilder(inline=True)
        # Deep-link для перехода в админку, в раздел конкретной заявки
        deep_link = f"https://vk.com/app{APP_ID}#admin/requests/{vk_id}"
        kb.add(Button.open_link("Рассмотреть заявку", link=deep_link))

        try:
            await self.bot.send_message(peer_id=ADMIN_ID, text=message, keyboard=kb.build())
        except Exception as e:
            print(f"Failed to send admin notification: {e}")

    async def send_moderation_result(self, vk_id: int, approved: bool, reason: Optional[str] = None):
        if not self.bot:
            return

        if approved:
            message = "✅ Ваша заявка на регистрацию в 'Рейтинге экспертов' одобрена! Теперь вам доступен личный кабинет в приложении."
        else:
            message = f"❌ К сожалению, ваша заявка была отклонена.\nПричина: {reason or 'не указана'}"

        try:
            await self.bot.send_message(peer_id=vk_id, text=message)
        except Exception as e:
            print(f"Failed to send moderation result to {vk_id}: {e}")

    async def close(self):
        if self.bot:
            await self.bot.close()