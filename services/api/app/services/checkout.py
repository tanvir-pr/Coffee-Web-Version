import secrets
import uuid
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import Problem
from app.db.models import Order, OrderEvent, OrderItem, Payment, Product, Store, WebhookEvent
from app.services.cart import read_cart, unit_price, write_cart
from app.services.payments import create_stripe_intent, dev_intent
from app.services.places import claim_slot
from app.services.tracking import event_dict, events_for, record_received

MONEY = Decimal("0.01")


def quote_amounts(unit_prices: list[tuple[str, int]], tax_rate: Decimal) -> tuple[str, str, str]:
    subtotal = sum((Decimal(price) * quantity for price, quantity in unit_prices), Decimal("0.00"))
    subtotal = subtotal.quantize(MONEY)
    tax = (subtotal * tax_rate).quantize(MONEY, rounding=ROUND_HALF_UP)
    total = (subtotal + tax).quantize(MONEY)
    return f"{subtotal:.2f}", f"{tax:.2f}", f"{total:.2f}"


def money(value: Decimal | str) -> str:
    return f"{Decimal(str(value)).quantize(MONEY):.2f}"


async def _store(session: AsyncSession, slug: str) -> Store:
    store = await session.scalar(select(Store).where(Store.slug == slug))
    if store is None:
        raise Problem(404, "STORE_NOT_FOUND", "Store not found", f"No store '{slug}'.")
    return store


