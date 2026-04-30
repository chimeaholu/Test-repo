from uuid import uuid4

from pydantic import ValidationError
from sqlalchemy import select

from app.core.auth import AuthContext
from app.core.config import Settings
from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.audit import AuditEvent
from app.services.commands.bus import CommandBus
from app.services.commands.contracts import CommandEnvelope
from app.services.commands.errors import CommandRejectedError


def make_envelope() -> CommandEnvelope:
    schema_version = get_envelope_schema_version()
    return CommandEnvelope.model_validate(
        {
            "metadata": {
                "request_id": str(uuid4()),
                "idempotency_key": "idem-12345678",
                "actor_id": "system:test",
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-1",
                "occurred_at": "2026-04-18T03:40:00+00:00",
                "traceability": {"journey_ids": ["EP-005"], "data_check_ids": []},
            },
            "command": {
                "name": "workflow.command.dispatch",
                "aggregate_ref": "workflow_execution",
                "mutation_scope": "regulated",
                "payload": {"topic": "dispatch"},
            },
        }
    )


def test_command_bus_replays_duplicate_request(session) -> None:
    schema_version = get_envelope_schema_version()
    settings = Settings(
        database_url="sqlite:///:memory:",
        api_tokens={"test-token": "system:test"},
        allowed_schema_versions=[schema_version],
    )
    bus = CommandBus(
        session=session,
        telemetry=type("Telemetry", (), {"record_command": lambda *args, **kwargs: None})(),
        correlation_id="corr-1",
        settings=settings,
    )
    auth_context = AuthContext(actor_subject="system:test", token="test-token", consent_granted=True)
    envelope = make_envelope()

    first = bus.dispatch(envelope, auth_context)
    second = bus.dispatch(envelope, auth_context)
    session.commit()

    assert first.status == "accepted"
    assert second.status == "replayed"
    assert second.result == first.result
    assert second.replayed is True


def test_command_bus_rejects_invalid_schema_version(session) -> None:
    try:
        CommandEnvelope.model_validate(
            {
                "metadata": {
                    "request_id": str(uuid4()),
                    "idempotency_key": "idem-87654321",
                    "actor_id": "system:test",
                    "country_code": "GH",
                    "channel": "pwa",
                    "schema_version": "2.0.0",
                    "correlation_id": "corr-1",
                    "occurred_at": "2026-04-18T03:40:00+00:00",
                    "traceability": {"journey_ids": ["EP-005"], "data_check_ids": []},
                },
                "command": {
                    "name": "workflow.command.dispatch",
                    "aggregate_ref": "workflow_execution",
                    "mutation_scope": "regulated",
                    "payload": {"topic": "dispatch"},
                },
            }
        )
    except ValidationError as exc:
        assert "RequestEnvelope validation failed" in str(exc)
    else:
        raise AssertionError("invalid schema version should fail at contract adapter")


def test_command_bus_rejects_idempotency_conflict_for_different_command(session) -> None:
    schema_version = get_envelope_schema_version()
    settings = Settings(
        database_url="sqlite:///:memory:",
        api_tokens={"test-token": "system:test"},
        allowed_schema_versions=[schema_version],
    )
    bus = CommandBus(
        session=session,
        telemetry=type("Telemetry", (), {"record_command": lambda *args, **kwargs: None})(),
        correlation_id="corr-1",
        settings=settings,
    )
    auth_context = AuthContext(actor_subject="system:test", token="test-token", consent_granted=True)

    first = make_envelope()
    second = CommandEnvelope.model_validate(
        {
            "metadata": {
                "request_id": str(uuid4()),
                "idempotency_key": first.metadata.idempotency_key,
                "actor_id": "system:test",
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-2",
                "occurred_at": "2026-04-18T03:50:00+00:00",
                "traceability": {"journey_ids": ["RJ-002"], "data_check_ids": []},
            },
            "command": {
                "name": "market.listings.update",
                "aggregate_ref": "listing-001",
                "mutation_scope": "marketplace.listings",
                "payload": {
                    "listing_id": "listing-001",
                    "title": "Updated title",
                    "commodity": "Cassava",
                    "quantity_tons": 4.5,
                    "price_amount": 330,
                    "price_currency": "GHS",
                    "location": "Tamale, GH",
                    "summary": "Bagged cassava stock updated with pickup and moisture evidence.",
                },
            },
        }
    )

    first_result = bus.dispatch(first, auth_context)
    assert first_result.status == "accepted"

    try:
        bus.dispatch(second, auth_context)
    except CommandRejectedError as exc:
        assert exc.status_code == 409
        assert exc.error_code == "idempotency_conflict"
    else:
        raise AssertionError("second command should be rejected")

    session.commit()
    latest_event = session.execute(
        select(AuditEvent).order_by(AuditEvent.id.desc()).limit(1)
    ).scalar_one()
    assert latest_event.reason_code == "idempotency_conflict"


