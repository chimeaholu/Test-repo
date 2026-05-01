from sqlalchemy import select

from app.core.identity_security import build_password_hash
from app.db.models.audit import AuditEvent
from app.db.models.platform import IdentityAccount
from app.db.repositories.identity import IdentityRepository


def _create_admin_account(session) -> tuple[str, str]:
    repository = IdentityRepository(session)
    account = repository.create_account(
        display_name="Admin Operator",
        email="admin@example.com",
        phone_number="+233200000111",
        country_code="GH",
    )
    repository.ensure_membership(actor_id=account.actor_id, role="admin", country_code="GH")
    repository.set_password_credential(
        actor_id=account.actor_id,
        password_hash=build_password_hash("AdminPassword123!", iterations=600_000),
    )
    session.commit()
    return account.actor_id, account.email


def _login_admin(client, email: str) -> tuple[str, str]:
    response = client.post(
        "/api/v1/identity/login/password",
        json={
            "identifier": email,
            "password": "AdminPassword123!",
            "role": "admin",
            "country_code": "GH",
        },
    )
    assert response.status_code == 200
    body = response.json()
    return body["access_token"], body["session"]["actor"]["actor_id"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_admin_reads_return_live_control_plane_payloads(client, session) -> None:
    _, email = _create_admin_account(session)
    token, _ = _login_admin(client, email)

    summary_response = client.get("/api/v1/admin/analytics/health", headers=_auth_headers(token))
    alerts_response = client.get("/api/v1/admin/observability/alerts", headers=_auth_headers(token))
    readiness_response = client.get("/api/v1/admin/release-readiness", headers=_auth_headers(token))
    rollouts_response = client.get("/api/v1/admin/rollouts/status", headers=_auth_headers(token))

    assert summary_response.status_code == 200
    assert summary_response.json()["service_name"] == "admin_control_plane"
    assert "health_state" in summary_response.json()

    assert alerts_response.status_code == 200
    assert isinstance(alerts_response.json()["items"], list)

    assert readiness_response.status_code == 200
    assert readiness_response.json()["readiness_status"] in {"ready", "degraded", "blocked"}

    assert rollouts_response.status_code == 200
    assert rollouts_response.json()["items"] == []


def test_rollout_mutation_requires_admin_and_is_idempotent(client, session) -> None:
    actor_id, email = _create_admin_account(session)
    token, _ = _login_admin(client, email)

    payload = {
        "actor_id": actor_id,
        "actor_role": "admin",
        "alert_severity": "warning",
        "audit_event_id": 0,
        "channel": "pwa",
        "country_code": "GH",
        "idempotency_key": "rollout-freeze-001",
        "intent": "freeze",
        "limited_release_percent": None,
        "reason_code": "operator_review",
        "reason_detail": "Freeze for N6 verification.",
        "request_id": "request-freeze-001",
        "schema_version": "2026-04-25.wave7",
        "scope_key": "analytics-dashboard",
        "service_name": "admin_control_plane",
        "slo_id": "admin-analytics",
    }

    first_response = client.post("/api/v1/admin/rollouts/freeze", headers=_auth_headers(token), json=payload)
    second_response = client.post("/api/v1/admin/rollouts/freeze", headers=_auth_headers(token), json=payload)
    status_response = client.get("/api/v1/admin/rollouts/status", headers=_auth_headers(token))

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert first_response.json()["audit_event_id"] == second_response.json()["audit_event_id"]
    assert status_response.json()["items"][0]["state"] == "frozen"

    events = session.execute(
        select(AuditEvent).where(AuditEvent.idempotency_key == "rollout-freeze-001")
    ).scalars().all()
    assert len(events) == 1
    assert events[0].command_name == "admin.rollout.freeze"


def test_rollout_mutation_rejects_non_admin_scope(client, session) -> None:
    response = client.post(
        "/api/v1/identity/register/password",
        json={
            "display_name": "Farmer User",
            "email": "farmer@example.com",
            "phone_number": "+233200000222",
            "password": "FarmerPassword123!",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    actor = session.execute(
        select(IdentityAccount).where(IdentityAccount.email == "farmer@example.com")
    ).scalar_one()

    forbidden_response = client.post(
        "/api/v1/admin/rollouts/freeze",
        headers=_auth_headers(token),
        json={
            "actor_id": actor.actor_id,
            "actor_role": "farmer",
            "alert_severity": "warning",
            "audit_event_id": 0,
            "channel": "pwa",
            "country_code": "GH",
            "idempotency_key": "rollout-freeze-002",
            "intent": "freeze",
            "limited_release_percent": None,
            "reason_code": "operator_review",
            "reason_detail": "Attempted unauthorized freeze.",
            "request_id": "request-freeze-002",
            "schema_version": "2026-04-25.wave7",
            "scope_key": "analytics-dashboard",
            "service_name": "admin_control_plane",
            "slo_id": "admin-analytics",
        },
    )

    assert forbidden_response.status_code == 403
    assert forbidden_response.json()["detail"] == "missing_operator_scope"
