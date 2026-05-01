import json

import pytest

from agro_v2.audit_events import (
    AppendOnlyAuditEventWriter,
    AuditEvent,
    AuditEventSchemaError,
    AuditLogIntegrityError,
    compute_event_hash,
    validate_persisted_audit_record,
)


def test_append_event_writes_canonical_record_with_hash_chain(tmp_path):
    log_path = tmp_path / "audit.log"
    writer = AppendOnlyAuditEventWriter(log_path)

    first = writer.append_event(
        AuditEvent(
            event_type="consent.captured",
            actor_id="user-123",
            schema_version="audit.v1",
            payload={"channel": "whatsapp"},
            metadata={"journey": "CJ-008"},
        )
    )
    second = writer.append_event(
        AuditEvent(
            event_type="policy.check",
            actor_id="agent-01",
            schema_version="audit.v1",
            payload={"result": "allow"},
            metadata={"journey": "EP-005"},
        )
    )

    lines = log_path.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2

    first_record = json.loads(lines[0])
    second_record = json.loads(lines[1])

    assert first_record == first
    assert second_record == second
    assert first_record["schema_version"] == "audit.v1"
    assert first_record["previous_event_hash"] is None
    assert second_record["previous_event_hash"] == first_record["event_hash"]
    assert first_record["event_hash"] == compute_event_hash(first_record)
    assert second_record["event_hash"] == compute_event_hash(second_record)


def test_append_event_rejects_tampered_existing_tail_record(tmp_path):
    log_path = tmp_path / "audit.log"
    writer = AppendOnlyAuditEventWriter(log_path)
    record = writer.append_event(
        AuditEvent(
            event_type="consent.captured",
            actor_id="user-123",
            schema_version="audit.v1",
            payload={"channel": "ussd"},
        )
    )

    record["payload"]["channel"] = "tampered"
    log_path.write_text(json.dumps(record) + "\n", encoding="utf-8")

    with pytest.raises(AuditLogIntegrityError, match="hash does not match"):
        writer.append_event(
            AuditEvent(
                event_type="policy.check",
                actor_id="agent-01",
                schema_version="audit.v1",
                payload={"result": "deny"},
            )
        )


def test_validate_persisted_record_rejects_missing_schema_version():
    record = {
        "actor_id": "system",
        "event_id": "evt-1",
        "event_type": "policy.check",
        "metadata": {},
        "occurred_at": "2026-04-13T00:00:00+00:00",
        "payload": {"result": "allow"},
        "previous_event_hash": None,
    }
    record["event_hash"] = compute_event_hash(record)

    with pytest.raises(AuditEventSchemaError, match="schema_version"):
        validate_persisted_audit_record(record)


def test_validate_persisted_record_rejects_blank_previous_hash():
    record = {
        "actor_id": "system",
        "event_id": "evt-2",
        "event_type": "policy.check",
        "metadata": {},
        "occurred_at": "2026-04-13T00:00:00+00:00",
        "payload": {"result": "allow"},
        "previous_event_hash": "",
        "schema_version": "audit.v1",
    }
    record["event_hash"] = compute_event_hash(record)

    with pytest.raises(AuditEventSchemaError, match="previous_event_hash"):
        validate_persisted_audit_record(record)


def test_audit_event_validates_required_fields_and_mapping_types():
    with pytest.raises(AuditEventSchemaError, match="event_type"):
        AuditEvent(event_type=" ", actor_id="user-123", schema_version="audit.v1")

    with pytest.raises(AuditEventSchemaError, match="actor_id"):
        AuditEvent(
            event_type="consent.captured",
            actor_id=" ",
            schema_version="audit.v1",
        )

    with pytest.raises(AuditEventSchemaError, match="schema_version"):
        AuditEvent(
            event_type="consent.captured",
            actor_id="user-123",
            schema_version=" ",
        )

    with pytest.raises(AuditEventSchemaError, match="payload"):
        AuditEvent(
            event_type="consent.captured",
            actor_id="user-123",
            schema_version="audit.v1",
            payload=["bad-payload"],
        )


def test_append_event_rejects_invalid_json_tail(tmp_path):
    log_path = tmp_path / "audit.log"
    log_path.write_text("{not-json}\n", encoding="utf-8")
    writer = AppendOnlyAuditEventWriter(log_path)

    with pytest.raises(AuditLogIntegrityError, match="not valid JSON"):
        writer.append_event(
            AuditEvent(
                event_type="policy.check",
                actor_id="agent-01",
                schema_version="audit.v1",
                payload={"result": "allow"},
            )
        )