def test_command_bus_rejects_unsupported_negotiation_command(session) -> None:
    schema_version = get_envelope_schema_version()
    settings = Settings(
        database_url="sqlite:///:memory:",
        api_tokens={"test-token": "system:test"},
        allowed_schema_versions=[schema_version],
    )
    telemetry = type(
        "Telemetry",
        (),
        {
            "record_command": lambda *args, **kwargs: None,
            "record_negotiation_transition": lambda *args, **kwargs: None,
        },
    )()
    bus = CommandBus(
        session=session,
        telemetry=telemetry,
        correlation_id="corr-negotiation-unsupported",
        settings=settings,
    )
    auth_context = AuthContext(actor_subject="system:test", token="test-token", consent_granted=True)
    envelope = CommandEnvelope.model_validate(
        {
            "metadata": {
                "request_id": str(uuid4()),
                "idempotency_key": "idem-unsupported-negotiation",
                "actor_id": "system:test",
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-negotiation-unsupported",
                "occurred_at": "2026-04-18T04:00:00+00:00",
                "traceability": {"journey_ids": ["CJ-003"], "data_check_ids": ["DI-002"]},
            },
            "command": {
                "name": "market.negotiations.accept",
                "aggregate_ref": "thread-unsupported",
                "mutation_scope": "marketplace.negotiations",
                "payload": {"thread_id": "thread-unsupported"},
            },
        }
    )

    try:
        bus.dispatch(envelope, auth_context)
    except CommandRejectedError as exc:
        assert exc.status_code == 422
        assert exc.error_code == "unsupported_negotiation_command"
    else:
        raise AssertionError("unsupported negotiation command should be rejected")


def test_command_bus_requires_consent_for_fund_commands(session) -> None:
    schema_version = get_envelope_schema_version()
    settings = Settings(
        database_url="sqlite:///:memory:",
        api_tokens={"test-token": "system:test"},
        allowed_schema_versions=[schema_version],
    )
    bus = CommandBus(
        session=session,
        telemetry=type("Telemetry", (), {"record_command": lambda *args, **kwargs: None})(),
        correlation_id="corr-fund-consent",
        settings=settings,
    )
    auth_context = AuthContext(actor_subject="system:test", token="test-token", consent_granted=False)
    envelope = CommandEnvelope.model_validate(
        {
            "metadata": {
                "request_id": str(uuid4()),
                "idempotency_key": "idem-fund-consent",
                "actor_id": "system:test",
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-fund-consent",
                "occurred_at": "2026-04-24T22:35:00+00:00",
                "traceability": {"journey_ids": ["EP-005"], "data_check_ids": ["QG-04"]},
            },
            "command": {
                "name": "fund.investments.create",
                "aggregate_ref": "fundopp-001",
                "mutation_scope": "fund.investments",
                "payload": {
                    "opportunity_id": "fundopp-001",
                    "amount": 250,
                    "currency": "GHS",
                },
            },
        }
    )

    try:
        bus.dispatch(envelope, auth_context)
    except CommandRejectedError as exc:
        assert exc.status_code == 403
        assert exc.error_code == "missing_consent"
    else:
        raise AssertionError("fund commands should require consent")
