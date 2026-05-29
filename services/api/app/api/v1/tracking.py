import asyncio
import time
import uuid
from collections.abc import AsyncIterator
from typing import Literal

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.errors import Problem
from app.db.models import Order
from app.db.session import get_sessionmaker
from app.services.checkout import load_order
from app.services.tracking import (
    HEARTBEAT_SECONDS,
    advance,
    event_dict,
    events_for,
    kds_orders,
    require_kds,
    sse_status,
)

router = APIRouter()

Stage = Literal["received", "grinding", "brewing", "steaming", "ready", "collected", "cancelled"]


class TransitionIn(BaseModel):
    status: Stage
    reason: str | None = Field(default=None, max_length=200)


class KdsOrderOut(BaseModel):
    id: str
    code: str
    status: str
    contact_name: str
    items: list[str]


def _guest(request: Request) -> str:
    guest_id = getattr(request.state, "guest_id", None)
    if not isinstance(guest_id, str) or not guest_id:
        raise Problem(
            401, "GUEST_REQUIRED", "Guest session required", "The guest cookie is missing."
        )
    return guest_id


def _kds(request: Request) -> None:
    require_kds(request.headers.get("x-kds-key"), get_settings().kds_token)


@router.get("/kds/orders", response_model=list[KdsOrderOut])
async def get_kds_orders(request: Request, store: str = "riverside") -> list[KdsOrderOut]:
    _kds(request)
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        rows = await kds_orders(session, store)
    return [KdsOrderOut.model_validate(row) for row in rows]


@router.post("/kds/orders/{order_id}/transition", response_model=KdsOrderOut)
async def post_transition(request: Request, order_id: uuid.UUID, body: TransitionIn) -> KdsOrderOut:
    _kds(request)
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        order = await session.get(Order, order_id)
        if order is None:
            raise Problem(
                404, "ORDER_NOT_FOUND", "Order not found", "That order is not in the queue."
            )
        await advance(session, order, body.status, body.reason.strip() if body.reason else None)
        items = await kds_orders(session, "riverside")
    match = next((row for row in items if row["id"] == str(order_id)), None)
    if match is None:
        return KdsOrderOut(
            id=str(order.id),
            code=order.code,
            status=order.status,
            contact_name=order.contact_name,
            items=[],
        )
    return KdsOrderOut.model_validate(match)


@router.get("/orders/{order_id}/events")
async def get_order_events(request: Request, order_id: uuid.UUID) -> StreamingResponse:
    guest_id = _guest(request)
    last_header = request.headers.get("last-event-id")
    try:
        last_id = int(last_header) if last_header else 0
    except ValueError:
        last_id = 0
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        await load_order(session, order_id, guest_id)

    async def generate() -> AsyncIterator[str]:
        cursor = last_id
        beat = time.monotonic()
        yield "retry: 3000\n\n"
        while True:
            if await request.is_disconnected():
                return
            async with sessionmaker() as session:
                order = await session.get(Order, order_id)
                if order is None or order.guest_id != guest_id:
                    return
                fresh = [event_dict(event) for event in await events_for(session, order_id)]
            sent = False
            for event in fresh:
                if int(event["id"]) <= cursor:
                    continue
                yield sse_status(event)
                cursor = int(event["id"])
                sent = True
            now = time.monotonic()
            if sent:
                beat = now
            elif now - beat >= HEARTBEAT_SECONDS:
                yield ": heartbeat\n\n"
                beat = now
            await asyncio.sleep(1)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
