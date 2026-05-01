"""B-037 agent evaluation harness for deterministic runtime benchmarking."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
import re


class EvalMetric(str, Enum):
    REASONING_QUALITY = "reasoning_quality"
    TOOL_FIDELITY = "tool_fidelity"
    HALLUCINATION_REJECTION = "hallucination_rejection"


class HallucinationPolicy(str, Enum):
    ALLOW_VERIFIED = "allow_verified"
    REJECT_UNSUPPORTED = "reject_unsupported"


class AgentEvalError(ValueError):
    """Raised when eval fixtures or traces are malformed."""


@dataclass(frozen=True)
class EvalFixture:
    fixture_id: str
    journey_id: str
    prompt: str
    required_reasoning_points: tuple[str, ...] = ()
    required_tool_calls: tuple[str, ...] = ()
    allowed_claims: tuple[str, ...] = ()
    unsupported_claims: tuple[str, ...] = ()
    required_citations: tuple[str, ...] = ()
    hallucination_policy: HallucinationPolicy = HallucinationPolicy.ALLOW_VERIFIED

    def __post_init__(self) -> None:
        if not self.fixture_id.strip():
            raise AgentEvalError("fixture_id is required")
        if not self.journey_id.strip():
            raise AgentEvalError("journey_id is required")
        if not self.prompt.strip():
            raise AgentEvalError("prompt is required")

        if not (
            self.required_reasoning_points
            or self.required_tool_calls
            or self.allowed_claims
            or self.unsupported_claims
            or self.required_citations
        ):
            raise AgentEvalError("fixture must define at least one evaluation assertion")

        _ensure_unique(self.required_reasoning_points, "required_reasoning_points")
        _ensure_unique(self.required_tool_calls, "required_tool_calls")
        _ensure_unique(self.allowed_claims, "allowed_claims")
        _ensure_unique(self.unsupported_claims, "unsupported_claims")
        _ensure_unique(self.required_citations, "required_citations")

        overlap = set(self.allowed_claims).intersection(self.unsupported_claims)
        if overlap:
            joined = ", ".join(sorted(overlap))
            raise AgentEvalError(f"claims cannot be both allowed and unsupported: {joined}")

        if (
            self.hallucination_policy == HallucinationPolicy.REJECT_UNSUPPORTED
            and not self.unsupported_claims
        ):
            raise AgentEvalError(
                "reject_unsupported fixtures must define unsupported_claims"
            )


@dataclass(frozen=True)
class AgentTrace:
    response_text: str
    reasoning_points: tuple[str, ...] = ()
    tool_calls: tuple[str, ...] = ()
    asserted_claims: tuple[str, ...] = ()
    rejected_claims: tuple[str, ...] = ()
    cited_source_ids: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not self.response_text.strip():
            raise AgentEvalError("response_text is required")
        _ensure_unique(self.reasoning_points, "reasoning_points")
        _ensure_unique(self.tool_calls, "tool_calls")
        _ensure_unique(self.asserted_claims, "asserted_claims")
        _ensure_unique(self.rejected_claims, "rejected_claims")
        _ensure_unique(self.cited_source_ids, "cited_source_ids")


@dataclass(frozen=True)
class MetricScore:
    metric: EvalMetric
    score: float
    passed: bool
    reason: str


@dataclass(frozen=True)
class FixtureEvaluation:
    fixture_id: str
    journey_id: str
    overall_score: float
    passed: bool
    metric_scores: tuple[MetricScore, ...]


@dataclass(frozen=True)
class HarnessEvaluationReport:
    total_fixtures: int
    passed_fixtures: int
    average_score: float
    fixture_results: tuple[FixtureEvaluation, ...]


class AgentEvaluationHarness:
    """Scores runtime traces against deterministic fixture expectations."""

    def validate_fixtures(self, fixtures: tuple[EvalFixture, ...]) -> None:
        if not fixtures:
            raise AgentEvalError("at least one fixture is required")
        fixture_ids = [fixture.fixture_id for fixture in fixtures]
        _ensure_unique(tuple(fixture_ids), "fixture_ids")

    def evaluate_fixture(
        self,
        fixture: EvalFixture,
        trace: AgentTrace,
    ) -> FixtureEvaluation:
        metric_scores = (
            self._score_reasoning_quality(fixture, trace),
            self._score_tool_fidelity(fixture, trace),
            self._score_hallucination_rejection(fixture, trace),
        )
        overall_score = round(
            sum(metric.score for metric in metric_scores) / len(metric_scores),
            4,
        )
        return FixtureEvaluation(
            fixture_id=fixture.fixture_id,
            journey_id=fixture.journey_id,
            overall_score=overall_score,
            passed=all(metric.passed for metric in metric_scores),
            metric_scores=metric_scores,
        )

    def evaluate_batch(
        self,
        fixtures: tuple[EvalFixture, ...],
        traces: dict[str, AgentTrace],
    ) -> HarnessEvaluationReport:
        self.validate_fixtures(fixtures)
        results = []
        for fixture in fixtures:
            if fixture.fixture_id not in traces:
                raise AgentEvalError(f"missing trace for fixture {fixture.fixture_id}")
            results.append(self.evaluate_fixture(fixture, traces[fixture.fixture_id]))

        average_score = round(
            sum(result.overall_score for result in results) / len(results),
            4,
        )
        return HarnessEvaluationReport(
            total_fixtures=len(results),
            passed_fixtures=sum(1 for result in results if result.passed),
            average_score=average_score,
            fixture_results=tuple(results),
        )

    def _score_reasoning_quality(
        self,
        fixture: EvalFixture,
        trace: AgentTrace,
    ) -> MetricScore:
        if not fixture.required_reasoning_points:
            return MetricScore(
                metric=EvalMetric.REASONING_QUALITY,
                score=1.0,
                passed=True,
                reason="no_reasoning_expectations_defined",
            )

        present = set(trace.reasoning_points)
        if not present:
            present = {
                point
                for point in fixture.required_reasoning_points
                if _contains_phrase(trace.response_text, point)
            }

        matched = tuple(
            point for point in fixture.required_reasoning_points if point in present
        )
        score = round(len(matched) / len(fixture.required_reasoning_points), 4)
        return MetricScore(
            metric=EvalMetric.REASONING_QUALITY,
            score=score,
            passed=score == 1.0,
            reason=_reason_summary(
                matched_count=len(matched),
                total=len(fixture.required_reasoning_points),
                success_reason="reasoning_points_covered",
                failure_reason="reasoning_points_missing",
            ),
        )

    def _score_tool_fidelity(
        self,
        fixture: EvalFixture,
        trace: AgentTrace,
    ) -> MetricScore:
        if not fixture.required_tool_calls:
            return MetricScore(
                metric=EvalMetric.TOOL_FIDELITY,
                score=1.0,
                passed=True,
                reason="no_tool_expectations_defined",
            )

        actual = set(trace.tool_calls)
        matched = tuple(
            tool for tool in fixture.required_tool_calls if tool in actual
        )
        score = round(len(matched) / len(fixture.required_tool_calls), 4)
        return MetricScore(
            metric=EvalMetric.TOOL_FIDELITY,
            score=score,
            passed=score == 1.0,
            reason=_reason_summary(
                matched_count=len(matched),
                total=len(fixture.required_tool_calls),
                success_reason="required_tools_used",
                failure_reason="required_tools_missing",
            ),
        )

    def _score_hallucination_rejection(
        self,
        fixture: EvalFixture,
        trace: AgentTrace,
    ) -> MetricScore:
        actual_claims = set(trace.asserted_claims)
        rejected_claims = set(trace.rejected_claims)
        cited_source_ids = set(trace.cited_source_ids)

        unsupported_asserted = actual_claims.intersection(fixture.unsupported_claims)
        missing_rejections = set(fixture.unsupported_claims).difference(rejected_claims)
        unexpected_claims = actual_claims.difference(fixture.allowed_claims).difference(
            fixture.unsupported_claims
        )
        missing_citations = set(fixture.required_citations).difference(cited_source_ids)

        penalty_components = [
            1 if unsupported_asserted else 0,
            1 if missing_rejections else 0,
            1 if unexpected_claims else 0,
            1 if missing_citations else 0,
        ]
        penalties = sum(penalty_components)
        score = round(max(0.0, 1 - penalties / 4), 4)

        if (
            fixture.hallucination_policy == HallucinationPolicy.ALLOW_VERIFIED
            and not fixture.required_citations
            and not fixture.unsupported_claims
            and not unexpected_claims
        ):
            score = 1.0

        passed = not (
            unsupported_asserted
            or missing_rejections
            or unexpected_claims
            or missing_citations
        )
        if passed:
            reason = "claims_grounded"
        elif unsupported_asserted:
            reason = "unsupported_claim_asserted"
        elif missing_rejections:
            reason = "unsupported_claim_not_rejected"
        elif unexpected_claims:
            reason = "unexpected_claim_asserted"
        else:
            reason = "required_citation_missing"

        return MetricScore(
            metric=EvalMetric.HALLUCINATION_REJECTION,
            score=score,
            passed=passed,
            reason=reason,
        )


def _contains_phrase(haystack: str, needle: str) -> bool:
    normalized_haystack = " ".join(_tokenize(haystack))
    normalized_needle = " ".join(_tokenize(needle))
    return bool(normalized_needle) and normalized_needle in normalized_haystack


def _tokenize(value: str) -> tuple[str, ...]:
    return tuple(token for token in re.findall(r"[a-z0-9]+", value.lower()) if token)


def _ensure_unique(values: tuple[str, ...], field_name: str) -> None:
    normalized = [value.strip() for value in values]
    if any(not value for value in normalized):
        raise AgentEvalError(f"{field_name} must not contain blank values")
    if len(set(normalized)) != len(normalized):
        raise AgentEvalError(f"{field_name} must not contain duplicates")


def _reason_summary(
    *,
    matched_count: int,
    total: int,
    success_reason: str,
    failure_reason: str,
) -> str:
    if matched_count == total:
        return success_reason
    return f"{failure_reason}:{matched_count}/{total}"
