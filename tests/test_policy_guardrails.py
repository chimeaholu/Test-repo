import pytest

from agro_v2.policy_guardrails import (
    AgentPolicyGuardrailEngine,
    DEFAULT_POLICY_DECISION_MATRIX,
    PolicyDecision,
    PolicyDecisionMatrix,
    PolicyEvaluationInput,
    RiskLevel,
    evaluate_allow_deny,
)


def test_policy_decision_matrix_scaffold_defaults():
    matrix = PolicyDecisionMatrix()

    assert matrix.matrix == DEFAULT_POLICY_DECISION_MATRIX
    assert matrix.decision_for(RiskLevel.LOW, risk_score=0) == PolicyDecision.ALLOW
    assert matrix.decision_for(RiskLevel.HIGH, risk_score=10) == PolicyDecision.CHALLENGE
    assert matrix.decision_for(RiskLevel.LOW, risk_score=95) == PolicyDecision.CHALLENGE


def test_evaluator_allows_low_risk_allowlisted_tool():
    engine = AgentPolicyGuardrailEngine()
    outcome = engine.evaluate(
        PolicyEvaluationInput(
            tool_name="market.read_prices",
            actor_role="farmer",
            country_code="gh",
            risk_score=10,
        )
    )

    assert outcome.decision == PolicyDecision.ALLOW
    assert outcome.reason_code == "allow"
    assert outcome.hitl_required is False


def test_evaluator_denies_non_allowlisted_tool():
    engine = AgentPolicyGuardrailEngine()
    outcome = engine.evaluate(
        PolicyEvaluationInput(
            tool_name="shell.exec",
            actor_role="admin",
            country_code="GH",
            risk_score=0,
        )
    )

    assert outcome.decision == PolicyDecision.DENY
    assert outcome.reason_code == "tool_not_allowlisted"
    assert outcome.matched_rule is None


def test_evaluator_denies_role_not_in_tool_policy():
    engine = AgentPolicyGuardrailEngine()
    outcome = engine.evaluate(
        PolicyEvaluationInput(
            tool_name="wallet.release_escrow",
            actor_role="farmer",
            country_code="GH",
            risk_score=20,
        )
    )

    assert outcome.decision == PolicyDecision.DENY
    assert outcome.reason_code == "role_not_allowed"
    assert outcome.matched_rule == "wallet.release_escrow"


def test_evaluator_denies_country_not_allowed():
    engine = AgentPolicyGuardrailEngine()
    outcome = engine.evaluate(
        PolicyEvaluationInput(
            tool_name="market.read_prices",
            actor_role="farmer",
            country_code="KE",
            risk_score=5,
        )
    )

    assert outcome.decision == PolicyDecision.DENY
    assert outcome.reason_code == "country_not_allowed"


def test_evaluator_challenges_high_risk_without_hitl_then_allows_with_hitl():
    engine = AgentPolicyGuardrailEngine()
    challenged = engine.evaluate(
        PolicyEvaluationInput(
            tool_name="wallet.release_escrow",
            actor_role="finance_ops",
            country_code="GH",
            risk_score=25,
            hitl_approved=False,
        )
    )
    approved = engine.evaluate(
        PolicyEvaluationInput(
            tool_name="wallet.release_escrow",
            actor_role="finance_ops",
            country_code="GH",
            risk_score=25,
            hitl_approved=True,
        )
    )

    assert challenged.decision == PolicyDecision.CHALLENGE
    assert challenged.reason_code == "hitl_required"
    assert challenged.hitl_required is True
    assert approved.decision == PolicyDecision.ALLOW
    assert approved.hitl_required is True


def test_evaluate_allow_deny_strict_mode_collapses_challenge_to_deny():
    engine = AgentPolicyGuardrailEngine()
    strict_outcome = evaluate_allow_deny(
        engine,
        PolicyEvaluationInput(
            tool_name="wallet.release_escrow",
            actor_role="finance_ops",
            country_code="GH",
            risk_score=10,
            hitl_approved=False,
        ),
        strict=True,
    )

    assert strict_outcome.decision == PolicyDecision.DENY
    assert strict_outcome.reason_code == "hitl_required"


def test_evaluator_rejects_invalid_risk_score():
    engine = AgentPolicyGuardrailEngine()

    with pytest.raises(ValueError, match="risk_score"):
        engine.evaluate(
            PolicyEvaluationInput(
                tool_name="market.read_prices",
                actor_role="farmer",
                country_code="GH",
                risk_score=101,
            )
        )
