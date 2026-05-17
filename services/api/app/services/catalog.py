import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import Problem
from app.db.models import Category, Product, ProductStore, Store, display_price
from app.services.menu_order import Daypart, daypart_for

SEED_NAMESPACE = uuid.UUID("6f0c1c3e-1b7a-4c1e-9a3d-2c6a3b1e9d10")
PLAIN_GOODS = frozenset({"bakery", "beans"})


def seed_id(name: str) -> uuid.UUID:
    return uuid.uuid5(SEED_NAMESPACE, name)


def _product(
    slug: str,
    name: str,
    description: str,
    prices: dict[str, str],
    tags: list[str],
    allergens: list[str],
    kcal: int | None,
    caffeine_mg: int | None,
    sort: int,
) -> dict[str, object]:
    return {
        "slug": slug,
        "name": name,
        "description": description,
        "prices": prices,
        "tags": tags,
        "allergens": allergens,
        "kcal": kcal,
        "caffeine_mg": caffeine_mg,
        "sort": sort,
    }


CATEGORIES: list[dict[str, object]] = [
    {
        "slug": "espresso",
        "name": "Espresso",
        "sort_morning": 1,
        "sort_afternoon": 4,
        "sort_night": 3,
        "products": [
            _product(
                "oat-flat-white",
                "Oat Flat White",
                "Short ristretto with steamed oat milk.",
                {"S": "4.80", "M": "5.40", "L": "5.90"},
                ["vegan"],
                ["oat"],
                120,
                150,
                1,
            ),
            _product(
                "espresso",
                "Espresso",
                "A double shot, served short.",
                {"S": "3.20", "M": "3.20", "L": "3.80"},
                [],
                [],
                10,
                125,
                2,
            ),
            _product(
                "decaf-americano",
                "Decaf Americano",
                "Long black without the caffeine.",
                {"S": "3.60", "M": "4.10", "L": "4.50"},
                ["decaf"],
                [],
                15,
                8,
                3,
            ),
        ],
    },
    {
        "slug": "cold-brew",
        "name": "Cold Brew & Nitro",
        "sort_morning": 4,
        "sort_afternoon": 1,
        "sort_night": 5,
        "products": [
            _product(
                "berry-cold-brew",
                "Berry Cold Brew",
                "Slow brew with a berry syrup band.",
                {"M": "5.40", "L": "5.90"},
                ["iced", "vegan"],
                [],
                90,
                180,
                1,
            ),
            _product(
                "nitro-cold-brew",
                "Nitro Cold Brew",
                "Charged cold brew, cascading tan foam.",
                {"M": "5.20", "L": "5.70"},
                ["iced", "vegan"],
                [],
                15,
                200,
                2,
            ),
        ],
    },
    {
        "slug": "matcha-tea",
        "name": "Matcha & Tea",
        "sort_morning": 2,
        "sort_afternoon": 2,
        "sort_night": 2,
        "products": [
            _product(
                "iced-matcha",
                "Iced Matcha",
                "Ceremonial matcha shaken over ice.",
                {"M": "5.40", "L": "5.90"},
                ["iced", "vegan"],
                ["oat"],
                140,
                70,
                1,
            ),
            _product(
                "matcha-latte",
                "Matcha Latte",
                "Whisked matcha with steamed oat milk.",
                {"S": "4.90", "M": "5.40", "L": "5.90"},
                ["vegan"],
                ["oat"],
                160,
                70,
                2,
            ),
            _product(
                "decaf-chai",
                "Decaf Chai",
                "Spiced tea, no caffeine, oat milk.",
                {"M": "4.80", "L": "5.30"},
                ["decaf", "vegan"],
                ["oat"],
                180,
                0,
                3,
            ),
        ],
    },
    {
        "slug": "signature",
        "name": "Signature",
        "sort_morning": 3,
        "sort_afternoon": 3,
        "sort_night": 4,
        "products": [
            _product(
                "pumpkin-oat-latte",
                "Pumpkin Oat Latte",
                "Seasonal pumpkin spice over oat milk.",
                {"M": "5.80", "L": "6.30"},
                ["vegan"],
                ["oat"],
                220,
                140,
                1,
            ),
            _product(
                "night-mocha",
                "Night Decaf Mocha",
                "Cocoa and decaf espresso, served after dusk.",
                {"M": "5.60", "L": "6.10"},
                ["decaf"],
                ["milk"],
                240,
                10,
                2,
            ),
        ],
    },
    {
        "slug": "bakery",
        "name": "Bakery",
        "sort_morning": 5,
        "sort_afternoon": 5,
        "sort_night": 1,
        "products": [
            _product(
                "almond-croissant",
                "Almond Croissant",
                "Toasted, with frangipane.",
                {"M": "4.20"},
                [],
                ["gluten", "nuts", "milk"],
                380,
                0,
                1,
            ),
            _product(
                "vegan-brownie",
                "Vegan Brownie",
                "Dense cocoa brownie, no dairy.",
                {"M": "3.80"},
                ["vegan"],
                ["gluten"],
                320,
                15,
                2,
            ),
            _product(
                "gf-cookie",
                "Gluten-free Cookie",
                "Brown butter cookie without gluten.",
                {"M": "3.20"},
                ["gf"],
                ["milk", "nuts"],
                210,
                0,
                3,
            ),
        ],
    },
    {
        "slug": "beans",
        "name": "Merch & Beans",
        "sort_morning": 6,
        "sort_afternoon": 6,
        "sort_night": 6,
        "products": [
            _product(
                "house-beans",
                "House Beans",
                "250 g, chocolate and red fruit.",
                {"M": "14.00"},
                [],
                [],
                None,
                None,
                1,
            ),
            _product(
                "decaf-beans",
                "Decaf Beans",
                "250 g Swiss-water decaf.",
                {"M": "15.00"},
                ["decaf"],
                [],
                None,
                None,
                2,
            ),
        ],
    },
]


