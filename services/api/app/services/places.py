import json
import time as time_mod
import uuid
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Problem
from app.db.models import Order, Reservation, Store, StoreException, StoreHour
from app.services.cache import cache_get, cache_set
from app.services.catalog import seed_id

HOLD_SECONDS = 300
VISIT_MINUTES = 90
INDOOR_SEATS = 24
TERRACE_SEATS = 16
AREAS = {"indoor": INDOOR_SEATS, "terrace": TERRACE_SEATS}

RIVERSIDE_HOURS = (
    (0, "07:00", "20:00"),
    (1, "07:00", "20:00"),
    (2, "07:00", "21:00"),
    (3, "07:00", "22:00"),
    (4, "07:00", "22:00"),
    (5, "08:00", "22:00"),
    (6, "08:00", "18:00"),
)


def parse_clock(value: str) -> time:
    hour, minute = value.split(":")
    return time(int(hour), int(minute))


def open_label(now: datetime, opens: str, closes: str, closed: bool) -> tuple[bool, str]:
    if closed:
        return False, "Closed"
    start = parse_clock(opens)
    end = parse_clock(closes)
    current = now.timetz().replace(tzinfo=None)
    if start <= current < end:
        return True, f"Open · till {closes}"
    if current < start:
        return False, f"Opens at {opens}"
    return False, "Closed"


def _holds(raw: str | None, now: float) -> list[dict[str, object]]:
    if raw is None:
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    fresh: list[dict[str, object]] = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        guest = item.get("guest")
        exp = item.get("exp")
        if isinstance(guest, str) and isinstance(exp, int | float) and exp > now:
            fresh.append({"guest": guest, "exp": exp})
    return fresh


def hold_key(store_id: uuid.UUID, slot: datetime, zone: ZoneInfo) -> str:
    local = slot.astimezone(zone).replace(microsecond=0)
    return f"slot-holds:{store_id}:{local.isoformat()}"


async def ensure_store_profile(session: AsyncSession) -> None:
    riverside = await session.scalar(select(Store).where(Store.slug == "riverside"))
    if riverside is None:
        return
    if riverside.address is None:
        riverside.address = "12 River Lane, London"
        riverside.phone = "+44 20 7946 0123"
        riverside.lat = Decimal("51.461300")
        riverside.lng = Decimal("-0.303700")
        riverside.amenities = ["wifi", "outlets", "step-free", "pet-friendly"]
        riverside.slot_capacity = 4
    hours = await session.scalar(
        select(StoreHour.id).where(StoreHour.store_id == riverside.id).limit(1)
    )
    if hours is None:
        for weekday, opens, closes in RIVERSIDE_HOURS:
            session.add(
                StoreHour(
                    id=seed_id(f"hours:riverside:{weekday}"),
                    store_id=riverside.id,
                    weekday=weekday,
                    opens=opens,
                    closes=closes,
                    closed=False,
                )
            )
        session.add(
            StoreException(
                id=seed_id("exception:riverside:2026-12-24"),
                store_id=riverside.id,
                on_date=date(2026, 12, 24),
                opens="08:00",
                closes="14:00",
                closed=False,
                label="Christmas Eve",
            )
        )
    camden = await session.scalar(select(Store).where(Store.slug == "camden"))
    if camden is None:
        camden = Store(
            id=seed_id("store:camden"),
            name="Crema Camden",
            slug="camden",
            timezone="Europe/London",
            prep_minutes=8,
            tax_rate=Decimal("0.0800"),
            address="4 Camden Passage, London",
            phone="+44 20 7946 0456",
            lat=Decimal("51.541200"),
            lng=Decimal("-0.146000"),
            amenities=["wifi", "step-free"],
            slot_capacity=3,
        )
        session.add(camden)
        await session.flush()
        for weekday in range(7):
            session.add(
                StoreHour(
                    id=seed_id(f"hours:camden:{weekday}"),
                    store_id=camden.id,
                    weekday=weekday,
                    opens="08:00",
                    closes="18:00",
                    closed=False,
                )
            )
    await session.commit()


