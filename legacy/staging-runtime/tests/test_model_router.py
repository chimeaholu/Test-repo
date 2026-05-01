import pytest

from agro_v2.model_router import (
    BudgetGuardrailState,
    InferenceStage,
    ModelRouteDecision,
    ModelRouteError,
    ModelRouteRequest,
    ModelRouterBudgetPolicy,
    ModelRouterGuardrails,
    ModelTier,
)


def build_router() -> ModelRouterGuardrails:
    return ModelRouterGuardrails(
        budget_policy=ModelRouterBudgetPolicy(
            journey_cap_usd=3.0,
            daily_cap_usd=20.0,
            warning_ratio=0.8,
            daily_premium_quota=2,
        )
    )


def build_request(**overrides) -> ModelRouteRequest:
    payload = {
        "workflow_id": "wf-36",
        "stage": InferenceStage.REASONING,
        "country_code": "GH",
        "risk_score": 55,
        "confidence_score": 0.88,
        "projected_tokens": 1000,
        "journey_spend_usd": 0.4,
        "daily_spend_usd": 4.0,
        "premium_escalations_today": 0,
        "policy_ambiguity": False,
        "contradiction_unresolved": False,
        "verifier_reject_count": 0,
    }
    payload.update(overrides)
    return ModelRouteRequest(**payload)


def test_router_prefers_oss_reasoner_when_risk_is_normal_and_budget_is_healthy():
    router = build_router()

    outcome = router.route(build_request())

    assert outcome.decision == ModelRouteDecision.ROUTE
    assert outcome.selected_tier == ModelTier.TIER_1
    assert outcome.reason_code == "oss_default"
    assert outcome.budget_state == BudgetGuardrailState.HEALTHY
    assert outcome.route_log.selected_model == "oss-reasoner-core"


def test_router_escalates_to_premium_for_unresolved_high_risk_reasoning():
    router = build_router()

    outcome = router.route(
        build_request(
            risk_score=92,
            confidence_score=0.58,
            contradiction_unresolved=True,
            verifier_reject_count=2,
        )
    )

    assert outcome.decision == ModelRouteDecision.ROUTE
    assert outcome.selected_tier == ModelTier.TIER_3
    assert outcome.reason_code == "premium_escalation"
    assert outcome.route_log.premium_escalated is True
    assert outcome.route_log.budget_state == BudgetGuardrailState.HEALTHY


def test_router_downgrades_to_fast_oss_when_daily_budget_warning_triggers():
    router = build_router()

    outcome = router.route(
        build_request(
            daily_spend_usd=16.2,
            risk_score=40,
            confidence_score=0.9,
        )
    )

    assert outcome.decision == ModelRouteDecision.ROUTE
    assert outcome.selected_tier == ModelTier.TIER_0
    assert outcome.reason_code == "budget_downgrade"
    assert outcome.budget_state == BudgetGuardrailState.DAILY_WARNING


def test_router_challenges_when_high_risk_premium_path_is_blocked_by_budget():
    router = build_router()

    outcome = router.route(
        build_request(
            risk_score=95,
            confidence_score=0.5,
            policy_ambiguity=True,
            daily_spend_usd=16.5,
        )
    )

    assert outcome.decision == ModelRouteDecision.CHALLENGE
    assert outcome.selected_tier is None
    assert outcome.reason_code == "premium_disabled_by_daily_budget_warning"
    assert outcome.requires_human_review is True
    assert outcome.route_log.selected_model is None


def test_router_challenges_when_journey_cap_is_already_exhausted():
    router = build_router()

    outcome = router.route(
        build_request(
            stage=InferenceStage.INTENT,
            journey_spend_usd=3.0,
        )
    )

    assert outcome.decision == ModelRouteDecision.CHALLENGE
    assert outcome.reason_code == "journey_budget_exceeded"
    assert outcome.budget_state == BudgetGuardrailState.JOURNEY_CAP_EXCEEDED


def test_router_records_route_evidence_for_inference_ledger():
    router = build_router()

    outcome = router.route(
        build_request(
            stage=InferenceStage.VERIFIER,
            projected_tokens=2000,
            journey_spend_usd=0.5,
            daily_spend_usd=5.0,
        )
    )

    assert outcome.route_log.workflow_id == "wf-36"
    assert outcome.route_log.stage == InferenceStage.VERIFIER
    assert outcome.route_log.selected_tier == ModelTier.TIER_2
    assert outcome.route_log.projected_cost_usd == 0.1
    assert outcome.route_log.journey_spend_after_usd == 0.6
    assert outcome.route_log.daily_spend_after_usd == 5.1


def test_router_validates_score_ranges():
    router = build_router()

    with pytest.raises(ModelRouteError, match="confidence_score must be between 0 and 1"):
        router.route(build_request(confidence_score=1.2))
