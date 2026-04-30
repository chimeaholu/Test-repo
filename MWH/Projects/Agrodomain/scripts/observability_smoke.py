from __future__ import annotations

import json
import sys
from pathlib import Path
from uuid import uuid4

from alembic import command
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = ROOT / "apps" / "api"

if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from app.core.application import create_app
from app.core.contracts_catalog import get_envelope_schema_version
from tests.conftest import build_alembic_config, build_settings


def main() -> None:
    output_path = ROOT / ".planning" / "observability-smoke.json"
    database_path = ROOT / ".planning" / "observability-smoke.db"
    database_url = f"sqlite:///{database_path}"

    database_path.unlink(missing_ok=True)
    command.upgrade(build_alembic_config(database_url), "head")

    client = TestClient(create_app(build_settings(database_url)))
    health_response = client.get("/healthz")
    health_response.raise_for_status()
    sign_in_response = client.post(
        "/api/v1/identity/register/password",
        json={
            "display_name": "Observability Probe",
            "email": "observability@example.com",
            "phone_number": "+233201111111",
            "password": "StrongPassword123!",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    sign_in_response.raise_for_status()
    access_token = sign_in_response.json()["access_token"]
    actor_id = sign_in_response.json()["session"]["actor"]["actor_id"]

    failed_login_response = client.post(
        "/api/v1/identity/login/password",
        json={
            "identifier": "observability@example.com",
            "password": "WrongPassword123!",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    assert failed_login_response.status_code == 401

    command_response = client.post(
        "/api/v1/workflow/commands",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "metadata": {
                "request_id": str(uuid4()),
                "idempotency_key": f"obs-{uuid4()}",
                "actor_id": actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": get_envelope_schema_version(),
                "correlation_id": str(uuid4()),
                "occurred_at": "2026-04-29T00:00:00+00:00",
                "traceability": {"journey_ids": ["EB-006B"], "data_check_ids": []},
            },
            "command": {
                "name": "workflow.command.dispatch",
                "aggregate_ref": "workflow_execution",
                "mutation_scope": "regulated",
                "payload": {"step": "observability-smoke"},
            },
        },
    )
    command_response.raise_for_status()

    metrics_response = client.get("/metrics")
    metrics_response.raise_for_status()
    metrics_lines = [
        line
        for line in metrics_response.text.splitlines()
        if line.startswith("agro_api_http_requests_total")
        or line.startswith("agro_api_auth_flow_total")
        or line.startswith("agro_api_errors_total")
        or line.startswith("agro_api_command_duration_seconds_bucket")
        or line.startswith("agro_api_outbox_queue_depth")
    ]

    output_path.write_text(
        json.dumps(
            {
                "healthz": 200,
                "response_headers": {
                    "request_id": health_response.headers.get("X-Request-ID"),
                    "correlation_id": health_response.headers.get("X-Correlation-ID"),
                    "trace_id": health_response.headers.get("X-Trace-ID"),
                    "span_id": health_response.headers.get("X-Span-ID"),
                },
                "register_password": sign_in_response.status_code,
                "login_password_invalid": failed_login_response.status_code,
                "command": command_response.status_code,
                "metrics_excerpt": metrics_lines,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(output_path)


if __name__ == "__main__":
    main()