async def _hours_for(session: AsyncSession, store: Store, day: date) -> tuple[str, str, bool, str]:
    exception = await session.scalar(
        select(StoreException).where(
            StoreException.store_id == store.id, StoreException.on_date == day
        )
    )
    if exception is not None:
        return (
            exception.opens or "00:00",
            exception.closes or "00:00",
            exception.closed,
            exception.label,
        )
    hour = await session.scalar(
        select(StoreHour).where(StoreHour.store_id == store.id, StoreHour.weekday == day.weekday())
    )
    if hour is None:
        return "00:00", "00:00", True, ""
    return hour.opens, hour.closes, hour.closed, ""


async def _active_count(session: AsyncSession, store_id: uuid.UUID) -> int:
    count = await session.scalar(
        select(func.count())
        .select_from(Order)
        .where(
            Order.store_id == store_id,
            Order.status.in_(("received", "grinding", "brewing", "steaming", "ready")),
        )
    )
    return int(count or 0)


async def _busy(session: AsyncSession, store_id: uuid.UUID) -> str:
    active = await _active_count(session, store_id)
    if active >= 4:
        return "busy"
    if active >= 1:
        return "steady"
    return "quiet"


def eta_minutes(prep_minutes: int, active: int) -> int:
    return prep_minutes + active * 2


def store_payload(
    store: Store,
    *,
    open_now: bool,
    label: str,
    hours: list[dict[str, object]],
    exceptions: list[dict[str, object]],
    busy: str,
    eta: int,
) -> dict[str, object]:
    return {
        "slug": store.slug,
        "name": store.name,
        "address": store.address or "",
        "phone": store.phone or "",
        "lat": str(store.lat) if store.lat is not None else None,
        "lng": str(store.lng) if store.lng is not None else None,
        "timezone": store.timezone,
        "prep_minutes": store.prep_minutes,
        "amenities": list(store.amenities or []),
        "open": open_now,
        "hours_label": label,
        "busy": busy,
        "eta_minutes": eta,
        "hours": hours,
        "exceptions": exceptions,
    }


async def list_stores(
    session: AsyncSession, now: datetime | None = None
) -> list[dict[str, object]]:
    stores = list(await session.scalars(select(Store).order_by(Store.name)))
    payload: list[dict[str, object]] = []
    for store in stores:
        zone = ZoneInfo(store.timezone)
        moment = (now or datetime.now(UTC)).astimezone(zone)
        opens, closes, closed, _note = await _hours_for(session, store, moment.date())
        is_open, label = open_label(moment, opens, closes, closed)
        hour_rows = list(
            await session.scalars(
                select(StoreHour).where(StoreHour.store_id == store.id).order_by(StoreHour.weekday)
            )
        )
        exception_rows = list(
            await session.scalars(
                select(StoreException)
                .where(StoreException.store_id == store.id, StoreException.on_date >= moment.date())
                .order_by(StoreException.on_date)
            )
        )
        active = await _active_count(session, store.id)
        payload.append(
            store_payload(
                store,
                open_now=is_open,
                label=label,
                hours=[
                    {
                        "weekday": row.weekday,
                        "opens": row.opens,
                        "closes": row.closes,
                        "closed": row.closed,
                    }
                    for row in hour_rows
                ],
                exceptions=[
                    {
                        "date": row.on_date.isoformat(),
                        "label": row.label,
                        "opens": row.opens,
                        "closes": row.closes,
                        "closed": row.closed,
                    }
                    for row in exception_rows
                ],
                busy=await _busy(session, store.id),
                eta=eta_minutes(store.prep_minutes, active),
            )
        )
    return payload


async def store_by_slug(session: AsyncSession, slug: str) -> Store:
    store = await session.scalar(select(Store).where(Store.slug == slug))
    if store is None:
        raise Problem(404, "STORE_NOT_FOUND", "Store not found", f"No store '{slug}'.")
    return store


async def slots_for(
    session: AsyncSession, slug: str, day: date, guest_id: str
) -> dict[str, object]:
    store = await store_by_slug(session, slug)
    opens, closes, closed, note = await _hours_for(session, store, day)
    zone = ZoneInfo(store.timezone)
    now = datetime.now(UTC)
    slots: list[dict[str, object]] = []
    if not closed:
        cursor = datetime.combine(day, parse_clock(opens), zone)
        end = datetime.combine(day, parse_clock(closes), zone)
        while cursor + timedelta(minutes=10) <= end:
            if cursor > now:
                slots.append(await _slot_row(session, store, cursor, guest_id))
            cursor += timedelta(minutes=10)
    return {"date": day.isoformat(), "note": note, "slots": slots}


