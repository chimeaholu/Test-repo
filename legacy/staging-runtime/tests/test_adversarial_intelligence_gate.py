from datetime import datetime, timedelta, timezone

import pytest

from agro_v2.adversarial_intelligence_gate import (
    AdversarialCheck,
    AdversarialGateRequest,
    AdversarialIntelligenceGate,
    AdversarialIntelligenceGateError,
    REQUIRED_TRACEABILITY_IDS,
)
from agro_v2.advisory_retrieval import (
    AdvisoryRetrievalContract,
    AdvisoryRetrievalRequest,
    VettedKnowledgeSource,
)
from agro_v2.agent_eval import AgentEvaluationHarness, AgentTrace, EvalFixture
from agro_v2.memory_selector import MemorySelectionRequest, MemorySelector
from agro_v2.memory_service import MemoryRecord, MemoryType, TypedMemoryService
from agro_v2.model_router import (
    InferenceStage,
    ModelRouteRequest,
    ModelRouterBudgetPolicy,
    ModelRouterGuardrails,
)
from agro_v2.planning_loop import (
    IntentClass,
    PlannerTriggerInput,
    PlanningCheckpoint,
    PlanningLoopQualityEngine,
    RiskClass,
)
from agro_v2.verifier_loop import VerifierLoopRequest, VerifierLoopRuntime, VerifierState


def build_advisory_result():
    contract = AdvisoryRetrievalContract(
        sources=(
            VettedKnowledgeSource(
                source_id="src-001",
                title="Maize Pest Management Basics",
                publisher="MoFA Ghana",
                url="https://example.org/mofa/maize-pest",
                body="Maize farmers should scout weekly and use integrated pest management.",
                keywords=("maize", "pest", "management", "scout"),
                country_codes=("GH",),
                trust_tier=3,
                published_at="2026-03-01",
            ),
        ),
        clock=lambda: "2026-04-13T00:00:00+00:00",
    )
    return contract.retrieve(
        AdvisoryRetrievalRequest(query="maize pest scouting", country_code="GH", top_k=1)
    )


def build_execution_gate():
    engine = PlanningLoopQualityEngine()
    trigger = engine.evaluate_trigger(
        PlannerTriggerInput(intent_class=IntentClass.NON_TRIVIAL, risk_class=RiskClass.HIGH)
    )
    for checkpoint in (
        PlanningCheckpoint.INTENT_CAPTURED,
        PlanningCheckpoint.CONTEXT_COMPACTED,
        PlanningCheckpoint.PLAN_ARTIFACT_ATTACHED,
        PlanningCheckpoint.PHASE_REVIEW_PASSED,
    ):
        engine.record_checkpoint("wf-38", checkpoint)
    return engine.evaluate_execution_gate(
        workflow_id="wf-38",
        trigger_outcome=trigger,
        planner_artifact_id="plan-38",
    )


def build_verifier_outcome(**overrides):
    runtime = VerifierLoopRuntime()
    payload = {
        "workflow_id": "wf-38",
        "current_state": VerifierState.PENDING,
        "advisory_result": build_advisory_result(),
        "actor_role": "advisor_agent",
        "country_code": "GH",
        "confidence_score": 0.91,
        "risk_score": 55,
        "executor_model": "gpt-4.1-mini",
        "executor_tier": "standard",
        "verifier_model": "gpt-4.1",
        "verifier_tier": "high",
        "hitl_approved": False,
        "inconsistency_flags": (),
    }
    payload.update(overrides)
    return runtime.evaluate(VerifierLoopRequest(**payload))


def build_memory_selection(*, stale: bool = False):
    service = TypedMemoryService()
    selector = MemorySelector(memory_service=service)
    created_at = datetime(2026, 4, 1, 0, 0, tzinfo=timezone.utc) if stale else datetime(
        2026, 4, 13, 0, 0, tzinfo=timezone.utc
    )
    now = created_at + timedelta(days=8) if stale else created_at + timedelta(hours=2)
    service.upsert(
        MemoryRecord(
            memory_id="mem-1",
            memory_type=MemoryType.REFERENCE,
            namespace="advisory:maize",
            payload={"summary": "maize treatment bulletin"},
            created_at=created_at,
            confidence_score=0.95,
            tags=("maize", "treatment"),
        ),
        now=created_at,
    )
    return selector.select(MemorySelectionRequest(query="maize treatment", limit=1), now=now)


