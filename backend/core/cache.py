import redis.asyncio as aioredis
import orjson
from core.config import settings
from typing import Any, Optional

_redis: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def cache_get(key: str) -> Optional[Any]:
    r = await get_redis()
    val = await r.get(key)
    if val:
        return orjson.loads(val)
    return None


async def cache_set(key: str, value: Any, ttl: int = 300):
    r = await get_redis()
    await r.setex(key, ttl, orjson.dumps(value, default=str))


async def cache_delete(key: str):
    r = await get_redis()
    await r.delete(key)


async def cache_clear_pattern(pattern: str):
    r = await get_redis()
    keys = await r.keys(pattern)
    if keys:
        await r.delete(*keys)
