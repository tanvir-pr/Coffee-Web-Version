from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.flags import anim_flags, season_for_month


class ConfigFlags(BaseModel):
    anim: dict[str, bool]


class ConfigResponse(BaseModel):
    season: str
    kill_switch: bool
    flags: ConfigFlags


router = APIRouter()


@router.get("/config", response_model=ConfigResponse)
async def get_config() -> ConfigResponse:
    settings = get_settings()
    return ConfigResponse(
        season=season_for_month(datetime.now().month),
        kill_switch=settings.kill_switch,
        flags=ConfigFlags(anim=anim_flags()),
    )
