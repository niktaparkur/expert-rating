from datetime import datetime, timezone, timedelta
from typing import Optional
import os
import httpx
import json
from loguru import logger

from src.core.config import settings
from src.schemas import event_schemas
from src.models import Event

VK_API_VERSION = "5.199"
VK_API_URL = "https://api.vk.com/method/"


class Notifier:
    def __init__(self, token: str):
        if not token:
            print("WARNING: VK_BOT_TOKEN is not set. Notifier will not send messages.")
            self.token = None
            self.client = None
        else:
            self.token = token
            self.client = httpx.AsyncClient()

    async def _call_api(self, method: str, params: dict):
        if not self.client or not self.token:
            return None

        base_params = {
            "access_token": self.token,
            "v": VK_API_VERSION,
        }
        try:
            response = await self.client.post(
                f"{VK_API_URL}{method}", data={**base_params, **params}
            )
            response.raise_for_status()
            data = response.json()
            if "error" in data:
                logger.error(
                    f"VK API Error in method '{method}': {data['error']['error_msg']}"
                )
                return None
            return data.get("response")
        except httpx.HTTPStatusError as e:
            logger.error(
                f"HTTP error calling VK API method '{method}': {e.response.status_code} {e.response.text}"
            )
        except Exception as e:
            logger.error(
                f"An unexpected error occurred in _call_api for method '{method}': {e}"
            )
        return None

    async def is_messages_allowed(self, user_id: int) -> bool:
        if not self.client or not self.token:
            return False

        response = await self._call_api(
            "messages.isMessagesFromGroupAllowed",
            {"group_id": settings.VK_GROUP_ID, "user_id": user_id},
        )
        return response and response.get("is_allowed") == 1

    async def send_message(
        self, peer_id: int, message: str, keyboard=None, attachment=None
    ):
        can_send = await self.is_messages_allowed(user_id=peer_id)
        if not can_send:
            logger.warning(
                f"Cannot send message to user {peer_id}: permission denied by user."
            )
            return

        params = {
            "peer_id": peer_id,
            "message": message,
            "random_id": 0,
        }
        if keyboard:
            params["keyboard"] = json.dumps(keyboard)
        if attachment:
            params["attachment"] = attachment

        await self._call_api("messages.send", params)

    async def send_document(self, user_id: int, file_path: str, message: str):
        if not self.client:
            return
        try:
            upload_server_info = await self._call_api(
                "docs.getMessagesUploadServer", {"type": "doc", "peer_id": user_id}
            )
            if not upload_server_info or "upload_url" not in upload_server_info:
                raise Exception("Failed to get VK upload URL.")
            upload_url = upload_server_info["upload_url"]

            with open(file_path, "rb") as f:
                upload_response = await self.client.post(
                    upload_url,
                    files={"file": (os.path.basename(file_path), f, "application/pdf")},
                )
                upload_result = upload_response.json()

            if "file" not in upload_result:
                raise Exception(
                    f"Failed to upload file to VK server. Response: {upload_result}"
                )

            saved_doc_info = await self._call_api(
                "docs.save",
                {"file": upload_result["file"], "title": os.path.basename(file_path)},
            )

            if not saved_doc_info or "doc" not in saved_doc_info:
                raise Exception(
                    f"Failed to save document on VK server. Response: {saved_doc_info}"
                )

            doc = saved_doc_info["doc"]
            doc_attachment = f"doc{doc['owner_id']}_{doc['id']}"

            await self.send_message(user_id, message, attachment=doc_attachment)
            print(f"Successfully sent document to user {user_id}")

        except Exception as e:
            print(f"Failed to send document to {user_id}: {e}")
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)

    async def post_announcement_to_wall(
        self, event: Event, expert_name: str
    ) -> int | None:
        if event.event_date.tzinfo is None:
            event_date_utc = event.event_date.replace(tzinfo=timezone.utc)
        else:
            event_date_utc = event.event_date

        msk_tz = timezone(timedelta(hours=3))
        event_date_msk = event_date_utc.astimezone(msk_tz)

        event_date_str = event_date_msk.strftime("%d.%m.%Y в %H:%M")

        app_link = f"https://vk.com/app{settings.VK_APP_ID}"

        message = (
            f"📢 Анонс мероприятия!\n\n"
            f"Эксперт {expert_name} проведет «{event.name}».\n"
            f"📅 Когда: {event_date_str} (МСК)\n\n"
        )

        if event.description:
            message += f"{event.description}\n\n"

        message += (
            f"Подробности и предстоящие события ищите в нашем приложении: {app_link}"
        )

        params = {
            "owner_id": -settings.VK_GROUP_ID,
            "from_group": 1,
            "message": message,
        }
        response = await self._call_api("wall.post", params)
        return response.get("post_id") if response else None

    async def delete_wall_post(self, post_id: int):
        params = {
            "owner_id": -settings.VK_GROUP_ID,
            "post_id": post_id,
        }
        await self._call_api("wall.delete", params)
        print(f"Successfully deleted wall post {post_id}.")

    async def send_new_request_to_admin(self, user_data: dict):
        vk_id = user_data.get("vk_id")
        first_name = user_data.get("first_name", "")
        last_name = user_data.get("last_name", "")
        message = (
            f"🔔 Новая заявка на регистрацию эксперта!\n\n"
            f"👤 Пользователь: {first_name} {last_name} (vk.com/id{vk_id})"
        )
        deep_link = f"https://vk.com/app{settings.VK_APP_ID}#/admin?vk_id={vk_id}"
        keyboard = {
            "inline": True,
            "buttons": [
                [
                    {
                        "action": {
                            "type": "open_link",
                            "label": "Рассмотреть заявку",
                            "link": deep_link,
                        }
                    }
                ]
            ],
        }
        await self.send_message(settings.ADMIN_ID, message, keyboard=keyboard)

    async def send_new_event_to_admin(self, event_name: str, expert_name: str):
        message = (
            f"📅 Новое мероприятие на модерацию!\n\n"
            f"Название: «{event_name}»\n"
            f"От эксперта: {expert_name}"
        )
        deep_link = f"https://vk.com/app{settings.VK_APP_ID}#/admin"
        keyboard = {
            "inline": True,
            "buttons": [
                [
                    {
                        "action": {
                            "type": "open_link",
                            "label": "В админ-панель",
                            "link": deep_link,
                        }
                    }
                ]
            ],
        }
        await self.send_message(settings.ADMIN_ID, message, keyboard=keyboard)

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
        is_private: bool,
        reason: Optional[str] = None,
    ):
        if approved:
            if is_private:
                message = f"✅ Ваше приватное мероприятие «{event_name}» одобрено. Оно не будет отображаться в общей афише."
            else:
                message = f"✅ Ваше мероприятие «{event_name}» одобрено и скоро появится в афише!"
        else:
            message = f"❌ Ваше мероприятие «{event_name}» отклонено.\nПричина: {reason or 'не указана'}"
        await self.send_message(expert_id, message)

    async def send_new_vote_notification(
        self, expert_id: int, vote_data: event_schemas.VoteCreate
    ):
        vote_type_text = (
            "👍 (доверяю)" if vote_data.vote_type == "trust" else "👎 (не доверяю)"
        )
        message = f"🗳️ Новый голос на мероприятии!\n\nВы получили новый голос: {vote_type_text}\nМероприятие: {vote_data.promo_word}"
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

        deep_link = f"https://vk.com/app{settings.VK_APP_ID}#/expert/{expert_vk_id}"
        keyboard = {
            "inline": True,
            "buttons": [
                [
                    {
                        "action": {
                            "type": "open_link",
                            "label": "Перейти к профилю",
                            "link": deep_link,
                        }
                    }
                ]
            ],
        }
        await self.send_message(user_vk_id, message, keyboard=keyboard)

    async def send_event_reminder(
        self, expert_id: int, event_name: str, event_date: datetime
    ):
        time_str = event_date.strftime("%H:%M")
        message = f"⏰ Напоминание!\n\nВаше мероприятие «{event_name}» начнется сегодня в {time_str}."
        await self.send_message(expert_id, message)

    async def close(self):
        if self.client:
            await self.client.aclose()
