from functools import lru_cache
from typing import Any, cast

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.contracts_catalog import get_envelope_schema_version
from app.core.shared_runtime_config import RuntimeEnvironment, resolve_environment_profile


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="AGRO_API_",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Agrodomain API"
    app_version: str = "0.1.0"
    environment: RuntimeEnvironment = "local"
    log_level: str = "INFO"
    database_url: str = "sqlite:///./agrodomain_api.db"
    public_schema_version: str = Field(default_factory=get_envelope_schema_version)
    allowed_schema_versions: list[str] = Field(
        default_factory=lambda: [get_envelope_schema_version()]
    )
    default_country_code: str = "GH"
    supported_country_codes: list[str] = Field(default_factory=lambda: ["GH"])
    telemetry_collection_enabled: bool = True
    admin_api_enabled: bool = True
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

    @field_validator("environment")
    @classmethod
    def _normalize_environment(cls, value: str) -> RuntimeEnvironment:
        normalized = value.lower()
        if normalized == "development":
            return "local"
        if normalized == "prod":
            return "production"
        return cast(RuntimeEnvironment, normalized)

    def model_post_init(self, __context: Any) -> None:
        profile = resolve_environment_profile(self.environment)
        if "public_schema_version" not in self.model_fields_set:
            self.public_schema_version = profile["public_schema_version"]
        if (
            "allowed_schema_versions" not in self.model_fields_set
            and self.allowed_schema_versions == [get_envelope_schema_version()]
        ):
            self.allowed_schema_versions = list(profile["allowed_schema_versions"])
        if "default_country_code" not in self.model_fields_set:
            self.default_country_code = profile["default_country_code"]
        if "supported_country_codes" not in self.model_fields_set:
            self.supported_country_codes = list(profile["supported_country_codes"])
        if "telemetry_collection_enabled" not in self.model_fields_set:
            self.telemetry_collection_enabled = bool(profile["telemetry_collection_enabled"])
        if "admin_api_enabled" not in self.model_fields_set:
            self.admin_api_enabled = bool(profile["admin_api_enabled"])


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache() -> None:
    get_settings.cache_clear()
