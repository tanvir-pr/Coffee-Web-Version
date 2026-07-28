import base64
import hashlib
import hmac
import json
import re
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url, options_to_json
from webauthn.helpers.structs import PublicKeyCredentialDescriptor

from app.core.config import get_settings
from app.core.errors import Problem
from app.core.guest import sign_guest_id
from app.db.models import MagicLink, Passkey, User, WebauthnChallenge

USER_COOKIE = "crema_user"
LINK_MINUTES = 15
CHALLENGE_MINUTES = 5
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PASSWORD_MIN = 8
SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 64


def normalize_email(value: str) -> str:
    email = value.strip().lower()
    if not EMAIL_RE.fullmatch(email) or len(email) > 254:
        raise Problem(422, "EMAIL_INVALID", "Email invalid", "Enter a valid email address.")
    return email


def normalize_name(value: str) -> str:
    name = " ".join(value.split())
    if not name or len(name) > 80:
        raise Problem(422, "NAME_INVALID", "Name invalid", "Enter a name up to 80 characters.")
    return name


def normalize_password(value: str) -> str:
    if len(value) < PASSWORD_MIN or len(value) > 128:
        raise Problem(
            422,
            "PASSWORD_INVALID",
            "Password invalid",
            f"Use a password of at least {PASSWORD_MIN} characters.",
        )
    return value


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=SCRYPT_DKLEN,
    )
    return "scrypt$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()


def verify_password(password: str, encoded: str | None) -> bool:
    if not encoded or not encoded.startswith("scrypt$"):
        return False
    try:
        _, salt_b64, digest_b64 = encoded.split("$", 2)
        salt = base64.b64decode(salt_b64.encode())
        expected = base64.b64decode(digest_b64.encode())
    except (ValueError, TypeError):
        return False
    actual = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=len(expected),
    )
    return hmac.compare_digest(actual, expected)


def _session_token(user: User) -> str:
    return sign_guest_id(str(user.id), get_settings().jwt_secret)


