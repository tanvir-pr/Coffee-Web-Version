import uuid

from fastapi.testclient import TestClient
from tests.test_checkout import MATCHA, _close, _seed

from app.main import app
from app.services.tracking import next_status, sse_status


def test_stages_move_forward_and_corrections_are_new_events() -> None:
    assert next_status("received") == "grinding"
    assert next_status("collected") is None
    assert next_status("pending_payment") is None
    body = sse_status({"id": 4, "status": "brewing", "reason": None, "at": "t"})
    assert body.startswith("id: 4\n")
    assert "event: status\n" in body

    with TestClient(app) as client:
        _seed(client)
        assert client.post("/v1/cart/items", json=MATCHA).status_code == 200
        created = client.post(
            "/v1/orders",
            headers={"Idempotency-Key": uuid.uuid4().hex},
            json={"payment_method": "cash", "contact_name": "Alex"},
        )
        assert created.status_code == 201
        order = created.json()
        assert order["status"] == "received"
        assert order["events"][0]["status"] == "received"
        key = {"X-KDS-Key": "dev-kds-token"}
        queued = client.get("/v1/kds/orders", headers=key)
        assert queued.status_code == 200
        assert order["code"] in [row["code"] for row in queued.json()]
        hidden = client.post(
            f"/v1/kds/orders/{order['id']}/transition",
            json={"status": "grinding"},
        )
        assert hidden.status_code == 401
        skipped = client.post(
            f"/v1/kds/orders/{order['id']}/transition",
            headers=key,
            json={"status": "ready"},
        )
        assert skipped.status_code == 409
        moved = client.post(
            f"/v1/kds/orders/{order['id']}/transition",
            headers=key,
            json={"status": "grinding"},
        )
        assert moved.status_code == 200
        assert moved.json()["status"] == "grinding"
        note = client.post(
            f"/v1/kds/orders/{order['id']}/transition",
            headers=key,
            json={"status": "grinding", "reason": "Beans reweighed"},
        )
        assert note.status_code == 200
        detail = client.get(f"/v1/orders/{order['id']}")
        assert [event["status"] for event in detail.json()["events"]] == [
            "received",
            "grinding",
            "grinding",
        ]
        assert detail.json()["events"][-1]["reason"] == "Beans reweighed"
        bare_cancel = client.post(
            f"/v1/kds/orders/{order['id']}/transition",
            headers=key,
            json={"status": "cancelled"},
        )
        assert bare_cancel.status_code == 422
        _close(client)
