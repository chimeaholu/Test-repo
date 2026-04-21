from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.contracts_catalog import get_envelope_schema_version


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="AGRO_API_",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Agrodomain API"
    app_version: str = "0.1.0"
    environment: str = "development"
    log_level: str = "INFO"
    database_url: str = "sqlite:///./agrodomain_api.db"
    public_schema_version: str = Field(default_factory=get_envelope_schema_version)
    allowed_schema_versions: list[str] = Field(
        default_factory=lambda: [get_envelope_schema_version()]
    )
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: [
            "http://127.0.0.1:3000",
            "http://localhost:3000",
        ]
    )
    cors_allowed_origin_regex: str = r"https?://(127\.0\.0\.1|localhost)(:\d+)?"
    api_tokens: dict[str, str] = Field(
        default_factory=lambda: {"test-token": "system:test"}
    )

    @field_validator("allowed_schema_versions", mode="before")
    @classmethod
    def _coerce_schema_versions(cls, value: Any) -> Any:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def _coerce_cors_allowed_origins(cls, value: Any) -> Any:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("log_level")
    @classmethod
    def _normalize_log_level(cls, value: str) -> str:
        return value.upper()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache() -> None:
    get_settings.cache_clear()
