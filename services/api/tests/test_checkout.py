import hashlib
import hmac
import json
import time
import uuid
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.errors import Problem
from app.core.guest import sign_guest_id
from app.db.session import dispose_engine, get_sessionmaker
from app.main import app
from app.services.catalog import seed_if_empty
from app.services.checkout import quote_amounts
from app.services.payments import stripe_form, to_cents, verify_stripe_signature

MATCHA = {
    "product_slug": "matcha-latte",
    "size": "L",
    "milk": "oat",
    "temp": "hot",
    "sugar": 0,
    "shots": 1,
    "syrups": [],
    "foam": True,
    "art": "leaf",
    "quantity": 1,
    "unit_price": "0.01",
}


def _seed(client: TestClient) -> None:
    async def run() -> None:
        sessionmaker = get_sessionmaker()
        async with sessionmaker() as session:
            await seed_if_empty(session)

    assert client.portal is not None
    client.portal.call(run)


def _close(client: TestClient) -> None:
    assert client.portal is not None
    client.portal.call(dispose_engine)


def _order(client: TestClient, method: str) -> dict[str, object]:
    added = client.post("/v1/cart/items", json=MATCHA)
    assert added.status_code == 200
    response = client.post(
        "/v1/orders",
        headers={"Idempotency-Key": uuid.uuid4().hex},
        json={"payment_method": method, "contact_name": "Alex", "contact_phone": "5550100"},
    )
    assert response.status_code == 201
    body = response.json()
    assert isinstance(body, dict)
    return body


def test_quote_uses_the_server_price_and_tax() -> None:
    assert quote_amounts([("5.90", 1)], Decimal("0.0800")) == ("5.90", "0.47", "6.37")
    assert to_cents("6.37") == 637
    assert stripe_form("6.37", "USD", "order-1")["amount"] == "637"


def test_signature_rejects_a_stale_or_mismatched_header() -> None:
    payload = b"{}"
    now = 1_700_000_000
    secret = "whsec_test"
    digest = hmac.new(secret.encode(), f"{now}.".encode() + payload, hashlib.sha256).hexdigest()
    verify_stripe_signature(payload, f"t={now},v1={digest}", secret, now)
    with pytest.raises(Problem) as stale:
        verify_stripe_signature(payload, f"t={now - 301},v1={digest}", secret, now)
    assert stale.value.code == "WEBHOOK_SIGNATURE"
    with pytest.raises(Problem):
        verify_stripe_signature(payload, f"t={now},v1={'ab' * 32}", secret, now)


def test_cash_checkout_prices_tax_and_replays() -> None:
    with TestClient(app) as client:
        _seed(client)
        _cash_checkout(client)
        _close(client)


def _cash_checkout(client: TestClient) -> None:
    added = client.post("/v1/cart/items", json=MATCHA)
    assert added.status_code == 200
    quote = client.get("/v1/checkout/quote")
    assert quote.status_code == 200
    assert quote.json()["tax"] == "0.47"
    assert quote.json()["total"] == "6.37"
    key = uuid.uuid4().hex
    first = client.post(
        "/v1/orders",
        headers={"Idempotency-Key": key},
        json={"payment_method": "cash", "contact_name": "Alex"},
    )
    assert first.status_code == 201
    body = first.json()
    assert body["items"][0]["unit_price"] == "5.90"
    assert body["total"] == "6.37"
    assert body["status"] == "received"
    assert body["payment_status"] == "unpaid_cash"
    replay = client.post(
        "/v1/orders",
        headers={"Idempotency-Key": key},
        json={"payment_method": "cash", "contact_name": "Alex"},
    )
    assert replay.status_code == 200
    assert replay.json()["id"] == body["id"]
    fetched = client.get(f"/v1/orders/{body['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["code"] == body["code"]
    assert client.get("/v1/cart").json()["count"] == 0
    missing = client.post(
        "/v1/orders",
        json={"payment_method": "cash", "contact_name": "Alex"},
    )
    assert missing.status_code == 400
    assert missing.json()["code"] == "IDEMPOTENCY_KEY_REQUIRED"
    client.cookies.set("crema_guest", sign_guest_id(str(uuid.uuid4()), get_settings().jwt_secret))
    hidden = client.get(f"/v1/orders/{body['id']}")
    assert hidden.status_code == 404


def test_dev_card_and_signed_webhook_mark_the_order_paid() -> None:
    with TestClient(app) as client:
        _seed(client)
        _card_checkout(client)
        _close(client)


def _card_checkout(client: TestClient) -> None:
    pending = _order(client, "card")
    assert pending["status"] == "pending_payment"
    assert str(pending["client_secret"]).startswith("dev_secret_")
    settings = get_settings()
    previous = settings.stripe_webhook_secret
    settings.stripe_webhook_secret = "whsec_test"
    try:
        payload = json.dumps(
            {
                "id": f"evt_{uuid.uuid4().hex}",
                "type": "payment_intent.succeeded",
                "data": {"object": {"id": pending["provider_intent_id"]}},
            }
        ).encode()
        stamp = int(time.time())
        digest = hmac.new(b"whsec_test", f"{stamp}.".encode() + payload, hashlib.sha256).hexdigest()
        paid = client.post(
            "/v1/webhooks/stripe",
            content=payload,
            headers={
                "Stripe-Signature": f"t={stamp},v1={digest}",
                "content-type": "application/json",
            },
        )
        assert paid.status_code == 200
        assert client.get(f"/v1/orders/{pending['id']}").json()["payment_status"] == "paid"
        again = client.post(
            "/v1/webhooks/stripe",
            content=payload,
            headers={
                "Stripe-Signature": f"t={stamp},v1={digest}",
                "content-type": "application/json",
            },
        )
        assert again.status_code == 200
    finally:
        settings.stripe_webhook_secret = previous

    second = _order(client, "card")
    confirmed = client.post(f"/v1/orders/{second['id']}/confirm-dev")
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "received"
    assert confirmed.json()["payment_status"] == "paid"
