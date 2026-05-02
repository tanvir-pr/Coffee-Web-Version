from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class Problem(Exception):
    def __init__(self, status: int, code: str, title: str, detail: str | None = None) -> None:
        self.status = status
        self.code = code
        self.title = title
        self.detail = detail


def problem_body(
    request: Request, status: int, code: str, title: str, detail: str | None
) -> dict[str, object]:
    request_id = getattr(request.state, "request_id", None)
    body: dict[str, object] = {
        "type": f"https://api.crema.example/errors/{code.lower().replace('_', '-')}",
        "title": title,
        "status": status,
        "code": code,
        "instance": request.url.path,
    }
    if detail is not None:
        body["detail"] = detail
    if isinstance(request_id, str):
        body["request_id"] = request_id
    return body


def problem_response(
    request: Request, status: int, code: str, title: str, detail: str | None = None
) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        media_type="application/problem+json",
        content=problem_body(request, status, code, title, detail),
    )


async def problem_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, Problem):
        return problem_response(request, 500, "INTERNAL", "Internal error")
    return problem_response(request, exc.status, exc.code, exc.title, exc.detail)


async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, StarletteHTTPException):
        return problem_response(request, 500, "INTERNAL", "Internal error")
    code = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}.get(exc.status_code, "HTTP_ERROR")
    detail = exc.detail if isinstance(exc.detail, str) else None
    title = detail or code.replace("_", " ").title()
    return problem_response(request, exc.status_code, code, title, detail)
