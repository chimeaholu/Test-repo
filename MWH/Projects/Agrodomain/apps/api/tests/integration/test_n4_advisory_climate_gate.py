from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from app.core.contracts_catalog import get_envelope_schema_version
from app.db.repositories.identity import IdentityRepository


REPO_ROOT = Path(__file__).resolve().parents[4]
CONTRACTS_ROOT = REPO_ROOT / "packages" / "contracts" / "src"


def _create_session(session, *, actor_id: str, role: str, country_code: str = "GH") -> str:
    identity_repository = IdentityRepository(session)
    identity_repository.ensure_membership(actor_id=actor_id, role=role, country_code=country_code)
    record = identity_repository.create_or_rotate_session(
        actor_id=actor_id,
        display_name=actor_id,
        email=f"{actor_id}@example.com",
        role=role,
        country_code=country_code,
    )
    identity_repository.grant_consent(
        actor_id=actor_id,
        country_code=country_code,
        policy_version="2026.04.n4",
        scope_ids=["identity.core", "workflow.audit", "climate.runtime", "advisory.runtime"],
        captured_at=datetime.now(tz=UTC),
    )
    session.commit()
    return record.session_token


def _command_payload(
    *,
    actor_id: str,
    command_name: str,
    aggregate_ref: str,
    mutation_scope: str,
    payload: dict[str, object],
    journey_ids: list[str],
    data_check_ids: list[str],
) -> dict[str, object]:
    request_id = f"req-{uuid4()}"
    return {
        "metadata": {
            "request_id": request_id,
            "idempotency_key": f"idem-{uuid4()}",
            "actor_id": actor_id,
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": get_envelope_schema_version(),
            "correlation_id": request_id,
            "occurred_at": "2026-04-18T20:30:00+00:00",
            "traceability": {
                "journey_ids": journey_ids,
                "data_check_ids": data_check_ids,
            },
        },
        "command": {
            "name": command_name,
            "aggregate_ref": aggregate_ref,
            "mutation_scope": mutation_scope,
            "payload": payload,
        },
    }


def test_n4_openapi_and_contract_surface_expose_runtime_reads(client) -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]

    assert "/api/v1/advisory/conversations" in paths
    assert "/api/v1/climate/degraded-modes" in paths
    assert "/api/v1/climate/mrv-evidence" in paths

    advisory_contract_source = (CONTRACTS_ROOT / "advisory" / "index.ts").read_text()
    climate_contract_source = (CONTRACTS_ROOT / "climate" / "index.ts").read_text()

    assert "advisoryConversationCollectionContract" in advisory_contract_source
    assert "climateDegradedModeContract" in climate_contract_source
    assert "mrvEvidenceRecordContract" in climate_contract_source


def test_cj005_ep006_di005_advisory_conversations_surface_grounded_runtime(client, session) -> None:
    actor_id = "actor-farmer-gh-n4-advisory"
    token = _create_session(session, actor_id=actor_id, role="farmer")
    payload = _command_payload(
        actor_id=actor_id,
        command_name="advisory.requests.submit",
        aggregate_ref="advisory-thread-gate",
        mutation_scope="advisory.requests",
        journey_ids=["CJ-005", "EP-006"],
        data_check_ids=["DI-005"],
        payload={
            "topic": "soil moisture planning",
            "question_text": "What should I do about low soil moisture before replanting weak maize pockets?",
            "locale": "en-GH",
            "transcript_entries": [],
            "policy_context": {"crop": "maize", "sensitive_topics": []},
        },
    )

    command_response = client.post(
        "/api/v1/workflow/commands",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert command_response.status_code == 200

    response = client.get(
        "/api/v1/advisory/conversations?locale=en-GH",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["schema_version"] == get_envelope_schema_version()
    assert len(body["items"]) == 1
    assert body["items"][0]["grounded"] is True
    assert len(body["items"][0]["citations"]) >= 1
    assert body["items"][0]["reviewer_decision"]["outcome"] in {
        "approve",
        "revise",
        "block",
        "hitl_required",
    }


def test_cj006_ep008_di006_climate_surfaces_expose_degraded_mode_and_mrv(client, session) -> None:
    actor_id = "actor-farmer-gh-n4-climate"
    token = _create_session(session, actor_id=actor_id, role="farmer")

    ingest_payload = _command_payload(
        actor_id=actor_id,
        command_name="climate.observations.ingest",
        aggregate_ref="farm-gh-n4-gate",
        mutation_scope="climate.runtime",
        journey_ids=["CJ-006"],
        data_check_ids=["DI-006"],
        payload={
            "farm_id": "farm-gh-n4-gate",
            "farm_profile": {
                "farm_name": "N4 Gate Plot",
                "district": "Tamale",
                "crop_type": "Maize",
                "hectares": 2.8,
            },
            "source_id": "sat-n4-gate",
            "source_type": "satellite",
            "observed_at": "2026-04-18T08:00:00Z",
            "source_window_start": "2026-04-17T00:00:00Z",
            "source_window_end": "2026-04-17T12:00:00Z",
            "rainfall_mm": 12,
            "temperature_c": 32,
            "soil_moisture_pct": 18,
            "anomaly_score": 0.82,
            "source_window_complete": False,
            "source_window_consistent": False,
            "assumptions": ["Half-day satellite window due to cloud cover."],
            "degraded_reason_codes": ["source_feed_delay"],
        },
    )
    ingest_response = client.post(
        "/api/v1/workflow/commands",
        json=ingest_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ingest_response.status_code == 200

    mrv_payload = _command_payload(
        actor_id=actor_id,
        command_name="climate.mrv.create",
        aggregate_ref="farm-gh-n4-gate",
        mutation_scope="climate.runtime",
        journey_ids=["CJ-006", "EP-008"],
        data_check_ids=["DI-006"],
        payload={
            "farm_id": "farm-gh-n4-gate",
            "evidence_type": "climate_risk_baseline",
            "method_tag": "gh-mrv-v1",
            "method_references": ["GH-MRV-Guide-2026", "Sentinel-2-blended-window"],
            "source_window_start": "2026-04-17T00:00:00Z",
            "source_window_end": "2026-04-18T00:00:00Z",
            "assumptions": [
                "Missing half-day window estimated from prior district trend.",
                "Carbon-related outputs remain estimates pending field verification.",
            ],
        },
    )
    mrv_response = client.post(
        "/api/v1/workflow/commands",
        json=mrv_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert mrv_response.status_code == 200

    degraded_response = client.get(
        "/api/v1/climate/degraded-modes",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert degraded_response.status_code == 200
    degraded_modes = degraded_response.json()
    assert len(degraded_modes) == 1
    assert degraded_modes[0]["degraded_mode"] is True
    assert degraded_modes[0]["reason_code"] in {
        "source_feed_delay",
        "source_window_unavailable",
        "source_window_inconsistent",
    }

    evidence_response = client.get(
        "/api/v1/climate/mrv-evidence",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert evidence_response.status_code == 200
    evidence_records = evidence_response.json()
    assert len(evidence_records) == 1
    assert evidence_records[0]["method_tag"] == "gh-mrv-v1"
    assert len(evidence_records[0]["assumption_notes"]) == 2
    assert evidence_records[0]["source_completeness"] == "degraded"
