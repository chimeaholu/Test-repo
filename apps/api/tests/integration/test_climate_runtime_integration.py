from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select

from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.audit import AuditEvent, OutboxMessage
from app.db.models.climate import ClimateAlert, ClimateObservation, MrvEvidenceRecord
from app.db.repositories.identity import IdentityRepository


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
        policy_version="2026.04",
        scope_ids=["identity.core", "workflow.audit", "climate.runtime"],
        captured_at=datetime.now(tz=UTC),
    )
    session.commit()
    return record.session_token


def _payload(
    *,
    actor_id: str,
    command_name: str,
    payload: dict[str, object],
    request_suffix: str,
    journey_id: str,
) -> dict[str, object]:
    schema_version = get_envelope_schema_version()
    return {
        "metadata": {
            "request_id": f"req-{request_suffix}",
            "idempotency_key": f"idem-{request_suffix}",
            "actor_id": actor_id,
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": schema_version,
            "correlation_id": f"corr-{request_suffix}",
            "occurred_at": "2026-04-18T20:00:00+00:00",
            "traceability": {"journey_ids": [journey_id], "data_check_ids": ["DI-006"]},
        },
        "command": {
            "name": command_name,
            "aggregate_ref": "climate",
            "mutation_scope": "climate.runtime",
            "payload": payload,
        },
    }


def _post(client, *, token: str, payload: dict[str, object]):
    return client.post(
        "/api/v1/workflow/commands",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )


def test_cj006_climate_alert_ingest_read_and_acknowledge(client, session) -> None:
    token = _create_session(session, actor_id="actor-farmer-gh-ama", role="farmer")

    ingest_response = _post(
        client,
        token=token,
        payload=_payload(
            actor_id="actor-farmer-gh-ama",
            command_name="climate.observations.ingest",
            request_suffix="cj006-ingest",
            journey_id="CJ-006",
            payload={
                "farm_id": "farm-gh-cj006",
                "farm_profile": {
                    "farm_name": "Ama North Plot",
                    "district": "Tamale",
                    "crop_type": "Maize",
                    "hectares": 3.5,
                    "latitude": 9.4,
                    "longitude": -0.8,
                },
                "source_id": "wx-cj006",
                "source_type": "weather_api",
                "observed_at": "2026-04-18T08:00:00Z",
                "source_window_start": "2026-04-17T00:00:00Z",
                "source_window_end": "2026-04-18T00:00:00Z",
                "rainfall_mm": 92,
                "temperature_c": 34,
                "soil_moisture_pct": 37,
                "anomaly_score": 0.44,
                "source_window_complete": True,
                "source_window_consistent": True,
                "assumptions": ["Rainfall value normalized from district feed."],
            },
        ),
    )
    assert ingest_response.status_code == 200
    alert_id = ingest_response.json()["result"]["climate_alert"]["alert_id"]
    assert ingest_response.json()["result"]["climate_alert"]["alert_type"] == "flood_risk"

    alert_list = client.get(
        "/api/v1/climate/alerts?farm_id=farm-gh-cj006",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert alert_list.status_code == 200
    assert len(alert_list.json()["items"]) == 1
    assert alert_list.json()["items"][0]["status"] == "open"

    acknowledge_response = _post(
        client,
        token=token,
        payload=_payload(
            actor_id="actor-farmer-gh-ama",
            command_name="climate.alerts.acknowledge",
            request_suffix="cj006-ack",
            journey_id="CJ-006",
            payload={"alert_id": alert_id, "note": "Irrigation crew dispatched."},
        ),
    )
    assert acknowledge_response.status_code == 200
    assert acknowledge_response.json()["result"]["climate_alert"]["status"] == "acknowledged"

    alert_detail = client.get(
        f"/api/v1/climate/alerts/{alert_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert alert_detail.status_code == 200
    assert alert_detail.json()["acknowledgement_note"] == "Irrigation crew dispatched."

    assert session.execute(select(func.count()).select_from(ClimateObservation)).scalar_one() == 1
    assert session.execute(select(func.count()).select_from(ClimateAlert)).scalar_one() == 1
    assert session.execute(
        select(func.count()).select_from(AuditEvent).where(AuditEvent.event_type == "climate.alert.transitioned")
    ).scalar_one() == 2


def test_ep008_missing_source_window_creates_degraded_mrv_record(client, session) -> None:
    token = _create_session(session, actor_id="actor-farmer-gh-ama", role="farmer")

    _post(
        client,
        token=token,
        payload=_payload(
            actor_id="actor-farmer-gh-ama",
            command_name="climate.observations.ingest",
            request_suffix="ep008-ingest",
            journey_id="EP-008",
            payload={
                "farm_id": "farm-gh-ep008",
                "farm_profile": {
                    "farm_name": "Ama South Plot",
                    "district": "Tamale",
                    "crop_type": "Cassava",
                    "hectares": 2.1,
                },
                "source_id": "sat-ep008",
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
        ),
    )

    mrv_response = _post(
        client,
        token=token,
        payload=_payload(
            actor_id="actor-farmer-gh-ama",
            command_name="climate.mrv.create",
            request_suffix="ep008-mrv",
            journey_id="EP-008",
            payload={
                "farm_id": "farm-gh-ep008",
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
        ),
    )
    assert mrv_response.status_code == 200
    record = mrv_response.json()["result"]["mrv_evidence"]
    assert record["degraded_mode"] is True
    assert record["source_completeness_state"] == "missing_window"
    assert "source_window_unavailable" in record["degraded_reason_codes"]
    assert "source_window_inconsistent" in record["degraded_reason_codes"]
    assert len(record["assumptions"]) == 2
    assert len(record["method_references"]) == 2

    evidence_list = client.get(
        "/api/v1/climate/evidence?farm_id=farm-gh-ep008",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert evidence_list.status_code == 200
    assert evidence_list.json()["items"][0]["degraded_mode"] is True

    assert session.execute(select(func.count()).select_from(MrvEvidenceRecord)).scalar_one() == 1
    assert session.execute(
        select(func.count()).select_from(OutboxMessage).where(OutboxMessage.event_type == "mrv.evidence.created")
    ).scalar_one() == 1
    latest_audit = session.execute(
        select(AuditEvent).where(AuditEvent.event_type == "mrv.evidence.created")
    ).scalar_one()
    assert latest_audit.status == "missing_window"