def build_route_outcome(**overrides):
    router = ModelRouterGuardrails(
        budget_policy=ModelRouterBudgetPolicy(
            journey_cap_usd=3.0,
            daily_cap_usd=20.0,
            warning_ratio=0.8,
            daily_premium_quota=2,
        )
    )
    payload = {
        "workflow_id": "wf-38",
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
    return router.route(ModelRouteRequest(**payload))


def build_eval_report(*, failing_fixture: bool = False):
    harness = AgentEvaluationHarness()
    fixtures = (
        EvalFixture(
            fixture_id="eval-001",
            journey_id="AIJ-001",
            prompt="Should the advisor recommend maize spraying today?",
            required_reasoning_points=("check current pest evidence",),
            required_tool_calls=("retrieve_advisory",),
            allowed_claims=("maize_pest_guidance",),
            unsupported_claims=("rainfall_forecast_14_day",),
            required_citations=("src-001",),
        ),
        EvalFixture(
            fixture_id="eval-002",
            journey_id="AIJ-005",
            prompt="Should the route escalate to premium?",
            required_reasoning_points=("apply budget policy",),
            required_tool_calls=("route_model",),
            allowed_claims=("budget_guardrail_applied",),
            unsupported_claims=("fabricated_market_price",),
        ),
    )
    traces = {
        "eval-001": AgentTrace(
            response_text="check current pest evidence",
            reasoning_points=("check current pest evidence",),
            tool_calls=("retrieve_advisory",),
            asserted_claims=("maize_pest_guidance",),
            rejected_claims=("rainfall_forecast_14_day",),
            cited_source_ids=("src-001",),
        ),
        "eval-002": AgentTrace(
            response_text="apply budget policy",
            reasoning_points=("apply budget policy",),
            tool_calls=("route_model",),
            asserted_claims=(
                "fabricated_market_price",
                "budget_guardrail_applied",
            )
            if failing_fixture
            else ("budget_guardrail_applied",),
            rejected_claims=()
            if failing_fixture
            else ("fabricated_market_price",),
            cited_source_ids=(),
        ),
    }
    return harness.evaluate_batch(fixtures, traces)


def build_traceability_map():
    return {
        requirement_id: (f"tests/{requirement_id.lower()}.py",)
        for requirement_id in REQUIRED_TRACEABILITY_IDS
    }


def test_gate_passes_with_complete_rollout_evidence():
    gate = AdversarialIntelligenceGate()

    outcome = gate.review(
        AdversarialGateRequest(
            workflow_id="wf-38",
            execution_gate=build_execution_gate(),
            verifier_outcome=build_verifier_outcome(),
            memory_selection=build_memory_selection(stale=False),
            model_route=build_route_outcome(),
            eval_report=build_eval_report(),
            requirement_traceability=build_traceability_map(),
        )
    )

    assert outcome.passed is True
    assert outcome.blocking_reason_codes == ()
    assert outcome.missing_traceability_ids == ()
    assert [item.check for item in outcome.checklist] == [
        AdversarialCheck.PLANNER_GATE,
        AdversarialCheck.VERIFIER_AUDIT,
        AdversarialCheck.MEMORY_REVALIDATION,
        AdversarialCheck.ROUTER_ESCALATION,
        AdversarialCheck.EVAL_BENCHMARK,
        AdversarialCheck.TRACEABILITY,
    ]


def test_gate_fails_when_stale_memory_was_not_escalated():
    gate = AdversarialIntelligenceGate()

    outcome = gate.review(
        AdversarialGateRequest(
            workflow_id="wf-38",
            execution_gate=build_execution_gate(),
            verifier_outcome=build_verifier_outcome(),
            memory_selection=build_memory_selection(stale=True),
            model_route=build_route_outcome(),
            eval_report=build_eval_report(),
            requirement_traceability=build_traceability_map(),
        )
    )

    assert outcome.passed is False
    assert "stale_memory_not_escalated" in outcome.blocking_reason_codes


def test_gate_fails_when_router_requires_human_review_but_verifier_did_not_escalate():
    gate = AdversarialIntelligenceGate()

    outcome = gate.review(
        AdversarialGateRequest(
            workflow_id="wf-38",
            execution_gate=build_execution_gate(),
            verifier_outcome=build_verifier_outcome(),
            memory_selection=build_memory_selection(stale=False),
            model_route=build_route_outcome(
                risk_score=95,
                confidence_score=0.5,
                policy_ambiguity=True,
                daily_spend_usd=16.5,
            ),
            eval_report=build_eval_report(),
            requirement_traceability=build_traceability_map(),
        )
    )

    assert outcome.passed is False
    assert "router_challenge_not_escalated" in outcome.blocking_reason_codes


def test_gate_fails_when_eval_report_has_failed_fixture():
    gate = AdversarialIntelligenceGate()

    outcome = gate.review(
        AdversarialGateRequest(
            workflow_id="wf-38",
            execution_gate=build_execution_gate(),
            verifier_outcome=build_verifier_outcome(),
            memory_selection=build_memory_selection(stale=False),
            model_route=build_route_outcome(),
            eval_report=build_eval_report(failing_fixture=True),
            requirement_traceability=build_traceability_map(),
        )
    )

    assert outcome.passed is False
    assert "eval_fixture_failure" in outcome.blocking_reason_codes


def test_gate_fails_when_traceability_is_incomplete():
    gate = AdversarialIntelligenceGate()
    traceability = build_traceability_map()
    traceability.pop("IDI-005")

    outcome = gate.review(
        AdversarialGateRequest(
            workflow_id="wf-38",
            execution_gate=build_execution_gate(),
            verifier_outcome=build_verifier_outcome(),
            memory_selection=build_memory_selection(stale=False),
            model_route=build_route_outcome(),
            eval_report=build_eval_report(),
            requirement_traceability=traceability,
        )
    )

    assert outcome.passed is False
    assert outcome.missing_traceability_ids == ("IDI-005",)
    assert "traceability_missing" in outcome.blocking_reason_codes


def test_gate_request_validates_thresholds():
    with pytest.raises(
        AdversarialIntelligenceGateError,
        match="minimum_eval_average must be between 0 and 1",
    ):
        AdversarialGateRequest(
            workflow_id="wf-38",
            execution_gate=build_execution_gate(),
            verifier_outcome=build_verifier_outcome(),
            memory_selection=build_memory_selection(stale=False),
            model_route=build_route_outcome(),
            eval_report=build_eval_report(),
            requirement_traceability=build_traceability_map(),
            minimum_eval_average=1.2,
        )
