from fastapi.testclient import TestClient

from app.core.application import create_app
from app.core.config import Settings
from app.core.contracts_catalog import get_envelope_schema_version


def test_healthcheck_returns_expected_payload() -> None:
    app = create_app(Settings(database_url="sqlite:///:memory:"))
    response = TestClient(app).get("/healthz")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "apps/api"
    assert response.headers["X-Request-ID"] == payload["request_id"]


def test_settings_loading_uses_typed_settings() -> None:
    schema_version = get_envelope_schema_version()
    settings = Settings.model_validate(
        {
            "database_url": "sqlite:///./typed.db",
            "api_tokens": {"token-a": "system:test"},
            "allowed_schema_versions": f"{schema_version},2027-01-01.wave1",
            "log_level": "debug",
        }
    )

    assert settings.allowed_schema_versions == [schema_version, "2027-01-01.wave1"]
    assert settings.api_tokens["token-a"] == "system:test"
    assert settings.log_level == "DEBUG"
