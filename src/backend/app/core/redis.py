from typing import Any, Optional
import json

import redis.asyncio as redis


class RedisManager:
    _instance: Optional["RedisManager"] = None
    _client: Optional[redis.Redis] = None

    def __new__(cls) -> "RedisManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def connect(self, host: str = "localhost", port: int = 6379, db: int = 0) -> None:
        if self._client is None:
            self._client = redis.Redis(host=host, port=port, db=db, decode_responses=True)

    async def disconnect(self) -> None:
        if self._client:
            await self._client.close()
            self._client = None

    async def get(self, key: str) -> Optional[str]:
        return await self._client.get(key)

    async def set(self, key: str, value: str, ttl: Optional[int] = None) -> None:
        if ttl:
            await self._client.setex(key, ttl, value)
        else:
            await self._client.set(key, value)

    async def delete(self, key: str) -> None:
        await self._client.delete(key)

    async def exists(self, key: str) -> bool:
        return bool(await self._client.exists(key))

    async def get_json(self, key: str) -> Optional[Any]:
        value = await self.get(key)
        if value:
            return json.loads(value)
        return None

    async def set_json(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        await self.set(key, json.dumps(value), ttl)


redis_manager = RedisManager()
