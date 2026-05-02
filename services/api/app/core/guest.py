import hashlib
import hmac
import uuid

GUEST_COOKIE = "crema_guest"
GUEST_MAX_AGE = 60 * 60 * 24 * 30


def sign_guest_id(guest_id: str, secret: str) -> str:
    digest = hmac.new(secret.encode(), guest_id.encode(), hashlib.sha256).hexdigest()
    return f"{guest_id}.{digest}"


def read_guest_id(token: str | None, secret: str) -> str | None:
    if token is None or "." not in token:
        return None
    guest_id, digest = token.rsplit(".", 1)
    expected = hmac.new(secret.encode(), guest_id.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(digest, expected):
        return None
    try:
        uuid.UUID(guest_id)
    except ValueError:
        return None
    return guest_id


def new_guest_token(secret: str) -> tuple[str, str]:
    guest_id = str(uuid.uuid4())
    return guest_id, sign_guest_id(guest_id, secret)
