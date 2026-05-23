import json
import uuid
from decimal import Decimal
from typing import Any

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import get_settings

CART_TTL_SECONDS = 60 * 60 * 24 * 7
MAX_QUANTITY = 20


def unit_price(prices: dict[str, Any], size: str) -> str | None:
    raw = prices.get(size)
    if raw is None:
        return None
    return f"{Decimal(str(raw)):.2f}"


def line_signature(line: dict[str, Any]) -> str:
    syrups = line.get("syrups")
    syrup_key = ",".join(sorted(syrups)) if isinstance(syrups, list) else ""
    return "|".join(
        [
            str(line.get("product_slug")),
            str(line.get("size")),
            str(line.get("milk")),
            str(line.get("temp")),
            str(line.get("sugar")),
            str(line.get("shots")),
            syrup_key,
            str(line.get("foam")),
            str(line.get("art")),
        ]
    )


def add_line(items: list[dict[str, Any]], line: dict[str, Any]) -> list[dict[str, Any]]:
    signature = line_signature(line)
    updated = [dict(item) for item in items]
    for item in updated:
        if line_signature(item) == signature:
            item["quantity"] = min(MAX_QUANTITY, int(item["quantity"]) + int(line["quantity"]))
            return updated
    created = dict(line)
    created["id"] = str(uuid.uuid4())
    created["quantity"] = min(MAX_QUANTITY, int(line["quantity"]))
    updated.append(created)
    return updated


def cart_total(items: list[dict[str, Any]]) -> tuple[int, str]:
    count = 0
    total = Decimal("0.00")
    for item in items:
        quantity = int(item["quantity"])
        count += quantity
        total += Decimal(str(item["unit_price"])) * quantity
    return count, f"{total:.2f}"


def cart_key(guest_id: str) -> str:
    return f"cart:{guest_id}"


async def read_cart(guest_id: str) -> list[dict[str, Any]]:
    client = Redis.from_url(get_settings().redis_url, socket_connect_timeout=0.3)
    try:
        raw = await client.get(cart_key(guest_id))
    except (RedisError, OSError):
        return []
    finally:
        await client.aclose()
    if raw is None:
        return []
    text = raw.decode() if isinstance(raw, bytes) else str(raw)
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


async def write_cart(guest_id: str, items: list[dict[str, Any]]) -> None:
    client = Redis.from_url(get_settings().redis_url, socket_connect_timeout=0.3)
    try:
        if items:
            await client.set(cart_key(guest_id), json.dumps(items), ex=CART_TTL_SECONDS)
        else:
            await client.delete(cart_key(guest_id))
    except (RedisError, OSError) as exc:
        raise RuntimeError("cart store unavailable") from exc
    finally:
        await client.aclose()