async def _booked(session: AsyncSession, store_id: uuid.UUID, slot: datetime) -> int:
    count = await session.scalar(
        select(func.count())
        .select_from(Order)
        .where(Order.store_id == store_id, Order.slot_start == slot, Order.status != "cancelled")
    )
    return int(count or 0)


def _matching_slot(slots: object, slot: datetime) -> dict[str, object] | None:
    if not isinstance(slots, list):
        return None
    target = slot.astimezone(UTC)
    for item in slots:
        if not isinstance(item, dict) or not isinstance(item.get("start"), str):
            continue
        start = datetime.fromisoformat(str(item["start"])).astimezone(UTC)
        if start == target:
            return item
    return None


async def _slot_row(
    session: AsyncSession, store: Store, slot: datetime, guest_id: str
) -> dict[str, object]:
    zone = ZoneInfo(store.timezone)
    holds = _holds(await cache_get(hold_key(store.id, slot, zone)), time_mod.time())
    others = [item for item in holds if item["guest"] != guest_id]
    booked = await _booked(session, store.id, slot)
    remaining = store.slot_capacity - booked - len(others)
    return {
        "start": slot.isoformat(),
        "remaining": max(remaining, 0),
    }


async def hold_slot(
    session: AsyncSession, slug: str, slot: datetime, guest_id: str
) -> dict[str, object]:
    store = await store_by_slug(session, slug)
    day = slot.astimezone(ZoneInfo(store.timezone)).date()
    available = await slots_for(session, slug, day, guest_id)
    row = _matching_slot(available["slots"], slot)
    if row is None:
        raise Problem(409, "SLOT_CLOSED", "Slot unavailable", "That pickup time is not open.")
    remaining = row["remaining"]
    if not isinstance(remaining, int) or remaining < 1:
        raise Problem(409, "SLOT_FULL", "Slot full", "That pickup time is fully held.")
    now = time_mod.time()
    key = hold_key(store.id, slot, ZoneInfo(store.timezone))
    holds = [item for item in _holds(await cache_get(key), now) if item["guest"] != guest_id]
    holds.append({"guest": guest_id, "exp": int(now + HOLD_SECONDS)})
    await cache_set(key, json.dumps(holds), HOLD_SECONDS)
    return {"start": str(row["start"]), "hold_seconds": HOLD_SECONDS}


async def claim_slot(session: AsyncSession, store: Store, slot: datetime, guest_id: str) -> None:
    day = slot.astimezone(ZoneInfo(store.timezone)).date()
    preview = await slots_for(session, store.slug, day, guest_id)
    if _matching_slot(preview["slots"], slot) is None:
        raise Problem(409, "SLOT_CLOSED", "Slot unavailable", "That pickup time is not open.")
    now = time_mod.time()
    key = hold_key(store.id, slot, ZoneInfo(store.timezone))
    holds = _holds(await cache_get(key), now)
    others = [item for item in holds if item["guest"] != guest_id]
    booked = await _booked(session, store.id, slot)
    if booked + len(others) >= store.slot_capacity:
        raise Problem(409, "SLOT_FULL", "Slot full", "That pickup time has no room left.")
    await cache_set(key, json.dumps(others), HOLD_SECONDS)


def reservation_ics(reservation: Reservation, store: Store) -> str:
    start = reservation.starts_at.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")
    end = (
        (reservation.starts_at + timedelta(minutes=VISIT_MINUTES))
        .astimezone(UTC)
        .strftime("%Y%m%dT%H%M%SZ")
    )
    return (
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Crema//Reservations//EN\r\n"
        "BEGIN:VEVENT\r\n"
        f"UID:{reservation.id}@crema\r\nDTSTAMP:{start}\r\nDTSTART:{start}\r\nDTEND:{end}\r\n"
        f"SUMMARY:Crema table at {store.name}\r\n"
        f"LOCATION:{store.address or store.name}\r\n"
        "END:VEVENT\r\nEND:VCALENDAR\r\n"
    )


