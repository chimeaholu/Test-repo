from datetime import UTC, datetime

from app.db.repositories.identity import IdentityRepository


def _grant_control_plane_consent(session, *, role: str = "admin", country_code: str = "GH") -> None:
    repository = IdentityRepository(session)
    repository.ensure_membership(actor_id="system:test", role=role, country_code=country_code)
    repository.create_or_rotate_session(
        actor_id="system:test",
        display_name="Admin Operator",
        email="admin@example.com",
        role=role,
        country_code=country_code,
    )
    repository.grant_consent(
        actor_id="system:test",
        country_code=country_code,
        policy_version="2026.04.w6",
        scope_ids=[
            "identity.core",
            "workflow.audit",
            "admin.observability",
            "admin.rollout",
            "climate.runtime",
        ],
        captured_at=datetime.now(tz=UTC),
    )
    session.commit()


def _telemetry_payload(*, observation_id: str, idempotency_key: str | None = None) -> dict[str, object]:
    return {
        "schema_version": "2026-04-18.wave1",
        "request_id": f"req-{observation_id}",
        "actor_id": "system:test",
        "country_code": "GH",
        "channel": "api",
        "service_name": "admin_control_plane",
        "slo_id": "PF-004",
        "alert_severity": "warning",
        "audit_event_id": 0,
        "idempotency_key": idempotency_key or observation_id,
        "observation_id": observation_id,
        "source_kind": "api_runtime",
        "window_started_at": "2026-04-19T01:24:00Z",
        "window_ended_at": "2026-04-19T01:29:00Z",
        "success_count": 9,
        "error_count": 1,
        "sample_count": 10,
        "latency_p95_ms": 1420,
        "stale_after_seconds": 300,
        "release_blocking": True,
        "note": "p95 latency exceeded threshold",
    }


def _freeze_payload(*, reason_code: str = "manual_freeze") -> dict[str, object]:
    return {
        "schema_version": "2026-04-18.wave1",
        "request_id": "req-rollout-freeze-001",
        "actor_id": "system:test",
        "country_code": "GH",
        "channel": "api",
        "service_name": "rollout_control",
        "slo_id": None,
        "alert_severity": None,
        "audit_event_id": 0,
        "idempotency_key": "idem-rollout-freeze-001",
        "actor_role": "admin",
        "scope_key": "gh-admin-control-plane",
        "intent": "freeze",
        "reason_code": reason_code,
        "reason_detail": "Freeze requested after blocking telemetry breach.",
        "limited_release_percent": None,
    }


