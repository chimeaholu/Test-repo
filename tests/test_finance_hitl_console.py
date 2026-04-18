import pytest

from agro_v2.climate_risk_ingestion import ClimateRiskSignal, ClimateSourceType
from agro_v2.finance_hitl_console import (
    ApprovalState,
    ConsoleViewState,
    FinanceHitlConsoleError,
    FinanceInsuranceHitlApprovalConsole,
)
from agro_v2.finance_partner_adapter import (
    FinanceDecisionType,
    FinancePartnerConfig,
    FinancePartnerDecisionAdapter,
    FinancePartnerDecisionRequest,
    ResponsibilityBoundary,
)
from agro_v2.insurance_trigger_registry import (
    InsuranceParametricTriggerRegistry,
    ParametricTriggerDefinition,
    ParametricTriggerThreshold,
    TriggerOperator,
)


def build_boundary() -> ResponsibilityBoundary:
    return ResponsibilityBoundary(
        platform_responsibilities=(
            "collect applicant consent",
            "normalize request envelope",
            "surface decision rationale summary",
        ),
        partner_responsibilities=(
            "perform regulated underwriting decision",
            "own approval liability",
            "operate dispute escalation desk",
        ),
        liability_owner="licensed_partner",
        dispute_path="partner-tier1 -> platform-support -> ombuds",
    )


def build_adapter() -> FinancePartnerDecisionAdapter:
    adapter = FinancePartnerDecisionAdapter()
    adapter.register_partner(
        FinancePartnerConfig(
            partner_id="apollo-credit",
            decision_types=(FinanceDecisionType.CREDIT, FinanceDecisionType.INSURANCE),
            supported_countries=("GH", "NG"),
            max_amount_minor=2_000_000,
            manual_review_amount_minor=750_000,
            manual_review_risk_score=0.45,
            decline_risk_score=0.8,
            responsibility_boundary=build_boundary(),
        )
    )
    return adapter


def build_manual_review_decision():
    return build_adapter().submit(
        FinancePartnerDecisionRequest(
            request_id="fpd-022-1",
            idempotency_key="idem-022-1",
            schema_version="finance-partner.v1",
            decision_type=FinanceDecisionType.CREDIT,
            partner_id="apollo-credit",
            country_code="GH",
            applicant_id="farmer-022",
            product_code="seasonal-input-loan",
            amount_minor=900_000,
            currency="GHS",
            risk_score=0.5,
            actor_id="svc-finance",
            policy_context={"country_pack": "GH", "risk_class": "medium"},
            evidence_reference_ids=("wallet:ledger-ready",),
        )
    )


def build_payout_event():
    decision = build_adapter().submit(
        FinancePartnerDecisionRequest(
            request_id="fpd-022-2",
            idempotency_key="idem-022-2",
            schema_version="finance-partner.v1",
            decision_type=FinanceDecisionType.INSURANCE,
            partner_id="apollo-credit",
            country_code="GH",
            applicant_id="farmer-022",
            product_code="dryness-cover",
            amount_minor=420_000,
            currency="GHS",
            risk_score=0.2,
            actor_id="svc-finance",
            policy_context={"country_pack": "GH", "risk_class": "medium"},
            evidence_reference_ids=("mrv:record-022",),
        )
    )
    registry = InsuranceParametricTriggerRegistry()
    registry.register(
        ParametricTriggerDefinition(
            trigger_id="trigger-022-1",
            partner_id="apollo-credit",
            country_code="GH",
            product_code="dryness-cover",
            coverage_currency="GHS",
            thresholds=(
                ParametricTriggerThreshold(
                    metric_name="soil_moisture_ratio",
                    operator=TriggerOperator.LTE,
                    threshold_value=0.2,
                    payout_factor=0.3,
                    source_reference="chirps.v1:soil_moisture",
                ),
            ),
            evidence_reference_ids=("mrv:record-022", "policy:threshold-022"),
        )
    )
    [event] = registry.evaluate(
        signal=ClimateRiskSignal(
            signal_id="signal-022-1",
            farm_id="farm-022",
            country_code="GH",
            region="west_africa",
            source_type=ClimateSourceType.SATELLITE,
            normalized_metric="soil_moisture_ratio",
            normalized_value=0.18,
            normalized_unit="ratio",
            risk_hint="dryness_watch",
            observed_at="2026-04-13T11:00:00Z",
            provenance_key="satellite:chirps:record-022",
            reconciliation_key="GH:farm-022:soil_moisture_ratio:2026-04-13T11:00:00Z",
            confidence=0.93,
        ),
        partner_decision=decision,
        coverage_amount_minor=1_000_000,
    )
    return event


