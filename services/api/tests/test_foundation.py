from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.flags import anim_flags, season_for_month
from app.core.guest import read_guest_id, sign_guest_id
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_config_sets_a_stable_guest_cookie(client: TestClient) -> None:
    first = client.get("/v1/config")
    assert first.status_code == 200
    body = first.json()
    assert body["season"] == season_for_month(datetime.now().month)
    assert body["kill_switch"] is False
    assert body["flags"]["anim"] == anim_flags()
    assert body["flags"]["anim"]["01"] is True
    assert body["flags"]["anim"]["06"] is False
    guest = client.cookies["crema_guest"]
    assert read_guest_id(guest, get_settings().jwt_secret) is not None

    second = client.get("/v1/config")
    assert client.cookies["crema_guest"] == guest
    assert "set-cookie" not in second.headers


def test_invalid_guest_cookie_is_replaced(client: TestClient) -> None:
    client.cookies.set("crema_guest", "not-a-token")
    response = client.get("/v1/config")
    token = response.headers["set-cookie"].split(";", 1)[0].removeprefix("crema_guest=")
    assert token != "not-a-token"
    assert read_guest_id(token, get_settings().jwt_secret) is not None


def test_unknown_route_is_problem_json(client: TestClient) -> None:
    response = client.get("/v1/missing")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    body = response.json()
    assert body["code"] == "NOT_FOUND"
    assert body["instance"] == "/v1/missing"


def test_guest_signature_rejects_tampering() -> None:
    token = sign_guest_id("11111111-1111-1111-1111-111111111111", "secret")
    assert read_guest_id(token, "secret") == "11111111-1111-1111-1111-111111111111"
    assert read_guest_id(token + "x", "secret") is None


def test_season_boundaries() -> None:
    assert season_for_month(12) == "winter"
    assert season_for_month(2) == "winter"
    assert season_for_month(3) == "spring"
    assert season_for_month(6) == "summer"
    assert season_for_month(9) == "autumn"
    assert season_for_month(11) == "autumn"
