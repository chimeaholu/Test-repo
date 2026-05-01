import pytest

from agro_v2.agent_eval import (
    AgentEvaluationHarness,
    AgentEvalError,
    AgentTrace,
    EvalFixture,
    EvalMetric,
    HallucinationPolicy,
)


def build_fixture(**overrides) -> EvalFixture:
    payload = {
        "fixture_id": "eval-001",
        "journey_id": "AIJ-001",
        "prompt": "Should the advisor recommend maize spraying today?",
        "required_reasoning_points": (
            "check current pest evidence",
            "cite the agronomy bulletin",
        ),
        "required_tool_calls": ("retrieve_advisory", "run_verifier"),
        "allowed_claims": ("maize_pest_guidance",),
        "unsupported_claims": ("rainfall_forecast_14_day",),
        "required_citations": ("src-001",),
        "hallucination_policy": HallucinationPolicy.REJECT_UNSUPPORTED,
    }
    payload.update(overrides)
    return EvalFixture(**payload)


def build_trace(**overrides) -> AgentTrace:
    payload = {
        "response_text": (
            "I checked current pest evidence and cite the agronomy bulletin before "
            "recommending action."
        ),
        "reasoning_points": (
            "check current pest evidence",
            "cite the agronomy bulletin",
        ),
        "tool_calls": ("retrieve_advisory", "run_verifier"),
        "asserted_claims": ("maize_pest_guidance",),
        "rejected_claims": ("rainfall_forecast_14_day",),
        "cited_source_ids": ("src-001",),
    }
    payload.update(overrides)
    return AgentTrace(**payload)


def test_fixture_requires_at_least_one_assertion():
    with pytest.raises(AgentEvalError, match="at least one evaluation assertion"):
        EvalFixture(
            fixture_id="eval-empty",
            journey_id="AIJ-001",
            prompt="hello",
        )


def test_fixture_rejects_overlapping_allowed_and_unsupported_claims():
    with pytest.raises(AgentEvalError, match="both allowed and unsupported"):
        build_fixture(
            allowed_claims=("claim-1",),
            unsupported_claims=("claim-1",),
        )


def test_trace_rejects_duplicate_tool_calls():
    with pytest.raises(AgentEvalError, match="tool_calls must not contain duplicates"):
        build_trace(tool_calls=("retrieve_advisory", "retrieve_advisory"))


def test_harness_validates_unique_fixture_ids():
    harness = AgentEvaluationHarness()
    fixtures = (
        build_fixture(),
        build_fixture(fixture_id="eval-001", journey_id="AIJ-002"),
    )

    with pytest.raises(AgentEvalError, match="fixture_ids must not contain duplicates"):
        harness.validate_fixtures(fixtures)


def test_harness_scores_full_pass_for_grounded_trace():
    harness = AgentEvaluationHarness()

    result = harness.evaluate_fixture(build_fixture(), build_trace())

    assert result.passed is True
    assert result.overall_score == 1.0
    assert [metric.metric for metric in result.metric_scores] == [
        EvalMetric.REASONING_QUALITY,
        EvalMetric.TOOL_FIDELITY,
        EvalMetric.HALLUCINATION_REJECTION,
    ]


def test_harness_flags_missing_tool_and_hallucinated_claim():
    harness = AgentEvaluationHarness()

    result = harness.evaluate_fixture(
        build_fixture(),
        build_trace(
            tool_calls=("retrieve_advisory",),
            asserted_claims=("maize_pest_guidance", "rainfall_forecast_14_day"),
            rejected_claims=(),
        ),
    )

    metric_scores = {metric.metric: metric for metric in result.metric_scores}

    assert result.passed is False
    assert metric_scores[EvalMetric.TOOL_FIDELITY].score == 0.5
    assert metric_scores[EvalMetric.TOOL_FIDELITY].reason == "required_tools_missing:1/2"
    assert (
        metric_scores[EvalMetric.HALLUCINATION_REJECTION].reason
        == "unsupported_claim_asserted"
    )


def test_harness_can_fall_back_to_response_text_for_reasoning_match():
    harness = AgentEvaluationHarness()

    result = harness.evaluate_fixture(
        build_fixture(),
        build_trace(
            reasoning_points=(),
            response_text=(
                "We need to check current pest evidence and cite the agronomy "
                "bulletin before any recommendation."
            ),
        ),
    )

    assert result.metric_scores[0].score == 1.0
    assert result.metric_scores[0].reason == "reasoning_points_covered"


def test_batch_report_requires_trace_for_every_fixture():
    harness = AgentEvaluationHarness()
    fixtures = (build_fixture(),)

    with pytest.raises(AgentEvalError, match="missing trace for fixture eval-001"):
        harness.evaluate_batch(fixtures, traces={})


def test_batch_report_summarizes_scores():
    harness = AgentEvaluationHarness()
    fixtures = (
        build_fixture(),
        build_fixture(
            fixture_id="eval-002",
            journey_id="AIJ-006",
            required_tool_calls=("retrieve_advisory",),
            required_citations=(),
            unsupported_claims=("fabricated_market_price",),
        ),
    )

    report = harness.evaluate_batch(
        fixtures,
        traces={
            "eval-001": build_trace(),
            "eval-002": build_trace(
                tool_calls=("retrieve_advisory",),
                asserted_claims=("maize_pest_guidance",),
                rejected_claims=("fabricated_market_price",),
                cited_source_ids=(),
            ),
        },
    )

    assert report.total_fixtures == 2
    assert report.passed_fixtures == 2
    assert report.average_score == 1.0