async def register_email(
    session: AsyncSession, email: str, password: str, name: str
) -> tuple[User, str]:
    address = normalize_email(email)
    secret = normalize_password(password)
    display = normalize_name(name)
    existing = await session.scalar(select(User).where(User.email == address))
    if existing is not None:
        raise Problem(409, "EMAIL_TAKEN", "Email taken", "That email already has an account.")
    user = User(
        id=uuid.uuid4(),
        email=address,
        name=display,
        password_hash=hash_password(secret),
        auth_provider="email",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user, _session_token(user)


async def login_email(session: AsyncSession, email: str, password: str) -> tuple[User, str]:
    address = normalize_email(email)
    secret = normalize_password(password)
    user = await session.scalar(select(User).where(User.email == address))
    if user is None or not verify_password(secret, user.password_hash):
        raise Problem(401, "AUTH_FAILED", "Sign-in failed", "Email or password is incorrect.")
    return user, _session_token(user)


async def login_google(
    session: AsyncSession,
    *,
    credential: str | None = None,
    email: str | None = None,
    name: str | None = None,
) -> tuple[User, str]:
    settings = get_settings()
    if credential:
        payload = _verify_google_id_token(credential, settings.google_client_id)
        address = normalize_email(str(payload.get("email", "")))
        display = normalize_name(str(payload.get("name") or address.split("@", 1)[0]))
    elif settings.env == "local" and email:
        address = normalize_email(email)
        display = normalize_name(name or address.split("@", 1)[0])
    else:
        raise Problem(
            400,
            "GOOGLE_REQUIRED",
            "Google sign-in unavailable",
            "Google sign-in needs a credential.",
        )
    user = await session.scalar(select(User).where(User.email == address))
    if user is None:
        user = User(
            id=uuid.uuid4(),
            email=address,
            name=display,
            password_hash=None,
            auth_provider="google",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
    elif user.auth_provider != "google":
        user.auth_provider = "google"
        if not user.name:
            user.name = display
        await session.commit()
        await session.refresh(user)
    return user, _session_token(user)


def _verify_google_id_token(credential: str, client_id: str) -> dict[str, Any]:
    if not client_id:
        raise Problem(
            503,
            "GOOGLE_CONFIG",
            "Google not configured",
            "Set GOOGLE_CLIENT_ID to enable Google sign-in.",
        )
    try:
        with urlopen(
            UrlRequest(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}",
                method="GET",
            ),
            timeout=8,
        ) as response:
            payload = json.loads(response.read().decode())
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise Problem(
            401, "GOOGLE_INVALID", "Google rejected", "That Google sign-in could not be verified."
        ) from exc
    if payload.get("aud") != client_id or payload.get("email_verified") not in (True, "true"):
        raise Problem(
            401, "GOOGLE_INVALID", "Google rejected", "That Google sign-in could not be verified."
        )
    if not isinstance(payload, dict):
        raise Problem(
            401, "GOOGLE_INVALID", "Google rejected", "That Google sign-in could not be verified."
        )
    return payload


async def request_magic_link(session: AsyncSession, email: str) -> dict[str, object]:
    address = normalize_email(email)
    token = secrets.token_urlsafe(32)
    session.add(
        MagicLink(
            id=uuid.uuid4(),
            email=address,
            token_hash=_hash_token(token),
            expires_at=datetime.now(UTC) + timedelta(minutes=LINK_MINUTES),
        )
    )
    await session.commit()
    payload: dict[str, object] = {"sent": True}
    if get_settings().env == "local":
        payload["dev_token"] = token
    return payload


async def consume_magic_link(session: AsyncSession, token: str) -> tuple[User, str]:
    link = await session.scalar(select(MagicLink).where(MagicLink.token_hash == _hash_token(token)))
    now = datetime.now(UTC)
    if link is None or link.used_at is not None or link.expires_at <= now:
        raise Problem(400, "LINK_INVALID", "Link invalid", "That sign-in link has expired.")
    link.used_at = now
    user = await session.scalar(select(User).where(User.email == link.email))
    if user is None:
        user = User(id=uuid.uuid4(), email=link.email, name=link.email.split("@", 1)[0])
        session.add(user)
    await session.commit()
    await session.refresh(user)
    return user, sign_guest_id(str(user.id), get_settings().jwt_secret)


async def user_by_id(session: AsyncSession, user_id: str | None) -> User:
    if user_id is None:
        raise Problem(401, "AUTH_REQUIRED", "Sign in required", "Sign in to continue.")
    try:
        parsed = uuid.UUID(user_id)
    except ValueError as exc:
        raise Problem(401, "AUTH_REQUIRED", "Sign in required", "Sign in to continue.") from exc
    user = await session.get(User, parsed)
    if user is None:
        raise Problem(401, "AUTH_REQUIRED", "Sign in required", "Sign in to continue.")
    return user


def user_public(user: User) -> dict[str, str]:
    role = user.role if user.role in {"customer", "owner"} else "customer"
    return {"email": user.email, "name": user.name, "role": role}


DEMO_ACCOUNTS = (
    {
        "email": "owner@crema.local",
        "name": "Crema Owner",
        "password": "CremaOwner1!",
        "role": "owner",
    },
    {
        "email": "guest@crema.local",
        "name": "Maya Guest",
        "password": "CremaGuest1!",
        "role": "customer",
    },
)


async def ensure_demo_accounts(session: AsyncSession) -> None:
    """Local demo logins for customer + owner audits."""
    if get_settings().env != "local":
        return
    changed = False
    for account in DEMO_ACCOUNTS:
        email = str(account["email"])
        user = await session.scalar(select(User).where(User.email == email))
        if user is None:
            session.add(
                User(
                    id=uuid.uuid4(),
                    email=email,
                    name=str(account["name"]),
                    password_hash=hash_password(str(account["password"])),
                    auth_provider="email",
                    role=str(account["role"]),
                )
            )
            changed = True
            continue
        if user.role != account["role"]:
            user.role = str(account["role"])
            changed = True
        if not user.password_hash:
            user.password_hash = hash_password(str(account["password"]))
            user.auth_provider = "email"
            changed = True
    if changed:
        await session.commit()


async def require_owner(session: AsyncSession, user_id: str | None) -> User:
    user = await user_by_id(session, user_id)
    if user.role != "owner":
        raise Problem(403, "OWNER_REQUIRED", "Owner only", "This area is for Crema owners.")
    return user


def _options(raw: str) -> dict[str, Any]:
    import json

    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise Problem(
            500, "PASSKEY_OPTIONS", "Passkey error", "The passkey options could not be built."
        )
    return parsed


async def registration_options(session: AsyncSession, user: User) -> dict[str, Any]:
    settings = get_settings()
    existing = list(await session.scalars(select(Passkey).where(Passkey.user_id == user.id)))
    options = generate_registration_options(
        rp_id=settings.webauthn_rp_id,
        rp_name=settings.webauthn_rp_name,
        user_name=user.email,
        user_display_name=user.name,
        user_id=user.id.bytes,
        exclude_credentials=[
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(row.credential_id))
            for row in existing
        ],
    )
    session.add(
        WebauthnChallenge(
            id=uuid.uuid4(),
            user_id=user.id,
            kind="register",
            challenge=bytes_to_base64url(options.challenge),
            expires_at=datetime.now(UTC) + timedelta(minutes=CHALLENGE_MINUTES),
        )
    )
    await session.commit()
    return _options(options_to_json(options))