def _seed_int(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise TypeError("catalog seed expected an int")
    return value


def _seed_strings(value: object) -> list[str]:
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise TypeError("catalog seed expected a list of strings")
    return value


def _seed_prices(value: object) -> dict[str, str]:
    if not isinstance(value, dict):
        raise TypeError("catalog seed expected prices")
    return {str(key): str(amount) for key, amount in value.items()}


async def seed_if_empty(session: AsyncSession) -> None:
    existing = await session.scalar(select(Store.id).limit(1))
    if existing is not None:
        return
    store = Store(
        id=seed_id("store:riverside"),
        name="Crema Riverside",
        slug="riverside",
        timezone="Europe/London",
        prep_minutes=6,
    )
    session.add(store)
    for category_row in CATEGORIES:
        products = category_row["products"]
        assert isinstance(products, list)
        category = Category(
            id=seed_id(f"category:{category_row['slug']}"),
            name=str(category_row["name"]),
            slug=str(category_row["slug"]),
            sort_morning=_seed_int(category_row["sort_morning"]),
            sort_afternoon=_seed_int(category_row["sort_afternoon"]),
            sort_night=_seed_int(category_row["sort_night"]),
            is_active=True,
        )
        session.add(category)
        for product_row in products:
            assert isinstance(product_row, dict)
            product = Product(
                id=seed_id(f"product:{product_row['slug']}"),
                category_id=category.id,
                name=str(product_row["name"]),
                slug=str(product_row["slug"]),
                description=str(product_row["description"]),
                prices=_seed_prices(product_row["prices"]),
                currency="USD",
                tags=_seed_strings(product_row["tags"]),
                allergens=_seed_strings(product_row["allergens"]),
                kcal=product_row["kcal"] if isinstance(product_row["kcal"], int) else None,
                caffeine_mg=product_row["caffeine_mg"]
                if isinstance(product_row["caffeine_mg"], int)
                else None,
                sort=_seed_int(product_row["sort"]),
                is_active=True,
            )
            session.add(product)
            session.add(
                ProductStore(
                    id=seed_id(f"availability:{product.slug}"),
                    product_id=product.id,
                    store_id=store.id,
                    available=True,
                )
            )
    await session.commit()


def local_daypart(timezone: str, now: datetime | None = None) -> Daypart:
    moment = now or datetime.now(ZoneInfo(timezone))
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=ZoneInfo(timezone))
    local = moment.astimezone(ZoneInfo(timezone))
    return daypart_for(local.hour, local.minute)


async def load_menu(session: AsyncSession, store_slug: str, daypart: Daypart) -> dict[str, object]:
    store = await session.scalar(select(Store).where(Store.slug == store_slug))
    if store is None:
        raise Problem(404, "STORE_NOT_FOUND", "Store not found", f"No store '{store_slug}'.")
    categories = (
        await session.scalars(
            select(Category)
            .where(Category.is_active.is_(True))
            .options(selectinload(Category.products).selectinload(Product.availability))
        )
    ).all()
    sort_field = {"morning": "sort_morning", "afternoon": "sort_afternoon", "night": "sort_night"}[
        daypart
    ]
    ordered = sorted(categories, key=lambda category: getattr(category, sort_field))
    payload_categories: list[dict[str, object]] = []
    for category in ordered:
        products = [product for product in category.products if _is_sold(product, store.id)]
        products.sort(
            key=lambda product: (
                0 if daypart == "night" and "decaf" in product.tags else 1,
                product.sort,
            )
        )
        if not products:
            continue
        payload_categories.append(
            {
                "slug": category.slug,
                "name": category.name,
                "sort": {
                    "morning": category.sort_morning,
                    "afternoon": category.sort_afternoon,
                    "night": category.sort_night,
                },
                "products": [
                    {
                        "id": str(product.id),
                        "slug": product.slug,
                        "name": product.name,
                        "description": product.description,
                        "price": display_price(product.prices),
                        "currency": product.currency,
                        "prices": {
                            str(size): str(amount) for size, amount in product.prices.items()
                        },
                        "customizable": category.slug not in PLAIN_GOODS,
                        "tags": product.tags,
                        "allergens": product.allergens,
                        "kcal": product.kcal,
                        "caffeine_mg": product.caffeine_mg,
                    }
                    for product in products
                ],
            }
        )
    return {
        "store": {"slug": store.slug, "name": store.name, "prep_minutes": store.prep_minutes},
        "daypart": daypart,
        "categories": payload_categories,
    }


def _is_sold(product: Product, store_id: uuid.UUID) -> bool:
    if not product.is_active:
        return False
    rows = [row for row in product.availability if row.store_id == store_id]
    if not rows:
        return False
    return all(row.available for row in rows)
