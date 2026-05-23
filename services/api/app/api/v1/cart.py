from typing import Any, Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.errors import Problem
from app.db.models import Product
from app.db.session import get_sessionmaker
from app.services.cart import add_line, cart_total, read_cart, unit_price, write_cart

router = APIRouter()

Milk = Literal["whole", "oat", "almond", "soy", "coconut", "none"]
Syrup = Literal["vanilla", "caramel", "hazelnut", "berry"]
Art = Literal["none", "heart", "leaf", "rosetta"]


class CartItemIn(BaseModel):
    product_slug: str
    size: Literal["S", "M", "L"]
    milk: Milk
    temp: Literal["hot", "iced"]
    sugar: int = Field(ge=0, le=4)
    shots: int = Field(ge=1, le=3)
    syrups: list[Syrup] = Field(default_factory=list)
    foam: bool
    art: Art
    quantity: int = Field(default=1, ge=1, le=10)


class CartLineOut(BaseModel):
    id: str
    product_slug: str
    name: str
    size: str
    milk: str
    temp: str
    sugar: int
    shots: int
    syrups: list[str]
    foam: bool
    art: str
    quantity: int
    unit_price: str
    currency: str


class CartOut(BaseModel):
    count: int
    total: str
    currency: str
    items: list[CartLineOut]


def _guest(request: Request) -> str:
    guest_id = getattr(request.state, "guest_id", None)
    if not isinstance(guest_id, str) or not guest_id:
        raise Problem(
            401, "GUEST_REQUIRED", "Guest session required", "The guest cookie is missing."
        )
    return guest_id


def _view(items: list[dict[str, Any]]) -> CartOut:
    count, total = cart_total(items)
    currency = str(items[0]["currency"]) if items else "USD"
    return CartOut.model_validate(
        {"count": count, "total": total, "currency": currency, "items": items}
    )


@router.get("/cart", response_model=CartOut)
async def get_cart(request: Request) -> CartOut:
    return _view(await read_cart(_guest(request)))


@router.post("/cart/items", response_model=CartOut)
async def post_cart_item(request: Request, body: CartItemIn) -> CartOut:
    guest_id = _guest(request)
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        product = await session.scalar(select(Product).where(Product.slug == body.product_slug))
    if product is None or not product.is_active:
        raise Problem(
            404, "PRODUCT_NOT_FOUND", "Drink not found", f"No drink '{body.product_slug}'."
        )
    price = unit_price(product.prices, body.size)
    if price is None:
        raise Problem(
            422, "SIZE_UNAVAILABLE", "Size unavailable", f"{body.size} is not sold for this drink."
        )
    items = await read_cart(guest_id)
    items = add_line(
        items,
        {
            "product_slug": product.slug,
            "name": product.name,
            "size": body.size,
            "milk": body.milk,
            "temp": body.temp,
            "sugar": body.sugar,
            "shots": body.shots,
            "syrups": body.syrups,
            "foam": body.foam,
            "art": body.art,
            "quantity": body.quantity,
            "unit_price": price,
            "currency": product.currency,
        },
    )
    try:
        await write_cart(guest_id, items)
    except RuntimeError as exc:
        raise Problem(
            503, "CART_UNAVAILABLE", "Cart unavailable", "The cart could not be saved."
        ) from exc
    return _view(items)


@router.delete("/cart/items/{line_id}", response_model=CartOut)
async def delete_cart_item(request: Request, line_id: str) -> CartOut:
    guest_id = _guest(request)
    items = [item for item in await read_cart(guest_id) if str(item.get("id")) != line_id]
    try:
        await write_cart(guest_id, items)
    except RuntimeError as exc:
        raise Problem(
            503, "CART_UNAVAILABLE", "Cart unavailable", "The cart could not be saved."
        ) from exc
    return _view(items)
