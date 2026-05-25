import hashlib
import hmac
import json
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal

from app.core.errors import Problem

SIGNATURE_SKEW_SECONDS = 300


def to_cents(amount: str) -> int:
    return int((Decimal(amount) * 100).quantize(Decimal("1")))


def stripe_form(amount: str, currency: str, order_id: str) -> dict[str, str]:
    return {
        "amount": str(to_cents(amount)),
        "currency": currency.lower(),
        "automatic_payment_methods[enabled]": "true",
        "metadata[order_id]": order_id,
    }


def dev_intent(order_id: str) -> tuple[str, str]:
    return f"dev_pi_{order_id}", f"dev_secret_{order_id}"


def create_stripe_intent(
    secret: str, amount: str, currency: str, order_id: str, idempotency_key: str
) -> tuple[str, str]:
    body = urllib.parse.urlencode(stripe_form(amount, currency, order_id)).encode()
    request = urllib.request.Request(
        "https://api.stripe.com/v1/payment_intents",
        data=body,
        method="POST",
    )
    request.add_header("Authorization", f"Bearer {secret}")
    request.add_header("Idempotency-Key", idempotency_key)
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode())
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise Problem(
            502,
            "PAYMENT_UNAVAILABLE",
            "Payment unavailable",
            "The card payment could not be started.",
        ) from exc
    intent_id = payload.get("id")
    client_secret = payload.get("client_secret")
    if not isinstance(intent_id, str) or not isinstance(client_secret, str):
        raise Problem(
            502,
            "PAYMENT_UNAVAILABLE",
            "Payment unavailable",
            "The card payment could not be started.",
        )
    return intent_id, client_secret


def verify_stripe_signature(payload: bytes, header: str | None, secret: str, now: int) -> None:
    if not secret:
        raise Problem(
            503, "WEBHOOK_UNCONFIGURED", "Webhook unconfigured", "The webhook secret is missing."
        )
    if not header:
        raise Problem(400, "WEBHOOK_SIGNATURE", "Invalid signature", "Stripe-Signature is missing.")
    parts = dict(item.split("=", 1) for item in header.split(",") if "=" in item)
    timestamp = parts.get("t")
    signatures = [item.split("=", 1)[1] for item in header.split(",") if item.startswith("v1=")]
    if timestamp is None or not signatures:
        raise Problem(
            400, "WEBHOOK_SIGNATURE", "Invalid signature", "Stripe-Signature is malformed."
        )
    try:
        stamp = int(timestamp)
    except ValueError as exc:
        raise Problem(
            400, "WEBHOOK_SIGNATURE", "Invalid signature", "Stripe-Signature is malformed."
        ) from exc
    if abs(now - stamp) > SIGNATURE_SKEW_SECONDS:
        raise Problem(400, "WEBHOOK_SIGNATURE", "Invalid signature", "Stripe-Signature is too old.")
    signed = f"{timestamp}.".encode() + payload
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, candidate) for candidate in signatures):
        raise Problem(
            400, "WEBHOOK_SIGNATURE", "Invalid signature", "Stripe-Signature does not match."
        )
