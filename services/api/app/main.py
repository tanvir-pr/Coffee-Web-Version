from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.requests import Request

from app.api.health import router as health_router
from app.api.v1.config import router as config_router
from app.core.config import get_settings
from app.core.errors import Problem, http_exception_handler, problem_handler, problem_response
from app.core.logging import configure_logging
from app.core.middleware import GuestSessionMiddleware, RequestIdMiddleware


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()
    app = FastAPI(
        title="Crema API",
        version="0.0.0",
        docs_url=None if settings.env == "production" else "/docs",
        redoc_url=None,
    )
    app.add_middleware(GuestSessionMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestIdMiddleware)
    app.add_exception_handler(Problem, problem_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.include_router(health_router)
    app.include_router(config_router, prefix="/v1")

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError) -> object:
        return problem_response(
            request,
            422,
            "VALIDATION_ERROR",
            "Validation failed",
            f"{len(exc.errors())} invalid fields",
        )

    return app


app = create_app()
