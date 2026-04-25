import pytest

from agro_v2.advisory_retrieval import (
    AdvisoryRetrievalContract,
    AdvisoryRetrievalRequest,
    VettedKnowledgeSource,
)
from agro_v2.verifier_loop import (
    VerifierDecision,
    VerifierLoopError,
    VerifierLoopRequest,
    VerifierLoopRuntime,
    VerifierState,
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


def build_request(**overrides):
    payload = {
        "workflow_id": "wf-32",
        "current_state": VerifierState.PENDING,
        "advisory_result": build_result(),
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
    return VerifierLoopRequest(**payload)


def test_verifier_approves_high_confidence_response():
    runtime = VerifierLoopRuntime()

    outcome = runtime.evaluate(build_request())

    assert outcome.decision == VerifierDecision.APPROVE
    assert outcome.current_state == VerifierState.APPROVED
    assert outcome.reason_code == "allow"
    assert outcome.requires_revision is False
    assert outcome.decision_log.source_ids == ("src-001",)
    assert outcome.decision_log.verifier_model == "gpt-4.1"


def test_verifier_requests_revision_for_inconsistent_output():
    runtime = VerifierLoopRuntime()

    outcome = runtime.evaluate(
        build_request(
            inconsistency_flags=("citations_mismatch",),
            confidence_score=0.97,
        )
    )

    assert outcome.decision == VerifierDecision.REVISE
    assert outcome.current_state == VerifierState.REVISE_REQUESTED
    assert outcome.reason_code == "inconsistency_detected"
    assert outcome.requires_revision is True
    assert outcome.escalation_required is True


def test_verifier_requests_revision_when_reviewer_requires_escalation():
    runtime = VerifierLoopRuntime()

    outcome = runtime.evaluate(
        build_request(
            current_state=VerifierState.REVISE_REQUESTED,
            confidence_score=0.5,
            risk_score=60,
        )
    )

    assert outcome.previous_state == VerifierState.REVISE_REQUESTED
    assert outcome.decision == VerifierDecision.REVISE
    assert outcome.current_state == VerifierState.REVISE_REQUESTED
    assert outcome.reason_code == "confidence_below_threshold"


def test_verifier_blocks_when_reviewer_blocks():
    runtime = VerifierLoopRuntime()

    outcome = runtime.evaluate(
        build_request(
            actor_role="farmer",
            confidence_score=0.92,
        )
    )

    assert outcome.decision == VerifierDecision.BLOCK
    assert outcome.current_state == VerifierState.BLOCKED
    assert outcome.reason_code == "policy_block"


def test_verifier_rejects_terminal_state_rechecks():
    runtime = VerifierLoopRuntime()

    with pytest.raises(VerifierLoopError, match="terminal verifier states"):
        runtime.evaluate(build_request(current_state=VerifierState.APPROVED))


def test_verifier_requires_model_metadata_for_audit_log():
    runtime = VerifierLoopRuntime()

    with pytest.raises(VerifierLoopError, match="executor_model is required"):
        runtime.evaluate(build_request(executor_model=" "))
