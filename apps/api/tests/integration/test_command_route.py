from sqlalchemy import func, select

from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.audit import AuditEvent, OutboxMessage
from app.db.models.workflow import WorkflowExecution


def test_duplicate_submission_has_single_business_effect(client, session) -> None:
    schema_version = get_envelope_schema_version()
    payload = {
        "metadata": {
            "request_id": "08af70da-05b0-4406-8ab7-2a85c34f2701",
            "idempotency_key": "idem-00000001",
            "actor_id": "system:test",
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": schema_version,
            "correlation_id": "corr-ep-005-1",
            "occurred_at": "2026-04-18T03:41:00+00:00",
            "traceability": {"journey_ids": ["EP-005"], "data_check_ids": []},
        },
        "command": {
            "name": "workflow.command.dispatch",
            "aggregate_ref": "workflow_execution",
            "mutation_scope": "regulated",
            "payload": {"step": "dispatch"},
        },
    }
    headers = {"Authorization": "Bearer test-token"}

    first = client.post("/api/v1/workflow/commands", json=payload, headers=headers)
    second = client.post("/api/v1/workflow/commands", json=payload, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["status"] == "accepted"
    assert second.json()["status"] == "replayed"

    assert session.execute(select(func.count()).select_from(WorkflowExecution)).scalar_one() == 1
    assert session.execute(select(func.count()).select_from(OutboxMessage)).scalar_one() == 1
    assert session.execute(select(func.count()).select_from(AuditEvent)).scalar_one() == 2


def test_unauthorized_mutation_attempt_is_audited(client, session) -> None:
    schema_version = get_envelope_schema_version()
    payload = {
        "metadata": {
            "request_id": "08af70da-05b0-4406-8ab7-2a85c34f2702",
            "idempotency_key": "idem-00000002",
            "actor_id": "system:test",
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": schema_version,
            "correlation_id": "corr-ep-005-2",
            "occurred_at": "2026-04-18T03:41:00+00:00",
            "traceability": {"journey_ids": ["EP-005"], "data_check_ids": []},
        },
        "command": {
            "name": "workflow.command.dispatch",
            "aggregate_ref": "workflow_execution",
            "mutation_scope": "regulated",
            "payload": {"step": "dispatch"},
        },
    }

    response = client.post("/api/v1/workflow/commands", json=payload)

    assert response.status_code == 401
    assert response.json()["detail"]["error_code"] == "unauthorized_mutation"

    event = session.execute(select(AuditEvent).order_by(AuditEvent.id.desc())).scalar_one()
    assert event.reason_code == "unauthorized_mutation"
    assert event.status == "rejected"


def test_offline_replay_submission_carries_worker_metadata_into_outbox(client, session) -> None:
    schema_version = get_envelope_schema_version()
    payload = {
        "metadata": {
            "request_id": "08af70da-05b0-4406-8ab7-2a85c34f2703",
            "idempotency_key": "idem-00000003",
            "actor_id": "system:test",
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": schema_version,
            "correlation_id": "corr-offline-3",
            "occurred_at": "2026-04-18T03:41:00+00:00",
            "traceability": {"journey_ids": ["offline:wf-offline-1"], "data_check_ids": ["offline_queue"]},
        },
        "command": {
            "name": "workflow.command.dispatch",
            "aggregate_ref": "workflow_execution",
            "mutation_scope": "regulated",
            "payload": {"step": "dispatch"},
        },
    }

    response = client.post(
        "/api/v1/workflow/commands",
        json=payload,
        headers={
            "Authorization": "Bearer test-token",
            "X-Offline-Queue-Item-ID": "offline-1",
        },
    )

    assert response.status_code == 200
    outbox = session.execute(select(OutboxMessage).order_by(OutboxMessage.id.desc())).scalar_one()
    assert outbox.payload["offline_queue_item_id"] == "offline-1"
    assert outbox.payload["journey_ids"] == ["offline:wf-offline-1"]
    assert outbox.payload["actor_id"] == "system:test"
