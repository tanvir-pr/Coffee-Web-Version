import hmac
import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Problem
from app.db.models import Order, OrderEvent, OrderItem, Store

FORWARD = ("received", "grinding", "brewing", "steaming", "ready", "collected")
ACTIVE = ("received", "grinding", "brewing", "steaming", "ready")
HEARTBEAT_SECONDS = 15
POLL_SECONDS = 15


def next_status(status: str) -> str | None:
    if status not in FORWARD:
        return None
    index = FORWARD.index(status)
    if index + 1 >= len(FORWARD):
        return None
    return FORWARD[index + 1]


def keys_match(left: str, right: str) -> bool:
    left_b = left.encode()
    right_b = right.encode()
    if len(left_b) != len(right_b):
        return False
    return hmac.compare_digest(left_b, right_b)


def event_dict(event: OrderEvent) -> dict[str, Any]:
    created = event.created_at
    return {
        "id": event.id,
        "status": event.status,
        "reason": event.reason,
        "at": created.isoformat() if created is not None else "",
    }


def sse_status(event: dict[str, Any]) -> str:
    return f"id: {event['id']}\nevent: status\ndata: {json.dumps(event)}\n\n"


def require_kds(header: str | None, expected: str) -> None:
    if header is None or not keys_match(header, expected):
        raise Problem(401, "KDS_UNAUTHORIZED", "KDS unauthorized", "The barista key is missing.")


async def events_for(session: AsyncSession, order_id: object) -> list[OrderEvent]:
    rows = await session.scalars(
        select(OrderEvent).where(OrderEvent.order_id == order_id).order_by(OrderEvent.id)
    )
    return list(rows)


async def record_received(session: AsyncSession, order: Order) -> None:
    existing = await session.scalar(
        select(OrderEvent.id).where(
            OrderEvent.order_id == order.id, OrderEvent.status == "received"
        )
    )
    if existing is None:
        session.add(OrderEvent(order_id=order.id, status="received", reason=None))


async def advance(session: AsyncSession, order: Order, status: str, reason: str | None) -> Order:
    if order.status == "pending_payment":
        raise Problem(409, "STAGE_ORDER", "Stage not ready", "Payment is still pending.")
    if status == order.status:
        if not reason:
            raise Problem(422, "REASON_REQUIRED", "Reason required", "A correction needs a reason.")
        session.add(OrderEvent(order_id=order.id, status=status, reason=reason))
        await session.commit()
        return order
    if status == "cancelled":
        if order.status in ("collected", "cancelled"):
            raise Problem(
                409, "STAGE_ORDER", "Stage finished", "This order can no longer be cancelled."
            )
        if not reason:
            raise Problem(422, "REASON_REQUIRED", "Reason required", "Cancellation needs a reason.")
        order.status = "cancelled"
        session.add(OrderEvent(order_id=order.id, status="cancelled", reason=reason))
        await session.commit()
        return order
    expected = next_status(order.status)
    if expected is None or status != expected:
        raise Problem(
            409, "STAGE_ORDER", "Stage out of order", f"The next stage is {expected or 'none'}."
        )
    order.status = status
    session.add(OrderEvent(order_id=order.id, status=status, reason=reason))
    await session.commit()
    return order


async def kds_orders(session: AsyncSession, store_slug: str) -> list[dict[str, Any]]:
    store = await session.scalar(select(Store).where(Store.slug == store_slug))
    if store is None:
        raise Problem(404, "STORE_NOT_FOUND", "Store not found", f"No store '{store_slug}'.")
    orders = list(
        await session.scalars(
            select(Order)
            .where(Order.store_id == store.id, Order.status.in_(ACTIVE))
            .order_by(Order.created_at)
        )
    )
    payload: list[dict[str, Any]] = []
    for order in orders:
        items = list(await session.scalars(select(OrderItem).where(OrderItem.order_id == order.id)))
        payload.append(
            {
                "id": str(order.id),
                "code": order.code,
                "status": order.status,
                "contact_name": order.contact_name,
                "items": [f"{item.quantity} × {item.name}" for item in items],
            }
        )
    return payload
