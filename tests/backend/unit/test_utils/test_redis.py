import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from app.core.redis import RedisManager


class TestRedisManager:
    @pytest.fixture
    def redis_manager(self, mock_redis):
        manager = RedisManager()
        manager._client = mock_redis
        return manager

    @pytest.mark.asyncio
    async def test_redis_get_set(self, redis_manager, mock_redis):
        mock_redis.get = AsyncMock(return_value="test_value")
        result = await redis_manager.get("test_key")
        assert result == "test_value"
        mock_redis.get.assert_called_once_with("test_key")

        await redis_manager.set("test_key", "new_value", ttl=3600)
        mock_redis.setex.assert_called_once_with("test_key", 3600, "new_value")

    @pytest.mark.asyncio
    async def test_redis_json_operations(self, redis_manager, mock_redis):
        test_data = {"name": "test", "value": 123}
        mock_redis.get = AsyncMock(return_value=json.dumps(test_data))
        result = await redis_manager.get_json("json_key")
        assert result == test_data
        mock_redis.get.assert_called_once_with("json_key")

        await redis_manager.set_json("json_key", test_data, ttl=1800)
        mock_redis.setex.assert_called_once_with("json_key", 1800, json.dumps(test_data))
