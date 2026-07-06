import json
import time
import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.errors import Problem
from app.db.session import get_sessionmaker
from app.services.checkout import (
    apply_payment_event,
    confirm_dev_payment,
    load_order,
    order_payload,
    place_order,
    quote_cart,
)
from app.services.payments import verify_stripe_signature
from app.services.tracking import events_for

router = APIRouter()


class QuoteLine(BaseModel):
    name: str
    quantity: int
    unit_price: str


class QuoteOut(BaseModel):
    subtotal: str
    discount: str = "0.00"
    tax: str
    total: str
    currency: str
    tax_rate: str
    prep_minutes: int
    store_name: str
    reward_available: bool = False
    reward_applied: bool = False
    items: list[QuoteLine]


class OrderLineOut(BaseModel):
    name: str
    product_slug: str | None = None
    size: str
    milk: str
    temp: str
    quantity: int
    unit_price: str


class EventOut(BaseModel):
    id: int
    status: str
    reason: str | None
    at: str


class OrderOut(BaseModel):
    id: str
    code: str
    status: str
    fulfilment: str
    payment_method: str
    payment_status: str
    subtotal: str
    discount: str
    tip: str
    tax: str
    total: str
    currency: str
    contact_name: str
    prep_minutes: int | None
    provider: str | None
    client_secret: str | None
    provider_intent_id: str | None
    items: list[OrderLineOut]
    events: list[EventOut] = Field(default_factory=list)


class OrderIn(BaseModel):
    store: str = "riverside"
    fulfilment: Literal["pickup"] = "pickup"
    payment_method: Literal["card", "cash"]
    contact_name: str = Field(min_length=1, max_length=80)
    contact_phone: str | None = Field(default=None, max_length=32)
    slot_start: str | None = None
    apply_reward: bool = False


def _guest(request: Request) -> str:
    guest_id = getattr(request.state, "guest_id", None)
    if not isinstance(guest_id, str) or not guest_id:
        raise Problem(
            401, "GUEST_REQUIRED", "Guest session required", "The guest cookie is missing."
        )
    return guest_id


def _idempotency_key(request: Request) -> str:
    key = request.headers.get("idempotency-key", "").strip()
    if len(key) < 8 or len(key) > 64:
        raise Problem(
            400,
            "IDEMPOTENCY_KEY_REQUIRED",
            "Idempotency key required",
            "Send an Idempotency-Key between 8 and 64 characters.",
        )
    return key


@router.get("/checkout/quote", response_model=QuoteOut)
async def get_quote(
    request: Request, store: str = "riverside", apply_reward: bool = False
) -> QuoteOut:
    raw_user = getattr(request.state, "user_id", None)
    user_id = uuid.UUID(raw_user) if isinstance(raw_user, str) else None
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        payload = await quote_cart(
            session,
            _guest(request),
            store,
            apply_reward=apply_reward,
            user_id=user_id,
        )
    return QuoteOut.model_validate(payload)


@router.post("/orders", response_model=OrderOut)
async def post_order(request: Request, body: OrderIn) -> JSONResponse:
    phone = body.contact_phone.strip() if body.contact_phone else None
    slot = datetime.fromisoformat(body.slot_start) if body.slot_start else None
    raw_user = getattr(request.state, "user_id", None)
    user_id = uuid.UUID(raw_user) if isinstance(raw_user, str) else None
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        payload, created = await place_order(
            session,
            _guest(request),
            store_slug=body.store,
            name=body.contact_name.strip(),
            phone=phone or None,
            payment_method=body.payment_method,
            idempotency_key=_idempotency_key(request),
            user_id=user_id,
            slot_start=slot,
            apply_reward=body.apply_reward,
        )
    return JSONResponse(status_code=201 if created else 200, content=payload)


@router.get("/orders/{order_id}", response_model=OrderOut)
async def get_order(request: Request, order_id: uuid.UUID) -> OrderOut:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        order, items, payment = await load_order(session, order_id, _guest(request))
        events = await events_for(session, order.id)
    return OrderOut.model_validate(order_payload(order, items, payment, events))


@router.post("/orders/{order_id}/confirm-dev", response_model=OrderOut)
async def post_confirm_dev(request: Request, order_id: uuid.UUID) -> OrderOut:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        payload = await confirm_dev_payment(session, order_id, _guest(request))
    return OrderOut.model_validate(payload)


@router.post("/webhooks/stripe")
async def post_stripe_webhook(request: Request) -> JSONResponse:
    payload = await request.body()
    verify_stripe_signature(
        payload,
        request.headers.get("stripe-signature"),
        get_settings().stripe_webhook_secret,
        int(time.time()),
    )
    try:
        event = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise Problem(
            400, "WEBHOOK_BODY", "Invalid webhook", "The webhook body is not JSON."
        ) from exc
    event_id = event.get("id") if isinstance(event, dict) else None
    event_type = event.get("type") if isinstance(event, dict) else None
    if not isinstance(event_id, str) or not isinstance(event_type, str):
        raise Problem(400, "WEBHOOK_BODY", "Invalid webhook", "The webhook event is incomplete.")
    data = event.get("data") if isinstance(event, dict) else None
    intent = data.get("object") if isinstance(data, dict) else None
    intent_id = intent.get("id") if isinstance(intent, dict) else None
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        await apply_payment_event(
            session, event_id, event_type, intent_id if isinstance(intent_id, str) else None
        )
    return JSONResponse({"received": True})
