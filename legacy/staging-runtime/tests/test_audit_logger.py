from datetime import datetime, timezone
from types import MappingProxyType

import pytest

from agro_v2.audit_logger import ImmutableAuditLogger


def test_append_creates_hash_chained_events():
    timestamps = iter(
        (
            datetime(2026, 4, 13, 10, 0, tzinfo=timezone.utc),
            datetime(2026, 4, 13, 10, 1, tzinfo=timezone.utc),
        )
    )
    logger = ImmutableAuditLogger(clock=lambda: next(timestamps))

    first = logger.append(
        event_type="consent.captured",
        actor_id="farmer-001",
        request_id="req-001",
        idempotency_key="idem-001",
        schema_version="2026-04-13",
        outcome="accepted",
        payload={"channel": "ussd", "grants": ["marketplace"]},
        metadata={"country_code": "GH"},
    )
    second = logger.append(
        event_type="policy.denied",
        actor_id="admin-001",
        request_id="req-002",
        idempotency_key="idem-002",
        schema_version="2026-04-13",
        outcome="rejected",
        payload={"reason_code": "POLICY_DENY"},
        metadata={"country_code": "GH", "risk_level": "high"},
    )

    assert first.event_id == "audit-000001"
    assert second.event_id == "audit-000002"
    assert first.previous_event_hash is None
    assert second.previous_event_hash == first.event_hash
    assert len(logger.events) == 2
    assert logger.events == (first, second)


def test_events_and_nested_payloads_are_immutable():
    logger = ImmutableAuditLogger(
        clock=lambda: datetime(2026, 4, 13, 10, 0, tzinfo=timezone.utc)
    )

    event = logger.append(
        event_type="wallet.settlement_started",
        actor_id="svc-wallet",
        request_id="req-003",
        idempotency_key="idem-003",
        schema_version="2026-04-13",
        outcome="accepted",
        payload={"steps": ["reserve", "notify"], "amount": {"value": "20.00", "currency": "GHS"}},
        metadata={"tags": ["finance", "sensitive"]},
    )

    assert isinstance(event.payload, MappingProxyType)
    assert isinstance(event.metadata, MappingProxyType)
    assert event.payload["steps"] == ("reserve", "notify")

    with pytest.raises(TypeError):
        event.payload["steps"] = ("tampered",)

    with pytest.raises(TypeError):
        event.metadata["tags"] += ("tampered",)

    with pytest.raises(AttributeError):
        logger.events += (event,)


def test_event_hash_changes_with_payload_content():
    fixed_time = datetime(2026, 4, 13, 10, 0, tzinfo=timezone.utc)

    logger_a = ImmutableAuditLogger(clock=lambda: fixed_time)
    logger_b = ImmutableAuditLogger(clock=lambda: fixed_time)

    event_a = logger_a.append(
        event_type="agent.tool_call",
        actor_id="agent-001",
        request_id="req-004",
        idempotency_key="idem-004",
        schema_version="2026-04-13",
        outcome="accepted",
        payload={"tool": "weather", "schema_version": "1"},
        metadata={"country_code": "NG"},
    )
    event_b = logger_b.append(
        event_type="agent.tool_call",
        actor_id="agent-001",
        request_id="req-004",
        idempotency_key="idem-004",
        schema_version="2026-04-13",
        outcome="accepted",
        payload={"tool": "weather", "schema_version": "2"},
        metadata={"country_code": "NG"},
    )

    assert event_a.event_hash != event_b.event_hash