async def book_reservation(
    session: AsyncSession,
    *,
    slug: str,
    party: int,
    area: str,
    starts_at: datetime,
    name: str,
    phone: str | None,
    notes: str | None,
    user_id: uuid.UUID | None,
) -> Reservation:
    if area not in AREAS:
        raise Problem(422, "AREA_INVALID", "Area invalid", "Choose indoor or terrace.")
    if party < 1 or party > 12:
        raise Problem(422, "PARTY_INVALID", "Party invalid", "A table is for 1 to 12 people.")
    store = await store_by_slug(session, slug)
    local = starts_at.astimezone(ZoneInfo(store.timezone))
    opens, closes, closed, _note = await _hours_for(session, store, local.date())
    is_open, _label = open_label(local, opens, closes, closed)
    if starts_at <= datetime.now(UTC) or not is_open:
        raise Problem(409, "RESERVATION_CLOSED", "Closed", "The shop is not seating then.")
    window_end = starts_at + timedelta(minutes=VISIT_MINUTES)
    existing = list(
        await session.scalars(
            select(Reservation).where(
                Reservation.store_id == store.id,
                Reservation.area == area,
                Reservation.status == "booked",
            )
        )
    )
    used = 0
    for row in existing:
        row_end = row.starts_at + timedelta(minutes=VISIT_MINUTES)
        if row.starts_at < window_end and row_end > starts_at:
            used += row.party
    if used + party > AREAS[area]:
        raise Problem(409, "RESERVATION_FULL", "No tables", "That seating is full.")
    reservation = Reservation(
        id=uuid.uuid4(),
        store_id=store.id,
        user_id=user_id,
        party=party,
        area=area,
        starts_at=starts_at,
        status="booked",
        contact_name=name,
        contact_phone=phone,
        notes=notes,
        cancel_token=uuid.uuid4().hex,
    )
    session.add(reservation)
    await session.commit()
    await session.refresh(reservation)
    return reservation


def reservation_payload(reservation: Reservation, store: Store) -> dict[str, object]:
    return {
        "id": str(reservation.id),
        "store": store.slug,
        "store_name": store.name,
        "party": reservation.party,
        "area": reservation.area,
        "starts_at": reservation.starts_at.isoformat(),
        "status": reservation.status,
        "contact_name": reservation.contact_name,
        "cancel_token": reservation.cancel_token,
    }


async def cancel_reservation(
    session: AsyncSession, reservation_id: uuid.UUID, token: str
) -> Reservation:
    reservation = await session.get(Reservation, reservation_id)
    if reservation is None or reservation.cancel_token != token:
        raise Problem(
            404, "RESERVATION_NOT_FOUND", "Reservation not found", "That link is not valid."
        )
    if reservation.status != "booked":
        raise Problem(
            409, "RESERVATION_CLOSED", "Already finished", "That reservation is no longer booked."
        )
    reservation.status = "cancelled"
    await session.commit()
    return reservation


async def mark_no_show(session: AsyncSession, reservation_id: uuid.UUID) -> Reservation:
    reservation = await session.get(Reservation, reservation_id)
    if reservation is None or reservation.status != "booked":
        raise Problem(
            404, "RESERVATION_NOT_FOUND", "Reservation not found", "That booking is not active."
        )
    reservation.status = "no_show"
    await session.commit()
    return reservation


async def reservations_today(
    session: AsyncSession, slug: str, now: datetime | None = None
) -> list[dict[str, object]]:
    store = await store_by_slug(session, slug)
    zone = ZoneInfo(store.timezone)
    moment = (now or datetime.now(UTC)).astimezone(zone)
    start = datetime.combine(moment.date(), time.min, zone)
    end = start + timedelta(days=1)
    rows = list(
        await session.scalars(
            select(Reservation)
            .where(
                Reservation.store_id == store.id,
                Reservation.starts_at >= start,
                Reservation.starts_at < end,
            )
            .order_by(Reservation.starts_at)
        )
    )
    return [reservation_payload(row, store) for row in rows]
