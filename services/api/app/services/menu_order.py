import hashlib
from typing import Literal

Daypart = Literal["morning", "afternoon", "night"]

MORNING_START = 6 * 60
AFTERNOON_START = 12 * 60
NIGHT_START = 18 * 60


def daypart_for(hour: int, minute: int) -> Daypart:
    mins = hour * 60 + minute
    if mins >= NIGHT_START or mins < MORNING_START:
        return "night"
    if mins < AFTERNOON_START:
        return "morning"
    return "afternoon"


def make_etag(payload: str) -> str:
    digest = hashlib.sha256(payload.encode()).hexdigest()
    return f'"{digest}"'
