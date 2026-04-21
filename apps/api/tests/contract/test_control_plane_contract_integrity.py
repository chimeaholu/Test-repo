from typing import cast

from fastapi import HTTPException

from app.core.contracts_catalog import (
    get_contract_descriptor,
    get_contract_headers,
    validate_contract_payload,
)


def test_control_plane_contract_descriptors_resolve_generated_catalog() -> None:
    descriptor = get_contract_descriptor("config.environment_profile")

    assert descriptor.contract_id == "config.environment_profile"
    assert descriptor.name == "EnvironmentProfile"
    assert descriptor.schema_path.exists()


def test_control_plane_contract_headers_expose_source_of_truth_ids() -> None:
    headers = get_contract_headers("observability.telemetry_observation_record")

    assert headers["X-Agrodomain-Contract-Id"] == "observability.telemetry_observation_record"
    assert headers["X-Agrodomain-Schema-Version"] == "2026-04-18.wave1"


def test_control_plane_payload_validation_rejects_unknown_fields_and_wrong_schema_version() -> None:
    payload = {
        "schema_version": "wrong-version",
        "request_id": "req-1",
        "actor_id": "actor-1",
        "country_code": "GH",
        "channel": "api",
        "service_name": "rollout_control",
        "slo_id": None,
        "alert_severity": None,
        "audit_event_id": 0,
        "idempotency_key": "idem-1",
        "actor_role": "admin",
        "scope_key": "gh-admin",
        "intent": "freeze",
        "reason_code": "manual_freeze",
        "reason_detail": "Freeze requested during compatibility check.",
        "limited_release_percent": None,
        "unexpected": True,
    }

    try:
        validate_contract_payload("observability.rollout_control_input", payload)
    except HTTPException as exc:
        detail = cast(dict[str, object], exc.detail)
        assert detail["error_code"] == "unknown_contract_fields"
    else:
        raise AssertionError("Expected control-plane payload validation to reject drift")
