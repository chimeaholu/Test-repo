from agro_v2.finance_hitl_console import FinanceInsuranceHitlApprovalConsole
from agro_v2.finance_partner_adapter import (
    FinanceDecisionType,
    FinancePartnerConfig,
    FinancePartnerDecisionAdapter,
    FinancePartnerDecisionRequest,
    ResponsibilityBoundary,
)
from agro_v2.frontend_app_shell import AppRole, UnifiedAppShell
from agro_v2.frontend_finance_queue import FrontendFinanceQueue
from agro_v2.insurance_trigger_registry import (
    InsuranceParametricTriggerRegistry,
    ParametricTriggerDefinition,
    ParametricTriggerThreshold,
    TriggerOperator,
)
from agro_v2.climate_risk_ingestion import ClimateRiskSignal, ClimateSourceType


def build_decision(*, risk_score: float = 0.52, amount_minor: int = 750_000):
    adapter = FinancePartnerDecisionAdapter()
    adapter.register_partner(
        FinancePartnerConfig(
            partner_id="partner-1",
            decision_types=(FinanceDecisionType.INSURANCE,),
            supported_countries=("GH",),
            max_amount_minor=2_000_000,
            manual_review_amount_minor=500_000,
            manual_review_risk_score=0.45,
            decline_risk_score=0.8,
            responsibility_boundary=ResponsibilityBoundary(
                platform_responsibilities=("collect evidence", "show rationale"),
                partner_responsibilities=("underwrite", "disburse"),
                liability_owner="partner",
                dispute_path="partner-helpdesk",
            ),
        )
    )
    return adapter.submit(
        FinancePartnerDecisionRequest(
            request_id="req-14",
            idempotency_key="req-14",
            schema_version="finance-partner.v1",
            decision_type=FinanceDecisionType.INSURANCE,
            partner_id="partner-1",
            country_code="GH",
            applicant_id="farmer-14",
            product_code="crop-cover",
            amount_minor=amount_minor,
            currency="GHS",
            risk_score=risk_score,
            actor_id="advisor-14",
            policy_context={"season": "major"},
            evidence_reference_ids=("ev-14",),
        )
    )


def build_payout(decision):
    registry = InsuranceParametricTriggerRegistry()
    registry.register(
        ParametricTriggerDefinition(
            trigger_id="trigger-14",
            partner_id="partner-1",
            country_code="GH",
            product_code="crop-cover",
            coverage_currency="GHS",
            thresholds=(
                ParametricTriggerThreshold(
                    metric_name="rainfall_24h_mm",
                    operator=TriggerOperator.GTE,
                    threshold_value=90.0,
                    payout_factor=0.5,
                    source_reference="chirps",
                ),
            ),
            evidence_reference_ids=("ev-14", "ev-15"),
        )
    )
    signal = ClimateRiskSignal(
        signal_id="signal-14",
        farm_id="farm-14",
        country_code="GH",
        region="west_africa",
        source_type=ClimateSourceType.WEATHER,
        normalized_metric="rainfall_24h_mm",
        normalized_value=93.0,
        normalized_unit="mm",
        risk_hint="heavy_rain",
        observed_at="2026-04-13T12:00:00Z",
        provenance_key="chirps:14",
        reconciliation_key="farm-14-rain",
        confidence=0.95,
    )
    [payout] = registry.evaluate(
        signal=signal,
        partner_decision=decision,
        coverage_amount_minor=800_000,
    )
    return payout


def test_finance_queue_builds_review_surface_and_detail():
    decision = build_decision()
    payout = build_payout(build_decision(risk_score=0.2, amount_minor=250_000))
    console = FinanceInsuranceHitlApprovalConsole()
    item = console.queue_partner_decision(
        item_id="item-14",
        decision=decision,
        country_code="GH",
        amount_minor=750_000,
        currency="GHS",
        submitted_at="2026-04-13T12:01:00Z",
        submitted_by="advisor-14",
        risk_score=78,
        evidence_reference_ids=("ev-14", "ev-15"),
    )
    console.queue_payout_event(
        item_id="item-15",
        payout_event=payout,
        submitted_at="2026-04-13T12:02:00Z",
        submitted_by="system",
        risk_score=64,
    )
    shell = UnifiedAppShell().build_snapshot(
        role=AppRole.FINANCE,
        width_px=1440,
        pending_count=2,
        notifications_badge_count=1,
    )
    frontend = FrontendFinanceQueue()

    queue = frontend.build_queue(
        shell_snapshot=shell,
        console_snapshot=console.snapshot(),
    )
    detail = frontend.build_detail(item=item, decision=decision)
    audit = frontend.audit(queue_surface=queue, detail_surface=detail)

    assert queue.visible_items[0].item_id == "item-14"
    assert detail.responsibility_rows[0] == ("Liability owner", "partner")
    assert audit.passed is True


def test_finance_queue_can_project_payout_detail():
    decision = build_decision(risk_score=0.2, amount_minor=250_000)
    payout = build_payout(decision)
    console = FinanceInsuranceHitlApprovalConsole()
    item = console.queue_payout_event(
        item_id="item-16",
        payout_event=payout,
        submitted_at="2026-04-13T12:03:00Z",
        submitted_by="system",
        risk_score=41,
    )
    detail = FrontendFinanceQueue().build_detail(item=item, payout_event=payout)

    assert detail.headline == "Payout review for crop-cover"
    assert detail.responsibility_rows[0] == ("Trigger id", "trigger-14")