def test_console_moves_partner_decision_from_pending_to_approved():
    console = FinanceInsuranceHitlApprovalConsole()
    queued = console.queue_partner_decision(
        item_id="queue-022-1",
        decision=build_manual_review_decision(),
        country_code="GH",
        amount_minor=900_000,
        currency="GHS",
        submitted_at="2026-04-13T12:00:00Z",
        submitted_by="svc-finance",
        risk_score=55,
        evidence_reference_ids=("wallet:ledger-ready",),
    )

    assert queued.status == ApprovalState.PENDING

    in_review = console.start_review(
        item_id="queue-022-1",
        actor_id="ops-022",
        actor_role="finance_ops",
        country_code="GH",
        occurred_at="2026-04-13T12:05:00Z",
        note="starting review",
    )
    resolved = console.decide(
        item_id="queue-022-1",
        actor_id="ops-022",
        actor_role="finance_ops",
        country_code="GH",
        occurred_at="2026-04-13T12:10:00Z",
        approved=True,
        note="all underwriting artifacts present",
    )

    assert in_review.status == ApprovalState.IN_REVIEW
    assert resolved.status == ApprovalState.APPROVED
    assert [action.action for action in resolved.actions] == ["queued", "start_review", "approve"]


def test_console_rejects_unauthorized_role_and_non_hitl_partner_decision():
    console = FinanceInsuranceHitlApprovalConsole()
    approved_decision = build_adapter().submit(
        FinancePartnerDecisionRequest(
            request_id="fpd-022-3",
            idempotency_key="idem-022-3",
            schema_version="finance-partner.v1",
            decision_type=FinanceDecisionType.CREDIT,
            partner_id="apollo-credit",
            country_code="GH",
            applicant_id="farmer-022",
            product_code="seasonal-input-loan",
            amount_minor=200_000,
            currency="GHS",
            risk_score=0.2,
            actor_id="svc-finance",
            policy_context={"country_pack": "GH", "risk_class": "low"},
            evidence_reference_ids=("wallet:ledger-ready",),
        )
    )

    with pytest.raises(FinanceHitlConsoleError, match="does not require HITL"):
        console.queue_partner_decision(
            item_id="queue-022-2",
            decision=approved_decision,
            country_code="GH",
            amount_minor=200_000,
            currency="GHS",
            submitted_at="2026-04-13T12:00:00Z",
            submitted_by="svc-finance",
            risk_score=20,
            evidence_reference_ids=("wallet:ledger-ready",),
        )

    console.queue_partner_decision(
        item_id="queue-022-3",
        decision=build_manual_review_decision(),
        country_code="GH",
        amount_minor=900_000,
        currency="GHS",
        submitted_at="2026-04-13T12:00:00Z",
        submitted_by="svc-finance",
        risk_score=55,
        evidence_reference_ids=("wallet:ledger-ready",),
    )
    with pytest.raises(FinanceHitlConsoleError, match="operator not allowed"):
        console.start_review(
            item_id="queue-022-3",
            actor_id="farmer-022",
            actor_role="farmer",
            country_code="GH",
            occurred_at="2026-04-13T12:05:00Z",
        )


def test_console_supports_payout_queue_and_filtered_empty_view_state():
    console = FinanceInsuranceHitlApprovalConsole()
    snapshot = console.snapshot()
    assert snapshot.view_state == ConsoleViewState.EMPTY

    payout_item = console.queue_payout_event(
        item_id="queue-022-4",
        payout_event=build_payout_event(),
        submitted_at="2026-04-13T12:00:00Z",
        submitted_by="svc-finance",
        risk_score=40,
    )
    filtered = console.snapshot(status_filter=ApprovalState.APPROVED)

    assert payout_item.status == ApprovalState.PENDING
    assert console.snapshot().view_state == ConsoleViewState.READY
    assert filtered.view_state == ConsoleViewState.FILTERED_EMPTY


def test_console_requires_review_before_decision():
    console = FinanceInsuranceHitlApprovalConsole()
    console.queue_partner_decision(
        item_id="queue-022-5",
        decision=build_manual_review_decision(),
        country_code="GH",
        amount_minor=900_000,
        currency="GHS",
        submitted_at="2026-04-13T12:00:00Z",
        submitted_by="svc-finance",
        risk_score=55,
        evidence_reference_ids=("wallet:ledger-ready",),
    )

    with pytest.raises(FinanceHitlConsoleError, match="must be in_review"):
        console.decide(
            item_id="queue-022-5",
            actor_id="ops-022",
            actor_role="finance_ops",
            country_code="GH",
            occurred_at="2026-04-13T12:10:00Z",
            approved=False,
            note="insufficient evidence",
        )
