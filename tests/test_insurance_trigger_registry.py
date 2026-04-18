import pytest

from agro_v2.climate_risk_ingestion import ClimateRiskSignal, ClimateSourceType
from agro_v2.finance_partner_adapter import (
    FinanceDecisionOutcome,
    FinanceDecisionType,
    FinancePartnerConfig,
    FinancePartnerDecisionAdapter,
    FinancePartnerDecisionRequest,
    FinancePartnerDecisionResponse,
    ResponsibilityBoundary,
)
from agro_v2.insurance_trigger_registry import (
    InsuranceParametricTriggerRegistry,
    InsuranceTriggerRegistryError,
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


def build_partner(**overrides) -> FinancePartnerConfig:
    payload = {
        "partner_id": "apollo-credit",
        "decision_types": (FinanceDecisionType.INSURANCE,),
        "supported_countries": ("GH", "NG"),
        "max_amount_minor": 2_000_000,
        "manual_review_amount_minor": 750_000,
        "manual_review_risk_score": 0.45,
        "decline_risk_score": 0.8,
        "responsibility_boundary": build_boundary(),
    }
    payload.update(overrides)
    return FinancePartnerConfig(**payload)


def build_request(**overrides) -> FinancePartnerDecisionRequest:
    payload = {
        "request_id": "fpd-021-1",
        "idempotency_key": "idem-021-1",
        "schema_version": "finance-partner.v1",
        "decision_type": FinanceDecisionType.INSURANCE,
        "partner_id": "apollo-credit",
        "country_code": "GH",
        "applicant_id": "farmer-021",
        "product_code": "dryness-cover",
        "amount_minor": 420_000,
        "currency": "GHS",
        "risk_score": 0.31,
        "actor_id": "svc-finance",
        "policy_context": {"country_pack": "GH", "risk_class": "medium"},
        "evidence_reference_ids": ("mrv:record-021",),
    }
    payload.update(overrides)
    return FinancePartnerDecisionRequest(**payload)


def build_signal(**overrides) -> ClimateRiskSignal:
    payload = {
        "signal_id": "climate:signal-21-1",
        "farm_id": "farm-021",
        "country_code": "GH",
        "region": "west_africa",
        "source_type": ClimateSourceType.SATELLITE,
        "normalized_metric": "soil_moisture_ratio",
        "normalized_value": 0.18,
        "normalized_unit": "ratio",
        "risk_hint": "dryness_watch",
        "observed_at": "2026-04-13T11:00:00Z",
        "provenance_key": "satellite:chirps:rec-21-1",
        "reconciliation_key": "GH:farm-021:soil_moisture_ratio:2026-04-13T11:00:00Z",
        "confidence": 0.91,
    }
    payload.update(overrides)
    return ClimateRiskSignal(**payload)


def build_definition(**overrides) -> ParametricTriggerDefinition:
    payload = {
        "trigger_id": "trigger-021-1",
        "partner_id": "apollo-credit",
        "country_code": "GH",
        "product_code": "dryness-cover",
        "coverage_currency": "GHS",
        "thresholds": (
            ParametricTriggerThreshold(
                metric_name="soil_moisture_ratio",
                operator=TriggerOperator.LTE,
                threshold_value=0.2,
                payout_factor=0.35,
                source_reference="chirps.v1:soil_moisture",
            ),
        ),
        "evidence_reference_ids": ("mrv:record-021", "policy:threshold-021"),
    }
    payload.update(overrides)
    return ParametricTriggerDefinition(**payload)


def build_partner_response(**overrides) -> FinancePartnerDecisionResponse:
    adapter = FinancePartnerDecisionAdapter()
    adapter.register_partner(
        build_partner(
            decision_types=(FinanceDecisionType.INSURANCE,),
            responsibility_boundary=build_boundary(),
        )
    )
    request = build_request(
        request_id="fpd-021-1",
        idempotency_key="idem-021-1",
        decision_type=FinanceDecisionType.INSURANCE,
        product_code="dryness-cover",
        evidence_reference_ids=("mrv:record-021",),
    )
    payload = adapter.submit(request)
    if overrides:
        payload = FinancePartnerDecisionResponse(
            request_id=overrides.get("request_id", payload.request_id),
            partner_id=overrides.get("partner_id", payload.partner_id),
            decision_type=overrides.get("decision_type", payload.decision_type),
            product_code=overrides.get("product_code", payload.product_code),
            outcome=overrides.get("outcome", payload.outcome),
            partner_reference_id=overrides.get(
                "partner_reference_id", payload.partner_reference_id
            ),
            responsibility_boundary=overrides.get(
                "responsibility_boundary", payload.responsibility_boundary
            ),
            rationale_summary=overrides.get("rationale_summary", payload.rationale_summary),
            requires_hitl=overrides.get("requires_hitl", payload.requires_hitl),
            data_check_id=overrides.get("data_check_id", payload.data_check_id),
            metadata=overrides.get("metadata", payload.metadata),
        )
    return payload


def test_registry_emits_payout_event_for_matching_approved_signal():
    registry = InsuranceParametricTriggerRegistry()
    registry.register(build_definition())

    [event] = registry.evaluate(
        signal=build_signal(),
        partner_decision=build_partner_response(),
        coverage_amount_minor=1_000_000,
    )

    assert event.payout_amount_minor == 350_000
    assert event.source_reference == "chirps.v1:soil_moisture"
    assert event.data_check_id == "DI-006"


def test_registry_dedupes_repeated_payout_evaluations():
    registry = InsuranceParametricTriggerRegistry()
    registry.register(build_definition())
    decision = build_partner_response()
    signal = build_signal()

    first = registry.evaluate(
        signal=signal,
        partner_decision=decision,
        coverage_amount_minor=1_000_000,
    )
    second = registry.evaluate(
        signal=signal,
        partner_decision=decision,
        coverage_amount_minor=1_000_000,
    )

    assert len(first) == 1
    assert second == ()


def test_registry_skips_non_approved_partner_decisions():
    registry = InsuranceParametricTriggerRegistry()
    registry.register(build_definition())

    events = registry.evaluate(
        signal=build_signal(),
        partner_decision=build_partner_response(outcome=FinanceDecisionOutcome.MANUAL_REVIEW),
        coverage_amount_minor=1_000_000,
    )

    assert events == ()


def test_registry_rejects_non_insurance_decisions_and_duplicate_trigger_ids():
    registry = InsuranceParametricTriggerRegistry()
    definition = build_definition()
    registry.register(definition)

    with pytest.raises(InsuranceTriggerRegistryError, match="trigger_id already registered"):
        registry.register(definition)

    with pytest.raises(
        InsuranceTriggerRegistryError,
        match="must be an insurance decision",
    ):
        registry.evaluate(
            signal=build_signal(),
            partner_decision=build_partner_response(
                decision_type=FinanceDecisionType.CREDIT,
                product_code="seasonal-input-loan",
            ),
            coverage_amount_minor=1_000_000,
        )
