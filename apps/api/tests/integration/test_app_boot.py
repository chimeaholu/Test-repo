from fastapi.testclient import TestClient

from app.core.application import create_app
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
