from datetime import datetime

from sqlalchemy import func, select

from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.audit import AuditEvent
from app.db.models.finance import FinanceRequestRecord, InsurancePayoutEventRecord
from app.db.repositories.identity import IdentityRepository


def _grant_consent(session) -> None:
    repository = IdentityRepository(session)
    repository.ensure_membership(actor_id="system:test", role="finance_ops", country_code="GH")
    repository.create_or_rotate_session(
        actor_id="system:test",
        display_name="Finance Operator",
        email="finance@example.com",
        role="finance_ops",
        country_code="GH",
    )
    repository.grant_consent(
        actor_id="system:test",
        country_code="GH",
        policy_version="2026-04",
        scope_ids=["identity.core", "workflow.audit", "regulated.finance"],
        captured_at=datetime.fromisoformat("2026-04-18T05:00:00+00:00"),
    )
    session.commit()


def test_finance_request_replay_remains_single_effect(client, session) -> None:
    _grant_consent(session)
    schema_version = get_envelope_schema_version()
    payload = {
        "metadata": {
            "request_id": "f9c79e62-c930-4b3d-b8e2-0ec6837b90b1",
            "idempotency_key": "idem-finance-runtime-1",
            "actor_id": "system:test",
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": schema_version,
            "correlation_id": "corr-finance-runtime-1",
            "occurred_at": "2026-04-18T05:00:00+00:00",
            "traceability": {"journey_ids": ["CJ-004"], "data_check_ids": ["DI-003"]},
        },
        "command": {
            "name": "finance.partner_requests.submit",
            "aggregate_ref": "finance_request",
            "mutation_scope": "regulated.finance",
            "payload": {
                "case_reference": "listing/listing-201",
                "product_type": "invoice_advance",
                "requested_amount": 1500,
                "currency": "GHS",
                "partner_id": "partner-agri-bank",
                "partner_reference_id": "partner-case-201",
                "actor_role": "finance_ops",
                "responsibility_boundary": {
                    "owner": "partner",
                    "internal_can_prepare": True,
                    "internal_can_block": True,
                    "internal_can_approve": False,
                    "partner_decision_required": True,
                },
                "policy_context": {
                    "policy_id": "finance.partner.v1",
                    "policy_version": "2026-04",
                    "matched_rule": "finance.partner.invoice_advance",
                    "requires_hitl": True,
                },
                "transcript_entries": [],
            },
        },
    }
    headers = {"Authorization": "Bearer test-token"}

    first = client.post("/api/v1/workflow/commands", json=payload, headers=headers)
    second = client.post("/api/v1/workflow/commands", json=payload, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["status"] == "accepted"
    assert second.json()["status"] == "replayed"
    assert session.execute(select(func.count()).select_from(FinanceRequestRecord)).scalar_one() == 1


def test_duplicate_insurance_evaluations_do_not_duplicate_payouts(client, session) -> None:
    _grant_consent(session)
    schema_version = get_envelope_schema_version()
    headers = {"Authorization": "Bearer test-token"}
    base_payload = {
        "metadata": {
            "actor_id": "system:test",
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": schema_version,
            "occurred_at": "2026-04-18T05:10:00+00:00",
            "traceability": {"journey_ids": ["EP-008"], "data_check_ids": ["DI-006"]},
        },
        "command": {
            "name": "insurance.triggers.evaluate",
            "aggregate_ref": "insurance_trigger",
            "mutation_scope": "regulated.insurance",
            "payload": {
                "trigger_id": "trigger-rain-201",
                "partner_id": "partner-insurer-1",
                "partner_reference_id": "policy-201",
                "actor_role": "finance_ops",
                "product_code": "rainfall-cover",
                "climate_signal": "rainfall_mm",
                "comparator": "gte",
                "threshold_value": 75,
                "threshold_unit": "mm",
                "evaluation_window_hours": 24,
                "threshold_source_id": "threshold-201",
                "threshold_source_type": "policy_table",
                "threshold_source_reference": {"table": "gh_rainfall_v2", "percentile": 95},
                "observed_value": 82,
                "source_event_id": "climate-event-201",
                "source_observation_id": "obs-201",
                "observed_at": "2026-04-18T05:10:00+00:00",
                "payout_amount": 450,
                "payout_currency": "GHS",
                "policy_context": {
                    "policy_id": "insurance.parametric.v1",
                    "policy_version": "2026-04",
                    "matched_rule": "insurance.rainfall.gte",
                    "requires_hitl": False,
                },
            },
        },
    }

    first_payload = {
        **base_payload,
        "metadata": {
            **base_payload["metadata"],
            "request_id": "e0baeb3e-8ece-46c5-b2a9-2c24d34a0011",
            "idempotency_key": "idem-insurance-runtime-1",
            "correlation_id": "corr-insurance-runtime-1",
        },
    }
    second_payload = {
        **base_payload,
        "metadata": {
            **base_payload["metadata"],
            "request_id": "e0baeb3e-8ece-46c5-b2a9-2c24d34a0012",
            "idempotency_key": "idem-insurance-runtime-2",
            "correlation_id": "corr-insurance-runtime-2",
        },
    }

    first = client.post("/api/v1/workflow/commands", json=first_payload, headers=headers)
    second = client.post("/api/v1/workflow/commands", json=second_payload, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["result"]["insurance_evaluation"]["evaluation_state"] == "payout_emitted"
    assert second.json()["result"]["insurance_evaluation"]["evaluation_state"] == "duplicate_payout"
    assert session.execute(select(func.count()).select_from(InsurancePayoutEventRecord)).scalar_one() == 1

    latest_audit = session.execute(
        select(AuditEvent).order_by(AuditEvent.id.desc()).limit(1)
    ).scalar_one()
    assert latest_audit.event_type == "insurance.trigger.evaluated"
