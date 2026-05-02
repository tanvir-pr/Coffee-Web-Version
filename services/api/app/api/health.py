from fastapi import APIRouter
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.db.session import create_engine, ping_database

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready", response_model=None)
async def ready() -> JSONResponse:
    settings = get_settings()
    engine = create_engine()
    redis = Redis.from_url(settings.redis_url)
    try:
        await ping_database(engine)
        await redis.ping()
    except (SQLAlchemyError, RedisError, OSError):
        return JSONResponse(
            status_code=503,
            media_type="application/problem+json",
            content={
                "type": "https://api.crema.example/errors/not-ready",
                "title": "Not ready",
                "status": 503,
                "code": "NOT_READY",
                "instance": "/ready",
            },
        )
    finally:
        await redis.aclose()
        await engine.dispose()
    return JSONResponse({"status": "ok"})
