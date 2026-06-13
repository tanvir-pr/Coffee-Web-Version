import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.db.session import dispose_engine, get_sessionmaker
from app.main import app
from app.services.catalog import seed_if_empty
from app.services.loyalty import line_points, reward_steps, tier_for
from app.services.places import ensure_store_profile, open_label


def test_tier_and_open_hours() -> None:
    assert tier_for(0)[0] == "oat"
    assert tier_for(300)[0] == "caramel"
    assert tier_for(1000)[1] == "Gold Crema"
    assert tier_for(2500)[0] == "berry"
    assert reward_steps(9) == 0
    assert reward_steps(10) == 1
    assert reward_steps(25) == 2
    assert line_points(Decimal("5.90"), 1) == 5
    moment = datetime(2026, 10, 28, 10, 0, tzinfo=ZoneInfo("Europe/London"))
    assert open_label(moment, "07:00", "21:00", False) == (True, "Open · till 21:00")
    assert open_label(moment, "07:00", "21:00", True) == (False, "Closed")


def _prepare(client: TestClient) -> None:
    async def run() -> None:
        sessionmaker = get_sessionmaker()
        async with sessionmaker() as session:
            await seed_if_empty(session)
            await ensure_store_profile(session)

    assert client.portal is not None
    client.portal.call(run)


def _close(client: TestClient) -> None:
    assert client.portal is not None
    client.portal.call(dispose_engine)


def test_sign_in_stamps_slots_and_reservations() -> None:
    email = f"alex-{uuid.uuid4().hex[:8]}@crema.test"
    with TestClient(app) as client:
        _prepare(client)
        requested = client.post("/v1/auth/magic-link", json={"email": email})
        assert requested.status_code == 200
        token = requested.json()["dev_token"]
        signed = client.post("/v1/auth/magic-link/consume", json={"token": token})
        assert signed.status_code == 200
        assert signed.json()["email"] == email
        assert client.post("/v1/auth/magic-link/consume", json={"token": token}).status_code == 400

        added = client.post(
            "/v1/cart/items",
            json={
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
            },
        )
        assert added.status_code == 200
        placed = client.post(
            "/v1/orders",
            headers={"Idempotency-Key": uuid.uuid4().hex},
            json={"payment_method": "cash", "contact_name": "Alex"},
        )
        assert placed.status_code == 201
        order_id = placed.json()["id"]
        key = {"X-KDS-Key": get_settings().kds_token}
        for status in ("grinding", "brewing", "steaming", "ready", "collected"):
            moved = client.post(
                f"/v1/kds/orders/{order_id}/transition",
                headers=key,
                json={"status": status},
            )
            assert moved.status_code == 200
        loyalty = client.get("/v1/me/loyalty")
        assert loyalty.status_code == 200
        body = loyalty.json()
        assert body["stamps"] == 1
        assert body["beans"] == 5
        assert body["tier"] == "oat"
        assert body["stamps_until_reward"] == 9
        corrected = client.post(
            f"/v1/kds/orders/{order_id}/transition",
            headers=key,
            json={"status": "collected", "reason": "recount"},
        )
        assert corrected.status_code == 200
        assert client.get("/v1/me/loyalty").json()["stamps"] == 1
        assert client.post("/v1/me/loyalty/redeem").status_code == 409

        stores = client.get("/v1/stores")
        assert stores.status_code == 200
        slugs = {row["slug"] for row in stores.json()}
        assert {"riverside", "camden"} <= slugs

        day = (date.today() + timedelta(days=1)).isoformat()
        slots = client.get(f"/v1/stores/riverside/slots?day={day}")
        assert slots.status_code == 200
        first = slots.json()["slots"][0]["start"]
        held = client.post("/v1/stores/riverside/slots/hold", json={"start": first})
        assert held.status_code == 200
        assert held.json()["hold_seconds"] == 300

        booked = client.post(
            "/v1/reservations",
            json={
                "store": "riverside",
                "party": 4,
                "area": "indoor",
                "starts_at": first,
                "contact_name": "Alex",
                "contact_phone": "5550100",
            },
        )
        assert booked.status_code == 200
        reservation = booked.json()
        calendar = client.get(
            f"/v1/reservations/{reservation['id']}/calendar",
            params={"token": reservation["cancel_token"]},
        )
        assert calendar.status_code == 200
        assert "BEGIN:VEVENT" in calendar.text
        cancelled = client.post(
            f"/v1/reservations/{reservation['id']}/cancel",
            json={"token": reservation["cancel_token"]},
        )
        assert cancelled.json()["status"] == "cancelled"
        options = client.post("/v1/auth/passkey/register/options")
        assert options.status_code == 200
        assert "challenge" in options.json()
        rejected = client.post("/v1/auth/passkey/register", json={"credential": {}})
        assert rejected.status_code == 400
        _close(client)


def test_guest_collection_does_not_stamp() -> None:
    with TestClient(app) as client:
        try:
            _prepare(client)
            assert client.get("/v1/me").status_code == 401
        finally:
            _close(client)
