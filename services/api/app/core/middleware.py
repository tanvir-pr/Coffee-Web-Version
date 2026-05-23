import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import get_settings
from app.core.guest import GUEST_COOKIE, GUEST_MAX_AGE, new_guest_token, read_guest_id


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class GuestSessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        settings = get_settings()
        guest_id = read_guest_id(request.cookies.get(GUEST_COOKIE), settings.jwt_secret)
        minted: str | None = None
        if guest_id is None:
            guest_id, minted = new_guest_token(settings.jwt_secret)
        request.state.guest_id = guest_id
        response = await call_next(request)
        if minted is not None:
            response.set_cookie(
                key=GUEST_COOKIE,
                value=minted,
                max_age=GUEST_MAX_AGE,
                httponly=True,
                samesite="lax",
                secure=settings.cookie_secure,
                path="/",
            )
        return response
