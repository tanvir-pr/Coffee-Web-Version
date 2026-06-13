import json

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import get_settings

MENU_TTL_SECONDS = 60


async def cache_get(key: str) -> str | None:
    client = Redis.from_url(get_settings().redis_url, socket_connect_timeout=0.3)
    try:
        value = await client.get(key)
    except (RedisError, OSError):
        return None
    finally:
        await client.aclose()
    if value is None:
        return None
    if isinstance(value, bytes):
        return value.decode()
    return str(value)


async def cache_set(key: str, value: str, ttl: int = MENU_TTL_SECONDS) -> None:
    client = Redis.from_url(get_settings().redis_url, socket_connect_timeout=0.3)
    try:
        await client.set(key, value, ex=ttl)
    except (RedisError, OSError):
        return
    finally:
        await client.aclose()


def menu_cache_key(store_slug: str, daypart: str) -> str:
    return f"menu:v2:{store_slug}:{daypart}"


def pack_cached(body: str, etag: str) -> str:
    return json.dumps({"body": body, "etag": etag})


def unpack_cached(raw: str) -> tuple[str, str] | None:
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None
    body = parsed.get("body")
    etag = parsed.get("etag")
    if not isinstance(body, str) or not isinstance(etag, str):
        return None
    return body, etag
