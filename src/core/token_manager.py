# НОВЫЙ ФАЙЛ
import asyncio
from collections import defaultdict
import json
import redis.asyncio as redis
from typing import Dict

class TokenManager:
    """
    Управляет кешированием и блокировками для токенов доступа,
    чтобы предотвратить состояние гонки при одновременных запросах к VK API.
    """
    def __init__(self, redis_client: redis.Redis, cache_lifetime: int):
        self._redis = redis_client
        self._cache_lifetime = cache_lifetime
        # Блокировки существуют только в памяти одного рабочего процесса и на короткое время
        self._locks: Dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    def get_lock(self, token: str) -> asyncio.Lock:
        """Возвращает объект блокировки для конкретного токена."""
        return self._locks[token]

    async def get_user_from_cache(self, token: str) -> Dict | None:
        """Пытается получить данные пользователя из кеша Redis."""
        cache_key = f"token:{token}"
        cached_user_str = await self._redis.get(cache_key)
        if cached_user_str:
            return json.loads(cached_user_str)
        return None

    async def set_user_to_cache(self, token: str, user_data: Dict):
        """Сохраняет данные пользователя в кеш Redis."""
        cache_key = f"token:{token}"
        # Преобразуем datetime в строку перед сохранением
        if user_data.get("registration_date"):
             user_data["registration_date"] = user_data["registration_date"].isoformat()

        await self._redis.setex(cache_key, self._cache_lifetime, json.dumps(user_data))