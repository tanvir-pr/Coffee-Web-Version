from typing import Any

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.db.session import get_sessionmaker
from app.services.auth import (
    USER_COOKIE,
    consume_magic_link,
    login_options,
    registration_options,
    request_magic_link,
    user_by_id,
    verify_login,
    verify_registration,
)
from app.services.checkout import member_orders
from app.services.loyalty import loyalty_snapshot, redeem_reward

router = APIRouter()


class EmailIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)


class TokenIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)


class CredentialIn(BaseModel):
    credential: dict[str, Any]


def _set_user(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=USER_COOKIE,
        value=token,
        max_age=60 * 60 * 24 * 30,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )


@router.post("/auth/magic-link")
async def post_magic_link(body: EmailIn) -> dict[str, object]:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        return await request_magic_link(session, body.email)


@router.post("/auth/magic-link/consume")
async def post_consume(body: TokenIn) -> Response:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        user, token = await consume_magic_link(session, body.token)
    response = JSONResponse({"email": user.email, "name": user.name})
    _set_user(response, token)
    return response


@router.post("/auth/logout")
async def post_logout() -> Response:
    response = JSONResponse({"signed_out": True})
    response.delete_cookie(USER_COOKIE, path="/")
    return response


@router.get("/me")
async def get_me(request: Request) -> dict[str, str]:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        user = await user_by_id(session, getattr(request.state, "user_id", None))
    return {"email": user.email, "name": user.name}


@router.get("/me/orders")
async def get_my_orders(request: Request) -> list[dict[str, object]]:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        user = await user_by_id(session, getattr(request.state, "user_id", None))
        return await member_orders(session, user.id)


@router.get("/me/loyalty")
async def get_loyalty(request: Request) -> dict[str, object]:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        user = await user_by_id(session, getattr(request.state, "user_id", None))
        return await loyalty_snapshot(session, user.id)


@router.post("/me/loyalty/redeem")
async def post_redeem(request: Request) -> dict[str, str]:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        user = await user_by_id(session, getattr(request.state, "user_id", None))
        return await redeem_reward(session, user.id)


@router.post("/auth/passkey/register/options")
async def post_passkey_options(request: Request) -> dict[str, Any]:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        user = await user_by_id(session, getattr(request.state, "user_id", None))
        return await registration_options(session, user)


@router.post("/auth/passkey/register")
async def post_passkey_register(request: Request, body: CredentialIn) -> dict[str, bool]:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        user = await user_by_id(session, getattr(request.state, "user_id", None))
        await verify_registration(session, user, body.credential)
    return {"saved": True}


@router.post("/auth/passkey/login/options")
async def post_passkey_login_options() -> dict[str, Any]:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        return await login_options(session)


@router.post("/auth/passkey/login")
async def post_passkey_login(body: CredentialIn) -> Response:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        user, token = await verify_login(session, body.credential)
    response = JSONResponse({"email": user.email, "name": user.name})
    _set_user(response, token)
    return response
