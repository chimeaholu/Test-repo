import pytest

from agro_v2.advisory_retrieval import (
    AdvisoryRetrievalContract,
    AdvisoryRetrievalRequest,
    VettedKnowledgeSource,
)
from agro_v2.reviewer_workflow import (
    ReviewerAgentDecisionWorkflow,
    ReviewerDecision,
    ReviewerDecisionRequest,
    ReviewerWorkflowError,
)


def build_result():
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
        AdvisoryRetrievalRequest(
            query="maize pest scouting",
            country_code="GH",
            top_k=1,
        )
    )


def test_reviewer_approves_cited_high_confidence_response():
    workflow = ReviewerAgentDecisionWorkflow()
    outcome = workflow.evaluate(
        ReviewerDecisionRequest(
            advisory_result=build_result(),
            actor_role="advisor_agent",
            country_code="GH",
            confidence_score=0.82,
            risk_score=55,
        )
    )

    assert outcome.decision == ReviewerDecision.APPROVE
    assert outcome.reason_code == "allow"
    assert outcome.matched_source_ids == ("src-001",)


def test_reviewer_blocks_missing_citations():
    workflow = ReviewerAgentDecisionWorkflow()
    result = build_result()
    result = type(result)(
        query=result.query,
        country_code=result.country_code,
        citations=(),
        source_ids=(),
        total_candidates=result.total_candidates,
        filtered_candidates=result.filtered_candidates,
    )

    outcome = workflow.evaluate(
        ReviewerDecisionRequest(
            advisory_result=result,
            actor_role="advisor_agent",
            country_code="GH",
            confidence_score=0.9,
            risk_score=10,
        )
    )

    assert outcome.decision == ReviewerDecision.BLOCK
    assert outcome.reason_code == "citations_required"


def test_reviewer_escalates_when_confidence_is_below_threshold():
    workflow = ReviewerAgentDecisionWorkflow()
    outcome = workflow.evaluate(
        ReviewerDecisionRequest(
            advisory_result=build_result(),
            actor_role="advisor_agent",
            country_code="GH",
            confidence_score=0.5,
            risk_score=60,
        )
    )

    assert outcome.decision == ReviewerDecision.ESCALATE
    assert outcome.reason_code == "confidence_below_threshold"
    assert outcome.escalation_required is True


def test_reviewer_blocks_high_risk_low_confidence_without_hitl():
    workflow = ReviewerAgentDecisionWorkflow()
    outcome = workflow.evaluate(
        ReviewerDecisionRequest(
            advisory_result=build_result(),
            actor_role="advisor_agent",
            country_code="GH",
            confidence_score=0.6,
            risk_score=90,
            hitl_approved=False,
        )
    )

    assert outcome.decision == ReviewerDecision.BLOCK
    assert outcome.reason_code == "hitl_required_for_high_risk_low_confidence"
    assert outcome.escalation_required is True


def test_reviewer_blocks_disallowed_delivery_role():
    workflow = ReviewerAgentDecisionWorkflow()
    outcome = workflow.evaluate(
        ReviewerDecisionRequest(
            advisory_result=build_result(),
            actor_role="farmer",
            country_code="GH",
            confidence_score=0.9,
            risk_score=20,
        )
    )

    assert outcome.decision == ReviewerDecision.BLOCK
    assert outcome.reason_code == "policy_block"
    assert outcome.policy_reason_code == "role_not_allowed"


def test_reviewer_validates_request_bounds():
    workflow = ReviewerAgentDecisionWorkflow()

    with pytest.raises(ReviewerWorkflowError, match="confidence_score"):
        workflow.evaluate(
            ReviewerDecisionRequest(
                advisory_result=build_result(),
                actor_role="advisor_agent",
                country_code="GH",
                confidence_score=1.1,
                risk_score=20,
            )
        )
