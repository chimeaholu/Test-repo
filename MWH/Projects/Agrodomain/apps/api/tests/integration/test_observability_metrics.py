from uuid import uuid4

from app.core.contracts_catalog import get_envelope_schema_version


def test_metrics_surface_reports_http_auth_and_queue_signals(client) -> None:
    health_response = client.get("/healthz")
    assert health_response.status_code == 200
    assert health_response.headers["X-Request-ID"]
    assert health_response.headers["X-Correlation-ID"]
    assert health_response.headers["X-Trace-ID"]
    assert health_response.headers["X-Span-ID"]

    sign_in_response = client.post(
        "/api/v1/identity/register/password",
        json={
            "display_name": "Metrics Probe",
            "email": "metrics@example.com",
            "phone_number": "+233200000000",
            "password": "StrongPassword123!",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    assert sign_in_response.status_code == 200
    access_token = sign_in_response.json()["access_token"]
    actor_id = sign_in_response.json()["session"]["actor"]["actor_id"]

    invalid_login_response = client.post(
        "/api/v1/identity/login/password",
        json={
            "identifier": "metrics@example.com",
            "password": "WrongPassword123!",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    assert invalid_login_response.status_code == 401
    assert invalid_login_response.headers["X-Request-ID"]
    assert invalid_login_response.headers["X-Correlation-ID"]
    assert invalid_login_response.headers["X-Trace-ID"]
    assert invalid_login_response.headers["X-Span-ID"]

    command_response = client.post(
        "/api/v1/workflow/commands",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "metadata": {
                "request_id": str(uuid4()),
                "idempotency_key": f"metrics-{uuid4()}",
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
                "payload": {"step": "metrics-smoke"},
            },
        },
    )
    assert command_response.status_code == 200

    metrics_response = client.get("/metrics")
    assert metrics_response.status_code == 200

    body = metrics_response.text
    assert 'agro_api_http_requests_total{method="GET",path="/healthz",status_code="200"}' in body
    assert 'agro_api_auth_flow_total{flow="password_register",outcome="accepted"} 1.0' in body
    assert 'agro_api_auth_flow_total{flow="password_login",outcome="invalid_credentials"} 1.0' in body
    assert 'agro_api_auth_flow_total{flow="session_token",outcome="authenticated"} 1.0' in body
    assert 'agro_api_errors_total{error_type="invalid_credentials",surface="auth"} 1.0' in body
    assert 'agro_api_http_requests_total{method="POST",path="/api/v1/identity/login/password",status_code="401"} 1.0' in body
    assert "agro_api_outbox_queue_depth 1.0" in body
