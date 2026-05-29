import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Store(Base):
    __tablename__ = "stores"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    timezone: Mapped[str] = mapped_column(String(64))
    prep_minutes: Mapped[int] = mapped_column(Integer, default=6)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), default=Decimal("0.0800"))


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    sort_morning: Mapped[int] = mapped_column(Integer)
    sort_afternoon: Mapped[int] = mapped_column(Integer)
    sort_night: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    products: Mapped[list["Product"]] = relationship(back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id"))
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    description: Mapped[str] = mapped_column(String(240))
    prices: Mapped[dict[str, str]] = mapped_column(JSON)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    tags: Mapped[list[str]] = mapped_column(JSON)
    allergens: Mapped[list[str]] = mapped_column(JSON)
    kcal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    caffeine_mg: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sort: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    category: Mapped[Category] = relationship(back_populates="products")
    availability: Mapped[list["ProductStore"]] = relationship(back_populates="product")


class ProductStore(Base):
    __tablename__ = "product_store"
    __table_args__ = (UniqueConstraint("product_id", "store_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stores.id"))
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    price_override: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    product: Mapped[Product] = relationship(back_populates="availability")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    guest_id: Mapped[str] = mapped_column(String(36), index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stores.id"))
    code: Mapped[str] = mapped_column(String(8), unique=True)
    status: Mapped[str] = mapped_column(String(32))
    fulfilment: Mapped[str] = mapped_column(String(16))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    discount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    tip: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    tax: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3))
    payment_method: Mapped[str] = mapped_column(String(16))
    payment_status: Mapped[str] = mapped_column(String(16))
    idempotency_key: Mapped[str] = mapped_column(String(64), unique=True)
    contact_name: Mapped[str] = mapped_column(String(80))
    contact_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"))
    product_slug: Mapped[str] = mapped_column(String(80))
    name: Mapped[str] = mapped_column(String(120))
    size: Mapped[str] = mapped_column(String(1))
    milk: Mapped[str] = mapped_column(String(16))
    temp: Mapped[str] = mapped_column(String(8))
    sugar: Mapped[int] = mapped_column(Integer)
    shots: Mapped[int] = mapped_column(Integer)
    syrups: Mapped[list[str]] = mapped_column(JSON)
    foam: Mapped[bool] = mapped_column(Boolean)
    art: Mapped[str] = mapped_column(String(16))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"))
    provider: Mapped[str] = mapped_column(String(16))
    provider_intent_id: Mapped[str] = mapped_column(String(80), unique=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3))
    status: Mapped[str] = mapped_column(String(16))
    client_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)


class OrderEvent(Base):
    __tablename__ = "order_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), index=True)
    status: Mapped[str] = mapped_column(String(32))
    reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    event_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    provider: Mapped[str] = mapped_column(String(16))
    event_type: Mapped[str] = mapped_column(String(80))
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


def display_price(prices: dict[str, Any]) -> str:
    raw = prices.get("M")
    if raw is None and prices:
        raw = next(iter(prices.values()))
    if raw is None:
        return "0.00"
    return f"{Decimal(str(raw)):.2f}"