async def verify_registration(
    session: AsyncSession, user: User, credential: dict[str, Any]
) -> None:
    settings = get_settings()
    challenge = await _challenge(session, "register", user.id)
    try:
        verified = verify_registration_response(
            credential=credential,
            expected_challenge=_challenge_bytes(challenge.challenge),
            expected_rp_id=settings.webauthn_rp_id,
            expected_origin=settings.webauthn_origin,
            require_user_verification=False,
        )
    except Exception as exc:
        raise Problem(
            400, "PASSKEY_INVALID", "Passkey rejected", "That passkey could not be saved."
        ) from exc
    session.add(
        Passkey(
            id=uuid.uuid4(),
            user_id=user.id,
            credential_id=bytes_to_base64url(verified.credential_id),
            public_key=verified.credential_public_key,
            sign_count=verified.sign_count,
        )
    )
    await session.delete(challenge)
    await session.commit()


async def login_options(session: AsyncSession) -> dict[str, Any]:
    settings = get_settings()
    options = generate_authentication_options(rp_id=settings.webauthn_rp_id)
    session.add(
        WebauthnChallenge(
            id=uuid.uuid4(),
            user_id=None,
            kind="login",
            challenge=bytes_to_base64url(options.challenge),
            expires_at=datetime.now(UTC) + timedelta(minutes=CHALLENGE_MINUTES),
        )
    )
    await session.commit()
    return _options(options_to_json(options))


async def verify_login(session: AsyncSession, credential: dict[str, Any]) -> tuple[User, str]:
    settings = get_settings()
    raw_id = credential.get("id")
    if not isinstance(raw_id, str):
        raise Problem(400, "PASSKEY_INVALID", "Passkey rejected", "That passkey could not be read.")
    passkey = await session.scalar(select(Passkey).where(Passkey.credential_id == raw_id))
    if passkey is None:
        raise Problem(400, "PASSKEY_INVALID", "Passkey rejected", "That passkey is not registered.")
    challenge = await _challenge(session, "login", None)
    try:
        verified = verify_authentication_response(
            credential=credential,
            expected_challenge=_challenge_bytes(challenge.challenge),
            expected_rp_id=settings.webauthn_rp_id,
            expected_origin=settings.webauthn_origin,
            credential_public_key=passkey.public_key,
            credential_current_sign_count=passkey.sign_count,
            require_user_verification=False,
        )
    except Exception as exc:
        raise Problem(
            400, "PASSKEY_INVALID", "Passkey rejected", "That passkey could not be verified."
        ) from exc
    passkey.sign_count = verified.new_sign_count
    await session.delete(challenge)
    user = await session.get(User, passkey.user_id)
    if user is None:
        raise Problem(400, "PASSKEY_INVALID", "Passkey rejected", "That passkey is not registered.")
    await session.commit()
    return user, sign_guest_id(str(user.id), settings.jwt_secret)


def _challenge_bytes(value: str) -> bytes:
    return base64url_to_bytes(value)


async def _challenge(
    session: AsyncSession, kind: str, user_id: uuid.UUID | None
) -> WebauthnChallenge:
    now = datetime.now(UTC)
    query = select(WebauthnChallenge).where(
        WebauthnChallenge.kind == kind,
        WebauthnChallenge.expires_at > now,
    )
    if user_id is None:
        query = query.where(WebauthnChallenge.user_id.is_(None))
    else:
        query = query.where(WebauthnChallenge.user_id == user_id)
    challenge = await session.scalar(query.order_by(WebauthnChallenge.expires_at.desc()))
    if challenge is None:
        raise Problem(
            400, "PASSKEY_CHALLENGE", "Challenge expired", "Start the passkey step again."
        )
    return challenge
