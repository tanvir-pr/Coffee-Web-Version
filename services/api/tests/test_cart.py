from fastapi.testclient import TestClient

from app.main import app
from app.services.cart import add_line, unit_price

client = TestClient(app)


def test_unit_price_uses_the_server_size_price() -> None:
    prices = {"S": "4.90", "M": "5.40", "L": "5.90"}
    assert unit_price(prices, "L") == "5.90"
    assert unit_price(prices, "S") == "4.90"
    assert unit_price(prices, "XL") is None


def test_identical_recipes_stack() -> None:
    line = {
        "product_slug": "matcha-latte",
        "size": "M",
        "milk": "oat",
        "temp": "hot",
        "sugar": 0,
        "shots": 1,
        "syrups": [],
        "foam": True,
        "art": "leaf",
        "quantity": 1,
        "unit_price": "5.40",
        "currency": "USD",
        "name": "Matcha Latte",
    }
    once = add_line([], line)
    twice = add_line(once, line)
    assert len(twice) == 1
    assert twice[0]["quantity"] == 2


def test_add_prices_from_the_catalog(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    stored: dict[str, list[dict[str, object]]] = {}

    async def fake_read(guest_id: str) -> list[dict[str, object]]:
        return list(stored.get(guest_id, []))

    async def fake_write(guest_id: str, items: list[dict[str, object]]) -> None:
        stored[guest_id] = items

    class Product:
        slug = "matcha-latte"
        name = "Matcha Latte"
        is_active = True
        prices = {"S": "4.90", "M": "5.40", "L": "5.90"}
        currency = "USD"

    class Session:
        async def __aenter__(self) -> "Session":
            return self

        async def __aexit__(self, *_exc: object) -> None:
            return None

        async def scalar(self, _query: object) -> Product:
            return Product()

    monkeypatch.setattr("app.api.v1.cart.read_cart", fake_read)
    monkeypatch.setattr("app.api.v1.cart.write_cart", fake_write)
    monkeypatch.setattr("app.api.v1.cart.get_sessionmaker", lambda: Session)

    response = client.post(
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
            "unit_price": "0.01",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["unit_price"] == "5.90"
    assert body["total"] == "5.90"
    assert body["count"] == 1

    again = client.get("/v1/cart")
    assert again.status_code == 200
    assert again.json()["count"] == 1
