
import asyncio
from collections import defaultdict
import json
import redis.asyncio as redis
from typing import Dict


class TokenManager:

    def __init__(self, redis_client: redis.Redis, cache_lifetime: int):
        self._redis = redis_client
        self._cache_lifetime = cache_lifetime
        self._locks: Dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    def get_lock(self, token: str) -> asyncio.Lock:
        return self._locks[token]

    async def get_user_from_cache(self, token: str) -> Dict | None:
        cache_key = f"token:{token}"
        cached_user_str = await self._redis.get(cache_key)
        if cached_user_str:
            return json.loads(cached_user_str)
        return None

    async def set_user_to_cache(self, token: str, user_data: Dict):
        cache_key = f"token:{token}"
        if user_data.get("registration_date"):
            user_data["registration_date"] = user_data["registration_date"].isoformat()

        await self._redis.setex(cache_key, self._cache_lifetime, json.dumps(user_data))
