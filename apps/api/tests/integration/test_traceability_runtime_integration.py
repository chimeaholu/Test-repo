from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select

from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.audit import AuditEvent
from app.db.models.traceability import TraceabilityEventRecord
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
        scope_ids=["identity.core", "workflow.audit", "traceability.runtime"],
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
            "occurred_at": "2026-04-18T22:00:00+00:00",
            "traceability": {"journey_ids": [journey_id], "data_check_ids": ["DI-006"]},
        },
        "command": {
            "name": command_name,
            "aggregate_ref": "traceability",
            "mutation_scope": "traceability.runtime",
            "payload": payload,
        },
    }


def _post(client, *, token: str, payload: dict[str, object]):
    return client.post(
        "/api/v1/workflow/commands",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )


def test_cj007_traceability_chain_create_append_and_read(client, session) -> None:
    token = _create_session(session, actor_id="actor-farmer-gh-ama", role="farmer")

    create = _post(
        client,
        token=token,
        payload=_payload(
            actor_id="actor-farmer-gh-ama",
            command_name="traceability.consignments.create",
            request_suffix="cj007-create",
            journey_id="CJ-007",
            payload={
                "partner_reference_id": "partner-shipment-77",
                "current_custody_actor_id": "actor-farmer-gh-ama",
            },
        ),
    )
    assert create.status_code == 200
    consignment_id = create.json()["result"]["consignment"]["consignment_id"]

    harvested = _post(
        client,
        token=token,
        payload=_payload(
            actor_id="actor-farmer-gh-ama",
            command_name="traceability.events.append",
            request_suffix="cj007-harvested",
            journey_id="CJ-007",
            payload={
                "consignment_id": consignment_id,
                "milestone": "harvested",
                "event_reference": "evt-ref-harvested",
                "previous_event_reference": None,
                "occurred_at": "2026-04-18T10:00:00Z",
                "current_custody_actor_id": "actor-farmer-gh-ama",
            },
        ),
    )
    assert harvested.status_code == 200

    dispatched = _post(
        client,
        token=token,
        payload=_payload(
            actor_id="actor-farmer-gh-ama",
            command_name="traceability.events.append",
            request_suffix="cj007-dispatched",
            journey_id="CJ-007",
            payload={
                "consignment_id": consignment_id,
                "milestone": "dispatched",
                "event_reference": "evt-ref-dispatched",
                "previous_event_reference": "evt-ref-harvested",
                "occurred_at": "2026-04-18T11:00:00Z",
                "current_custody_actor_id": "actor-transporter-gh-1",
            },
        ),
    )
    assert dispatched.status_code == 200
    assert dispatched.json()["result"]["attachment_ready"] is True

    replay = _post(
        client,
        token=token,
        payload=_payload(
            actor_id="actor-farmer-gh-ama",
            command_name="traceability.events.append",
            request_suffix="cj007-dispatched",
            journey_id="CJ-007",
            payload={
                "consignment_id": consignment_id,
                "milestone": "dispatched",
                "event_reference": "evt-ref-dispatched",
                "previous_event_reference": "evt-ref-harvested",
                "occurred_at": "2026-04-18T11:00:00Z",
                "current_custody_actor_id": "actor-transporter-gh-1",
            },
        ),
    )
    assert replay.status_code == 200
    assert replay.json()["status"] == "replayed"

    detail = client.get(
        f"/api/v1/traceability/consignments/{consignment_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert detail.status_code == 200
    timeline = detail.json()["timeline"]
    assert [item["milestone"] for item in timeline] == ["harvested", "dispatched"]
    assert [item["order_index"] for item in timeline] == [1, 2]
    assert timeline[1]["previous_event_reference"] == "evt-ref-harvested"

    assert session.execute(select(func.count()).select_from(TraceabilityEventRecord)).scalar_one() == 2
    assert session.execute(
        select(func.count())
        .select_from(AuditEvent)
        .where(AuditEvent.event_type == "traceability.event.appended")
    ).scalar_one() == 2


def test_di006_traceability_rejects_missing_predecessor(client, session) -> None:
    token = _create_session(session, actor_id="actor-farmer-gh-ama", role="farmer")

    create = _post(
        client,
        token=token,
        payload=_payload(
            actor_id="actor-farmer-gh-ama",
            command_name="traceability.consignments.create",
            request_suffix="di006-create",
            journey_id="DI-006",
            payload={},
        ),
    )
    consignment_id = create.json()["result"]["consignment"]["consignment_id"]

    first = _post(
        client,
        token=token,
        payload=_payload(
            actor_id="actor-farmer-gh-ama",
            command_name="traceability.events.append",
            request_suffix="di006-first",
            journey_id="DI-006",
            payload={
                "consignment_id": consignment_id,
                "milestone": "harvested",
                "event_reference": "evt-ref-1",
                "previous_event_reference": None,
                "occurred_at": "2026-04-18T10:00:00Z",
            },
        ),
    )
    assert first.status_code == 200

    broken = _post(
        client,
        token=token,
        payload=_payload(
            actor_id="actor-farmer-gh-ama",
            command_name="traceability.events.append",
            request_suffix="di006-broken",
            journey_id="DI-006",
            payload={
                "consignment_id": consignment_id,
                "milestone": "in_transit",
                "event_reference": "evt-ref-2",
                "previous_event_reference": "evt-missing",
                "occurred_at": "2026-04-18T11:00:00Z",
            },
        ),
    )
    assert broken.status_code == 409
    assert broken.json()["detail"]["error_code"] == "traceability_continuity_failure"

    rejected = session.execute(
        select(AuditEvent)
        .where(AuditEvent.event_type == "command.rejected")
        .order_by(AuditEvent.id.desc())
        .limit(1)
    ).scalar_one()
    assert rejected.reason_code == "traceability_missing_predecessor"
