import pytest

from agro_v2.finance_partner_adapter import (
    FinanceDecisionOutcome,
    FinanceDecisionType,
    FinancePartnerAdapterError,
    FinancePartnerConfig,
    FinancePartnerDecisionAdapter,
    FinancePartnerDecisionRequest,
    ResponsibilityBoundary,
)
from agro_v2.tool_contracts import ToolContractRegistry


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
        "decision_types": (
            FinanceDecisionType.CREDIT,
            FinanceDecisionType.INSURANCE,
        ),
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
        "request_id": "fpd-020-1",
        "idempotency_key": "idem-020-1",
        "schema_version": "finance-partner.v1",
        "decision_type": FinanceDecisionType.CREDIT,
        "partner_id": "apollo-credit",
        "country_code": "GH",
        "applicant_id": "farmer-020",
        "product_code": "seasonal-input-loan",
        "amount_minor": 420_000,
        "currency": "GHS",
        "risk_score": 0.31,
        "actor_id": "svc-finance",
        "policy_context": {"country_pack": "GH", "risk_class": "medium"},
        "evidence_reference_ids": ("wallet:ledger-ready",),
    }
    payload.update(overrides)
    return FinancePartnerDecisionRequest(**payload)


def test_adapter_approves_request_and_returns_responsibility_boundary():
    adapter = FinancePartnerDecisionAdapter()
    adapter.register_partner(build_partner())

    response = adapter.submit(build_request())

    assert response.outcome == FinanceDecisionOutcome.APPROVED
    assert response.requires_hitl is False
    assert response.responsibility_boundary.liability_owner == "licensed_partner"
    assert response.data_check_id == "DI-003"


def test_adapter_routes_high_risk_request_to_manual_review():
    adapter = FinancePartnerDecisionAdapter()
    adapter.register_partner(build_partner())

    response = adapter.submit(
        build_request(
            request_id="fpd-020-2",
            idempotency_key="idem-020-2",
            amount_minor=900_000,
            risk_score=0.5,
        )
    )

    assert response.outcome == FinanceDecisionOutcome.MANUAL_REVIEW
    assert response.requires_hitl is True
    assert "partner review required" in response.rationale_summary


def test_adapter_declines_request_when_partner_risk_threshold_is_exceeded():
    adapter = FinancePartnerDecisionAdapter()
    adapter.register_partner(build_partner())

    response = adapter.submit(
        build_request(
            request_id="fpd-020-3",
            idempotency_key="idem-020-3",
            risk_score=0.91,
        )
    )

    assert response.outcome == FinanceDecisionOutcome.DECLINED
    assert response.requires_hitl is False


def test_idempotency_replays_same_response_and_rejects_payload_drift():
    adapter = FinancePartnerDecisionAdapter()
    adapter.register_partner(build_partner())
    request = build_request()

    first = adapter.submit(request)
    replay = adapter.submit(request)

    assert replay == first

    with pytest.raises(
        FinancePartnerAdapterError,
        match="idempotency_key already bound",
    ):
        adapter.submit(
            build_request(
                amount_minor=430_000,
            )
        )


def test_adapter_rejects_currency_mismatch_and_exposes_contract_registration():
    registry = ToolContractRegistry()
    adapter = FinancePartnerDecisionAdapter(contract_registry=registry)
    adapter.register_partner(build_partner())

    with pytest.raises(
        FinancePartnerAdapterError,
        match="currency does not match country policy",
    ):
        adapter.submit(build_request(currency="NGN"))

    contract = registry.get("finance.partner_decision.submit", "finance-partner.v1")
    assert contract.tool_name == "finance.partner_decision.submit"