async def priced_lines(session: AsyncSession, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    priced: list[dict[str, Any]] = []
    for item in items:
        slug = str(item.get("product_slug"))
        product = await session.scalar(select(Product).where(Product.slug == slug))
        if product is None or not product.is_active:
            raise Problem(404, "PRODUCT_NOT_FOUND", "Drink not found", f"No drink '{slug}'.")
        size = str(item.get("size"))
        price = unit_price(product.prices, size)
        if price is None:
            raise Problem(
                422, "SIZE_UNAVAILABLE", "Size unavailable", f"{size} is not sold for this drink."
            )
        syrups = item.get("syrups")
        priced.append(
            {
                "product_slug": product.slug,
                "name": product.name,
                "size": size,
                "milk": str(item.get("milk")),
                "temp": str(item.get("temp")),
                "sugar": int(item.get("sugar") or 0),
                "shots": int(item.get("shots") or 1),
                "syrups": syrups if isinstance(syrups, list) else [],
                "foam": bool(item.get("foam")),
                "art": str(item.get("art")),
                "quantity": int(item.get("quantity") or 1),
                "unit_price": price,
                "currency": product.currency,
            }
        )
    return priced


async def quote_cart(session: AsyncSession, guest_id: str, store_slug: str) -> dict[str, Any]:
    store = await _store(session, store_slug)
    lines = await priced_lines(session, await read_cart(guest_id))
    subtotal, tax, total = quote_amounts(
        [(str(line["unit_price"]), int(line["quantity"])) for line in lines],
        Decimal(str(store.tax_rate)),
    )
    currency = str(lines[0]["currency"]) if lines else "USD"
    return {
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "currency": currency,
        "tax_rate": f"{Decimal(str(store.tax_rate)):.4f}",
        "prep_minutes": store.prep_minutes,
        "store_name": store.name,
        "items": [
            {
                "name": line["name"],
                "quantity": line["quantity"],
                "unit_price": line["unit_price"],
            }
            for line in lines
        ],
    }


async def _pickup_code(session: AsyncSession) -> str:
    for _ in range(5):
        code = secrets.token_hex(4).upper()
        taken = await session.scalar(select(Order.id).where(Order.code == code))
        if taken is None:
            return code
    raise Problem(
        503, "CODE_UNAVAILABLE", "Code unavailable", "A pickup code could not be reserved."
    )


async def load_order(
    session: AsyncSession, order_id: uuid.UUID, guest_id: str
) -> tuple[Order, list[OrderItem], Payment | None]:
    order = await session.get(Order, order_id)
    if order is None or order.guest_id != guest_id:
        raise Problem(
            404, "ORDER_NOT_FOUND", "Order not found", "That order is not on this guest session."
        )
    items = list(await session.scalars(select(OrderItem).where(OrderItem.order_id == order.id)))
    payment = await session.scalar(select(Payment).where(Payment.order_id == order.id))
    return order, items, payment


def order_payload(
    order: Order,
    items: list[OrderItem],
    payment: Payment | None,
    events: list[OrderEvent] | None = None,
) -> dict[str, Any]:
    return {
        "id": str(order.id),
        "code": order.code,
        "status": order.status,
        "fulfilment": order.fulfilment,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "subtotal": money(order.subtotal),
        "discount": money(order.discount),
        "tip": money(order.tip),
        "tax": money(order.tax),
        "total": money(order.total),
        "currency": order.currency,
        "contact_name": order.contact_name,
        "prep_minutes": None,
        "provider": None if payment is None else payment.provider,
        "client_secret": None if payment is None else payment.client_secret,
        "provider_intent_id": None if payment is None else payment.provider_intent_id,
        "items": [
            {
                "name": item.name,
                "size": item.size,
                "milk": item.milk,
                "temp": item.temp,
                "quantity": item.quantity,
                "unit_price": money(item.unit_price),
            }
            for item in items
        ],
        "events": [event_dict(event) for event in events or []],
    }


async def place_order(
    session: AsyncSession,
    guest_id: str,
    *,
    store_slug: str,
    name: str,
    phone: str | None,
    payment_method: str,
    idempotency_key: str,
    user_id: uuid.UUID | None = None,
    slot_start: datetime | None = None,
) -> tuple[dict[str, Any], bool]:
    existing = await session.scalar(select(Order).where(Order.idempotency_key == idempotency_key))
    if existing is not None:
        if existing.guest_id != guest_id:
            raise Problem(
                409,
                "IDEMPOTENCY_CONFLICT",
                "Idempotency conflict",
                "That idempotency key belongs to another guest.",
            )
        order, items, payment = await load_order(session, existing.id, guest_id)
        events = await events_for(session, order.id)
        return order_payload(order, items, payment, events), False

    cart = await read_cart(guest_id)
    if not cart:
        raise Problem(422, "CART_EMPTY", "Cart is empty", "Add a drink before checkout.")
    store = await _store(session, store_slug)
    lines = await priced_lines(session, cart)
    subtotal, tax, total = quote_amounts(
        [(str(line["unit_price"]), int(line["quantity"])) for line in lines],
        Decimal(str(store.tax_rate)),
    )
    paid_cash = payment_method == "cash"
    if slot_start is not None:
        await claim_slot(session, store, slot_start, guest_id)
    order = Order(
        id=uuid.uuid4(),
        guest_id=guest_id,
        store_id=store.id,
        code=await _pickup_code(session),
        status="received" if paid_cash else "pending_payment",
        fulfilment="pickup",
        subtotal=Decimal(subtotal),
        discount=Decimal("0.00"),
        tip=Decimal("0.00"),
        tax=Decimal(tax),
        total=Decimal(total),
        currency=str(lines[0]["currency"]),
        payment_method=payment_method,
        payment_status="unpaid_cash" if paid_cash else "pending",
        idempotency_key=idempotency_key,
        contact_name=name,
        contact_phone=phone,
        user_id=user_id,
        slot_start=slot_start,
    )
    session.add(order)
    item_rows: list[OrderItem] = []
    for line in lines:
        row = OrderItem(
            id=uuid.uuid4(),
            order_id=order.id,
            product_slug=str(line["product_slug"]),
            name=str(line["name"]),
            size=str(line["size"]),
            milk=str(line["milk"]),
            temp=str(line["temp"]),
            sugar=int(line["sugar"]),
            shots=int(line["shots"]),
            syrups=list(line["syrups"]),
            foam=bool(line["foam"]),
            art=str(line["art"]),
            quantity=int(line["quantity"]),
            unit_price=Decimal(str(line["unit_price"])),
        )
        item_rows.append(row)
        session.add(row)
    provider = "cash" if paid_cash else get_settings().payment_provider
    if paid_cash:
        intent_id, secret = f"cash_{order.id}", None
        pay_status = "unpaid_cash"
    elif provider == "stripe":
        intent_id, secret = create_stripe_intent(
            get_settings().stripe_secret_key,
            total,
            order.currency,
            str(order.id),
            idempotency_key,
        )
        pay_status = "pending"
    else:
        intent_id, secret = dev_intent(str(order.id))
        pay_status = "pending"
    payment = Payment(
        id=uuid.uuid4(),
        order_id=order.id,
        provider=provider,
        provider_intent_id=intent_id,
        amount=Decimal(total),
        currency=order.currency,
        status=pay_status,
        client_secret=secret,
    )
    session.add(payment)
    if paid_cash:
        await record_received(session, order)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        replay = await session.scalar(select(Order).where(Order.idempotency_key == idempotency_key))
        if replay is None or replay.guest_id != guest_id:
            raise Problem(
                409,
                "IDEMPOTENCY_CONFLICT",
                "Idempotency conflict",
                "That order was already started.",
            ) from exc
        order, items, payment = await load_order(session, replay.id, guest_id)
        events = await events_for(session, order.id)
        return order_payload(order, items, payment, events), False
    try:
        await write_cart(guest_id, [])
    except RuntimeError:
        pass
    events = await events_for(session, order.id)
    payload = order_payload(order, item_rows, payment, events)
    payload["prep_minutes"] = store.prep_minutes
    return payload, True


async def confirm_dev_payment(
    session: AsyncSession, order_id: uuid.UUID, guest_id: str
) -> dict[str, Any]:
    if get_settings().payment_provider != "dev":
        raise Problem(404, "NOT_FOUND", "Not found", "Test payment is unavailable.")
    order, items, payment = await load_order(session, order_id, guest_id)
    if payment is None or payment.provider != "dev":
        raise Problem(
            409,
            "PAYMENT_STATE",
            "Payment cannot be confirmed",
            "This order is not a test card payment.",
        )
    if order.status == "pending_payment":
        order.status = "received"
        order.payment_status = "paid"
        payment.status = "paid"
        await record_received(session, order)
        await session.commit()
    events = await events_for(session, order.id)
    return order_payload(order, items, payment, events)


async def apply_payment_event(
    session: AsyncSession, event_id: str, event_type: str, intent_id: str | None
) -> None:
    seen = await session.get(WebhookEvent, event_id)
    if seen is not None:
        return
    session.add(WebhookEvent(event_id=event_id, provider="stripe", event_type=event_type))
    if event_type == "payment_intent.succeeded" and intent_id:
        payment = await session.scalar(
            select(Payment).where(Payment.provider_intent_id == intent_id)
        )
        if payment is not None:
            order = await session.get(Order, payment.order_id)
            if order is not None and order.status == "pending_payment":
                order.status = "received"
                order.payment_status = "paid"
                payment.status = "paid"
                await record_received(session, order)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
