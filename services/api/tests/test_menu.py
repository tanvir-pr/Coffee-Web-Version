from fastapi.testclient import TestClient

from app.core.errors import Problem
from app.main import app
from app.services.menu_order import daypart_for, make_etag

client = TestClient(app)

SAMPLE = {
    "store": {"slug": "riverside", "name": "Crema Riverside", "prep_minutes": 6},
    "daypart": "night",
    "categories": [
        {
            "slug": "bakery",
            "name": "Bakery",
            "sort": {"morning": 5, "afternoon": 5, "night": 1},
            "products": [
                {
                    "id": "11111111-1111-4111-8111-111111111111",
                    "slug": "vegan-brownie",
                    "name": "Vegan Brownie",
                    "description": "Dense cocoa brownie.",
                    "price": "3.80",
                    "currency": "USD",
                    "prices": {"M": "3.80"},
                    "customizable": False,
                    "tags": ["vegan"],
                    "allergens": ["gluten"],
                    "kcal": 320,
                    "caffeine_mg": 15,
                }
            ],
        }
    ],
}


def test_daypart_matches_the_three_theme_stops() -> None:
    assert daypart_for(19, 30) == "night"
    assert daypart_for(18, 0) == "night"
    assert daypart_for(17, 59) == "afternoon"
    assert daypart_for(12, 0) == "afternoon"
    assert daypart_for(6, 0) == "morning"
    assert daypart_for(5, 59) == "night"


def test_etag_is_stable() -> None:
    assert make_etag('{"ok":true}') == make_etag('{"ok":true}')
    assert make_etag("a") != make_etag("b")


def test_menu_returns_etag_and_304(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    async def fake_load(_session, _store, _daypart):  # type: ignore[no-untyped-def]
        return SAMPLE

    async def fake_get(_key: str) -> None:
        return None

    stored: dict[str, str] = {}

    async def fake_set(key: str, value: str) -> None:
        stored[key] = value

    monkeypatch.setattr("app.api.v1.menu.load_menu", fake_load)
    monkeypatch.setattr("app.api.v1.menu.cache_get", fake_get)
    monkeypatch.setattr("app.api.v1.menu.cache_set", fake_set)

    first = client.get("/v1/menu?store=riverside&daypart=night")
    assert first.status_code == 200
    assert first.json()["categories"][0]["products"][0]["name"] == "Vegan Brownie"
    etag = first.headers["etag"]
    second = client.get("/v1/menu?store=riverside&daypart=night", headers={"If-None-Match": etag})
    assert second.status_code == 304


def test_missing_store_is_a_problem(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    async def missing(_session, _store, _daypart):  # type: ignore[no-untyped-def]
        raise Problem(404, "STORE_NOT_FOUND", "Store not found", "No store 'missing'.")

    async def fake_get(_key: str) -> None:
        return None

    async def fake_set(_key: str, _value: str) -> None:
        return None

    monkeypatch.setattr("app.api.v1.menu.load_menu", missing)
    monkeypatch.setattr("app.api.v1.menu.cache_get", fake_get)
    monkeypatch.setattr("app.api.v1.menu.cache_set", fake_set)
    response = client.get("/v1/menu?store=missing&daypart=morning")
    assert response.status_code == 404
    assert response.json()["code"] == "STORE_NOT_FOUND"
