from fastapi.testclient import TestClient

from app.core.application import create_app
from app.core.config import Settings
from tests.conftest import build_settings


def test_app_boot_with_test_config(migrated_database) -> None:
    app = create_app(build_settings(migrated_database))
    response = TestClient(app).get("/readyz")

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "ok"}


def test_app_boot_allows_loopback_cors_on_dynamic_ports(migrated_database) -> None:
    app = create_app(build_settings(migrated_database))
    client = TestClient(app)

    response = client.options(
        "/api/v1/identity/session",
        headers={
            "Origin": "http://127.0.0.1:3100",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3100"


def test_production_config_disables_demo_auth_and_docs(migrated_database) -> None:
    app = create_app(
        Settings(
            database_url=migrated_database,
            environment="production",
            allow_insecure_demo_auth=False,
        )
    )
    client = TestClient(app)

    sign_in_response = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Security Test",
            "email": "security@example.com",
            "role": "farmer",
            "country_code": "GH",
        },
    )

    assert sign_in_response.status_code == 403
    assert sign_in_response.json() == {"detail": "demo_auth_disabled"}
    docs_response = client.get("/docs")
    assert docs_response.status_code == 503
    assert "Limited preview" in docs_response.text


def test_preview_hardens_and_escapes_requested_path(migrated_database) -> None:
    app = create_app(build_settings(migrated_database))
    client = TestClient(app)

    response = client.get("/%3Cscript%3Ealert(1)%3C/script%3E")

    assert response.status_code == 503
    assert "<script>alert(1)</script>" not in response.text
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in response.text
    assert response.headers["content-security-policy"].startswith("default-src 'none'")
    assert response.headers["cache-control"] == "no-store"