def test_rollout_control_rejects_missing_actor_scope_and_reason(client, session) -> None:
    _grant_control_plane_consent(session)
    response = client.post(
        "/api/v1/admin/rollouts/freeze",
        json={
            "release_id": "wave6-gh-rollout",
            "service_name": "api",
            "channel": "admin_console",
        },
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code in {403, 422}
    assert response.json()["detail"]["error_code"] in {
        "unknown_contract_fields",
        "missing_rollout_scope",
        "missing_actor_scope",
        "invalid_rollout_payload",
    }


def test_admin_alert_feed_surfaces_degraded_breaches_instead_of_silent_loss(client, session) -> None:
    _grant_control_plane_consent(session)
    alerts_response = client.get(
        "/api/v1/admin/observability/alerts?country_code=GH",
        headers={"Authorization": "Bearer test-token"},
    )

    assert alerts_response.status_code == 200
    payload = alerts_response.json()
    assert payload["items"], "Expected admin alert feed items for degraded telemetry breach."
    assert any(item["status"] == "breached" for item in payload["items"])


def test_admin_analytics_marks_stale_data_as_degraded_not_healthy(client, session) -> None:
    _grant_control_plane_consent(session)

    response = client.get(
        "/api/v1/admin/analytics/health?country_code=GH",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["health_state"] == "degraded"
    assert payload["degraded_records"] == 1


def test_duplicate_telemetry_ingest_is_deduped_before_slo_inflation(client, session) -> None:
    _grant_control_plane_consent(session)

    first_response = client.post(
        "/api/v1/admin/observability/telemetry",
        json=_telemetry_payload(observation_id="obs-telemetry-001"),
        headers={"Authorization": "Bearer test-token"},
    )
    second_response = client.post(
        "/api/v1/admin/observability/telemetry",
        json=_telemetry_payload(observation_id="obs-telemetry-001"),
        headers={"Authorization": "Bearer test-token"},
    )

    assert first_response.status_code == 202
    assert first_response.headers["x-agrodomain-contract-id"] == "observability.telemetry_observation_record"
    assert first_response.headers["x-agrodomain-replayed"] == "false"
    assert second_response.status_code == 200
    assert second_response.headers["x-agrodomain-replayed"] == "true"
    assert second_response.json()["observation_id"] == "obs-telemetry-001"


def test_admin_runtime_persists_and_reads_contract_backed_runtime_views(client, session) -> None:
    _grant_control_plane_consent(session)

    ingest_response = client.post(
        "/api/v1/admin/observability/telemetry",
        json=_telemetry_payload(observation_id="obs-telemetry-002"),
        headers={"Authorization": "Bearer test-token"},
    )
    snapshot_response = client.get(
        "/api/v1/admin/analytics/snapshot?country_code=GH",
        headers={"Authorization": "Bearer test-token"},
    )
    telemetry_read_response = client.get(
        "/api/v1/admin/observability/telemetry/obs-telemetry-002",
        headers={"Authorization": "Bearer test-token"},
    )

    assert ingest_response.status_code == 202
    assert snapshot_response.status_code == 200
    assert snapshot_response.headers["x-agrodomain-contract-id"] == "analytics.admin_analytics_snapshot"
    assert "admin_control_plane" in snapshot_response.json()["stale_services"]
    assert telemetry_read_response.status_code == 200
    assert telemetry_read_response.json()["observation_id"] == "obs-telemetry-002"


def test_admin_runtime_rejects_country_outside_shared_config_surface(client, session) -> None:
    _grant_control_plane_consent(session)

    response = client.post(
        "/api/v1/admin/observability/telemetry",
        json={**_telemetry_payload(observation_id="obs-telemetry-unsupported"), "country_code": "NG"},
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 422
    assert response.json()["detail"]["error_code"] == "country_not_supported"


def test_rollout_control_persists_canary_promote_and_rollback_state(client, session) -> None:
    _grant_control_plane_consent(session)

    canary_payload = {
        **_freeze_payload(),
        "request_id": "req-rollout-canary-001",
        "idempotency_key": "idem-rollout-canary-001",
        "intent": "limited_release",
        "reason_code": "canary_release",
        "limited_release_percent": 20,
    }
    promote_payload = {
        **_freeze_payload(),
        "request_id": "req-rollout-promote-001",
        "idempotency_key": "idem-rollout-promote-001",
        "intent": "resume",
        "reason_code": "promotion_approved",
        "limited_release_percent": None,
    }
    rollback_payload = {
        **_freeze_payload(reason_code="rollback_triggered"),
        "request_id": "req-rollout-rollback-001",
        "idempotency_key": "idem-rollout-rollback-001",
    }

    canary_response = client.post(
        "/api/v1/admin/rollouts/canary",
        json=canary_payload,
        headers={"Authorization": "Bearer test-token"},
    )
    promote_response = client.post(
        "/api/v1/admin/rollouts/promote",
        json=promote_payload,
        headers={"Authorization": "Bearer test-token"},
    )
    rollback_response = client.post(
        "/api/v1/admin/rollouts/rollback",
        json=rollback_payload,
        headers={"Authorization": "Bearer test-token"},
    )
    status_response = client.get(
        "/api/v1/admin/rollouts/status?country_code=GH",
        headers={"Authorization": "Bearer test-token"},
    )

    assert canary_response.status_code == 200
    assert canary_response.json()["state"] == "limited_release"
    assert promote_response.status_code == 200
    assert promote_response.json()["state"] == "active"
    assert rollback_response.status_code == 200
    assert rollback_response.json()["state"] == "frozen"
    assert status_response.status_code == 200
    assert status_response.headers["x-agrodomain-contract-id"] == "observability.rollout_status_collection"
    assert status_response.json()["items"][0]["state"] == "frozen"


def test_release_readiness_blocks_after_rollback_trigger_case(client, session) -> None:
    _grant_control_plane_consent(session)

    client.post(
        "/api/v1/admin/observability/telemetry",
        json=_telemetry_payload(observation_id="obs-telemetry-003"),
        headers={"Authorization": "Bearer test-token"},
    )
    client.post(
        "/api/v1/admin/rollouts/rollback",
        json={
            **_freeze_payload(reason_code="rollback_triggered"),
            "request_id": "req-rollout-rollback-002",
            "idempotency_key": "idem-rollout-rollback-002",
        },
        headers={"Authorization": "Bearer test-token"},
    )

    readiness_response = client.get(
        "/api/v1/admin/release-readiness?country_code=GH",
        headers={"Authorization": "Bearer test-token"},
    )

    assert readiness_response.status_code == 200
    assert readiness_response.headers["x-agrodomain-contract-id"] == "observability.release_readiness_status"
    payload = readiness_response.json()
    assert payload["readiness_status"] == "blocked"
    assert any("frozen" in reason for reason in payload["blocking_reasons"])


def test_admin_audit_projection_scopes_control_plane_events(client, session) -> None:
    _grant_control_plane_consent(session)
    client.post(
        "/api/v1/admin/observability/telemetry",
        json=_telemetry_payload(observation_id="obs-telemetry-004"),
        headers={"Authorization": "Bearer test-token"},
    )

    response = client.get(
        "/api/v1/admin/audit/events?country_code=GH",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    assert response.json()["items"]
    assert all(item["country_code"] == "GH" for item in response.json()["items"])


def test_admin_control_plane_rejects_cross_country_reads_for_non_admin(client, session) -> None:
    _grant_control_plane_consent(session, role="finance_ops", country_code="GH")

    response = client.get(
        "/api/v1/admin/analytics/health?country_code=NG",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 403
    assert response.json()["detail"]["error_code"] == "missing_country_scope"


def test_admin_control_plane_requires_authorization(client) -> None:
    response = client.get("/api/v1/admin/release-readiness?country_code=GH")

    assert response.status_code == 401
