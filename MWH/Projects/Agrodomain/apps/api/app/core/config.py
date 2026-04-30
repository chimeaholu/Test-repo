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
    database_schema: str | None = None
    database_pool_size: int = 20
    database_max_overflow: int = 20
    database_pool_timeout_seconds: int = 30
    database_pool_recycle_seconds: int = 1800
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
    partner_api_tokens: dict[str, str] = Field(
        default_factory=lambda: {"partner-test-token": "insights-hub"}
    )
    allow_insecure_demo_auth: bool | None = None
    expose_api_docs: bool | None = None
    metrics_enabled: bool = True
    metrics_path: str = "/metrics"
    auth_session_ttl_minutes: int = 24 * 60
    auth_magic_link_ttl_minutes: int = 15
    auth_password_recovery_ttl_minutes: int = 20
    auth_password_hash_iterations: int = 600_000
    auth_magic_link_primary_provider: str = "africas_talking"
    auth_magic_link_fallback_provider: str = "twilio"
    weather_provider_primary: str = "open_meteo"
    open_meteo_base_url: str = "https://api.open-meteo.com"
    weather_request_timeout_seconds: int = 8
    routing_provider_primary: str = "mapbox"
    routing_request_timeout_seconds: int = 8
    mapbox_directions_base_url: str = "https://api.mapbox.com/directions/v5/mapbox/driving"
    mapbox_access_token: str | None = None
    payment_provider_primary: str = "paystack"
    payment_request_timeout_seconds: int = 10
    paystack_base_url: str = "https://api.paystack.co"
    paystack_secret_key: str | None = None
    paystack_live_enabled: bool = False
    paystack_callback_url: str | None = None
    agro_intelligence_budget_ceiling_usd: int = 60_000
    agro_intelligence_request_timeout_seconds: int = 12
    agro_intelligence_opencorporates_base_url: str = "https://api.opencorporates.com"
    agro_intelligence_opencorporates_api_token: str | None = None
    agro_intelligence_overpass_base_url: str = "https://overpass-api.de"

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

    def insecure_demo_auth_enabled(self) -> bool:
        if self.allow_insecure_demo_auth is not None:
            return self.allow_insecure_demo_auth
        return self.environment.lower() in {"development", "test"}

    def api_docs_enabled(self) -> bool:
        if self.expose_api_docs is not None:
            return self.expose_api_docs
        return self.environment.lower() != "production"

    def hsts_enabled(self) -> bool:
        return self.environment.lower() == "production"

    def auth_preview_codes_enabled(self) -> bool:
        return self.environment.lower() in {"development", "test"}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache() -> None:
    get_settings.cache_clear()
