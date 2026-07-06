import uuid
from datetime import date, datetime

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.config import get_settings
from app.core.errors import Problem
from app.db.models import Reservation, Store
from app.db.session import get_sessionmaker
from app.services.places import (
    book_reservation,
    cancel_reservation,
    hold_slot,
    list_stores,
    mark_no_show,
    reservation_ics,
    reservation_payload,
    reservations_today,
    slots_for,
    store_by_slug,
)
from app.services.tracking import require_kds

router = APIRouter()


class SlotIn(BaseModel):
    start: str


class ReservationIn(BaseModel):
    store: str = "riverside"
    party: int = Field(ge=1, le=12)
    area: str
    starts_at: str
    contact_name: str = Field(min_length=1, max_length=80)
    contact_phone: str | None = Field(default=None, max_length=32)
    notes: str | None = Field(default=None, max_length=200)


class CancelIn(BaseModel):
    token: str = Field(min_length=8, max_length=64)


def _guest(request: Request) -> str:
    guest_id = getattr(request.state, "guest_id", None)
    if not isinstance(guest_id, str) or not guest_id:
        raise Problem(
            401, "GUEST_REQUIRED", "Guest session required", "The guest cookie is missing."
        )
    return guest_id


def _user(request: Request) -> uuid.UUID | None:
    raw = getattr(request.state, "user_id", None)
    if not isinstance(raw, str):
        return None
    return uuid.UUID(raw)


@router.get("/stores")
async def get_stores() -> list[dict[str, object]]:
    # #region agent log
    try:
        import json
        import time
        from pathlib import Path

        line = json.dumps({"sessionId":"a14086","hypothesisId":"E","location":"places.py:get_stores","message":"stores start","data":{},"timestamp":int(time.time()*1000)})
        with Path(r"d:\Full-web-2-Project\debug-a14086.log").open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")
    except Exception:
        pass
    # #endregion
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        return await list_stores(session)


@router.get("/stores/{slug}/slots")
async def get_slots(request: Request, slug: str, day: date) -> dict[str, object]:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        return await slots_for(session, slug, day, _guest(request))


@router.post("/stores/{slug}/slots/hold")
async def post_hold(request: Request, slug: str, body: SlotIn) -> dict[str, object]:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        return await hold_slot(session, slug, datetime.fromisoformat(body.start), _guest(request))


@router.post("/reservations")
async def post_reservation(request: Request, body: ReservationIn) -> dict[str, object]:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        reservation = await book_reservation(
            session,
            slug=body.store,
            party=body.party,
            area=body.area,
            starts_at=datetime.fromisoformat(body.starts_at),
            name=body.contact_name.strip(),
            phone=body.contact_phone,
            notes=body.notes,
            user_id=_user(request),
        )
        store = await store_by_slug(session, body.store)
    return reservation_payload(reservation, store)


@router.post("/reservations/{reservation_id}/cancel")
async def post_cancel(reservation_id: uuid.UUID, body: CancelIn) -> dict[str, str]:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        reservation = await cancel_reservation(session, reservation_id, body.token)
    return {"id": str(reservation.id), "status": reservation.status}


@router.get("/reservations/{reservation_id}/calendar")
async def get_calendar(reservation_id: uuid.UUID, token: str) -> Response:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        reservation = await session.get(Reservation, reservation_id)
        if reservation is None or reservation.cancel_token != token:
            raise Problem(
                404, "RESERVATION_NOT_FOUND", "Reservation not found", "That link is not valid."
            )
        found = await session.scalar(select(Store).where(Store.id == reservation.store_id))
        if found is None:
            raise Problem(404, "STORE_NOT_FOUND", "Store not found", "The store is missing.")
        body = reservation_ics(reservation, found)
    return Response(content=body, media_type="text/calendar")


@router.get("/kds/reservations")
async def get_kds_reservations(
    request: Request, store: str = "riverside"
) -> list[dict[str, object]]:
    require_kds(request.headers.get("x-kds-key"), get_settings().kds_token)
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        return await reservations_today(session, store)


@router.post("/kds/reservations/{reservation_id}/no-show")
async def post_no_show(request: Request, reservation_id: uuid.UUID) -> dict[str, str]:
    require_kds(request.headers.get("x-kds-key"), get_settings().kds_token)
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        reservation = await mark_no_show(session, reservation_id)
    return {"id": str(reservation.id), "status": reservation.status}
