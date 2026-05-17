from typing import Literal

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel
from sqlalchemy import select
from starlette.responses import Response

from app.db.models import Store
from app.db.session import get_sessionmaker
from app.services.cache import cache_get, cache_set, menu_cache_key, pack_cached, unpack_cached
from app.services.catalog import load_menu, local_daypart
from app.services.menu_order import Daypart, make_etag

router = APIRouter()


class MenuSort(BaseModel):
    morning: int
    afternoon: int
    night: int


class MenuProductOut(BaseModel):
    id: str
    slug: str
    name: str
    description: str
    price: str
    currency: str
    prices: dict[str, str]
    customizable: bool
    tags: list[str]
    allergens: list[str]
    kcal: int | None
    caffeine_mg: int | None


class MenuCategoryOut(BaseModel):
    slug: str
    name: str
    sort: MenuSort
    products: list[MenuProductOut]


class MenuStoreOut(BaseModel):
    slug: str
    name: str
    prep_minutes: int


class MenuOut(BaseModel):
    store: MenuStoreOut
    daypart: Daypart
    categories: list[MenuCategoryOut]


@router.get("/menu", response_model=MenuOut)
async def get_menu(
    request: Request,
    store: str = Query(default="riverside"),
    daypart: Literal["morning", "afternoon", "night"] | None = None,
) -> Response:
    resolved = daypart or await _store_daypart(store)
    key = menu_cache_key(store, resolved)
    cached = unpack_cached(await cache_get(key) or "")
    if cached is None:
        sessionmaker = get_sessionmaker()
        async with sessionmaker() as session:
            payload = MenuOut.model_validate(await load_menu(session, store, resolved))
        body = payload.model_dump_json()
        etag = make_etag(body)
        await cache_set(key, pack_cached(body, etag))
    else:
        body, etag = cached
    headers = {"ETag": etag, "Cache-Control": "public, max-age=60"}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=headers)
    return Response(content=body, media_type="application/json", headers=headers)


async def _store_daypart(store_slug: str) -> Daypart:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        timezone = await session.scalar(select(Store.timezone).where(Store.slug == store_slug))
    if timezone is None:
        return "afternoon"
    return local_daypart(timezone)
