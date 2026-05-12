import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Store(Base):
    __tablename__ = "stores"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    timezone: Mapped[str] = mapped_column(String(64))
    prep_minutes: Mapped[int] = mapped_column(Integer, default=6)


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


def display_price(prices: dict[str, Any]) -> str:
    raw = prices.get("M")
    if raw is None and prices:
        raw = next(iter(prices.values()))
    if raw is None:
        return "0.00"
    return f"{Decimal(str(raw)):.2f}"
