from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: Literal["local", "preview", "staging", "production"] = "local"
    database_url: str = "postgresql+asyncpg://crema:crema@localhost:5432/crema"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "dev-only-change-me"
    cors_origins: str = "http://localhost:3000"
    cookie_secure: bool = False
    kill_switch: bool = False
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_publishable_key: str = ""
    kds_token: str = "dev-kds-token"

    @property
    def payment_provider(self) -> Literal["stripe", "dev"]:
        if self.stripe_secret_key:
            return "stripe"
        return "dev"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
