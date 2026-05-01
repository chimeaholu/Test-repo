"""F-027 frontend bead-to-plan traceability review gate."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class FrontendPlanTraceabilityError(ValueError):
    """Raised when frontend plan traceability evidence is malformed."""


class FrontendTraceabilityCheck(str, Enum):
    BEAD_COVERAGE = "bead_coverage"
    DEPENDENCY_CHAIN = "dependency_chain"
    TEST_EVIDENCE = "test_evidence"
    REVIEW_EVIDENCE = "review_evidence"
    PLAN_ALIGNMENT = "plan_alignment"


@dataclass(frozen=True)
class FrontendBeadTrace:
    bead_id: str
    title: str
    dependency_ids: tuple[str, ...]
    module_path: str
    test_files: tuple[str, ...]
    review_artifacts: tuple[str, ...]
    journey_ids: tuple[str, ...]
    scope_summary: str

    def __post_init__(self) -> None:
        if not self.bead_id.strip():
            raise FrontendPlanTraceabilityError("bead_id is required")
        if not self.title.strip():
            raise FrontendPlanTraceabilityError("title is required")
        if not self.module_path.strip():
            raise FrontendPlanTraceabilityError("module_path is required")
        if not self.scope_summary.strip():
            raise FrontendPlanTraceabilityError("scope_summary is required")
        if self.bead_id in self.dependency_ids:
            raise FrontendPlanTraceabilityError("bead cannot depend on itself")


@dataclass(frozen=True)
class FrontendPlanTraceabilityRequest:
    review_id: str
    expected_bead_ids: tuple[str, ...]
    known_dependency_ids: tuple[str, ...]
    bead_traces: tuple[FrontendBeadTrace, ...]

    def __post_init__(self) -> None:
        if not self.review_id.strip():
            raise FrontendPlanTraceabilityError("review_id is required")
        if not self.expected_bead_ids:
            raise FrontendPlanTraceabilityError("expected_bead_ids must not be empty")


@dataclass(frozen=True)
class FrontendTraceabilityChecklistItem:
    check: FrontendTraceabilityCheck
    passed: bool
    reason_code: str


@dataclass(frozen=True)
class FrontendPlanTraceabilityOutcome:
    passed: bool
    checklist: tuple[FrontendTraceabilityChecklistItem, ...]
    blocking_reason_codes: tuple[str, ...]
    missing_bead_ids: tuple[str, ...]
    unknown_dependency_ids: tuple[str, ...]
    missing_test_bead_ids: tuple[str, ...]
    missing_review_bead_ids: tuple[str, ...]
    plan_alignment_gaps: dict[str, tuple[str, ...]]


class FrontendPlanTraceabilityReview:
    """Verifies each frontend bead maps back to code, tests, reviews, and journeys."""

    def review(
        self,
        request: FrontendPlanTraceabilityRequest,
    ) -> FrontendPlanTraceabilityOutcome:
        traces_by_bead = {trace.bead_id: trace for trace in request.bead_traces}
        missing_bead_ids = tuple(
            bead_id for bead_id in request.expected_bead_ids if bead_id not in traces_by_bead
        )
        unknown_dependency_ids = tuple(
            sorted(
                {
                    dependency_id
                    for trace in request.bead_traces
                    for dependency_id in trace.dependency_ids
                    if dependency_id not in request.known_dependency_ids
                }
            )
        )
        missing_test_bead_ids = tuple(
            trace.bead_id for trace in request.bead_traces if not trace.test_files
        )
        missing_review_bead_ids = tuple(
            trace.bead_id for trace in request.bead_traces if not trace.review_artifacts
        )
        plan_alignment_gaps = _plan_alignment_gaps(request.bead_traces)

        checklist = (
            self._coverage_item(missing_bead_ids),
            self._dependency_item(unknown_dependency_ids),
            self._test_item(missing_test_bead_ids),
            self._review_item(missing_review_bead_ids),
            self._alignment_item(plan_alignment_gaps),
        )
        blocking_reason_codes = tuple(item.reason_code for item in checklist if not item.passed)
        return FrontendPlanTraceabilityOutcome(
            passed=not blocking_reason_codes,
            checklist=checklist,
            blocking_reason_codes=blocking_reason_codes,
            missing_bead_ids=missing_bead_ids,
            unknown_dependency_ids=unknown_dependency_ids,
            missing_test_bead_ids=missing_test_bead_ids,
            missing_review_bead_ids=missing_review_bead_ids,
            plan_alignment_gaps=plan_alignment_gaps,
        )

    def _coverage_item(
        self,
        missing_bead_ids: tuple[str, ...],
    ) -> FrontendTraceabilityChecklistItem:
        if missing_bead_ids:
            return FrontendTraceabilityChecklistItem(
                check=FrontendTraceabilityCheck.BEAD_COVERAGE,
                passed=False,
                reason_code="bead_trace_missing",
            )
        return FrontendTraceabilityChecklistItem(
            check=FrontendTraceabilityCheck.BEAD_COVERAGE,
            passed=True,
            reason_code="bead_trace_complete",
        )

    def _dependency_item(
        self,
        unknown_dependency_ids: tuple[str, ...],
    ) -> FrontendTraceabilityChecklistItem:
        if unknown_dependency_ids:
            return FrontendTraceabilityChecklistItem(
                check=FrontendTraceabilityCheck.DEPENDENCY_CHAIN,
                passed=False,
                reason_code="dependency_unresolved",
            )
        return FrontendTraceabilityChecklistItem(
            check=FrontendTraceabilityCheck.DEPENDENCY_CHAIN,
            passed=True,
            reason_code="dependency_chain_complete",
        )

    def _test_item(
        self,
        missing_test_bead_ids: tuple[str, ...],
    ) -> FrontendTraceabilityChecklistItem:
        if missing_test_bead_ids:
            return FrontendTraceabilityChecklistItem(
                check=FrontendTraceabilityCheck.TEST_EVIDENCE,
                passed=False,
                reason_code="test_evidence_missing",
            )
        return FrontendTraceabilityChecklistItem(
            check=FrontendTraceabilityCheck.TEST_EVIDENCE,
            passed=True,
            reason_code="test_evidence_complete",
        )

    def _review_item(
        self,
        missing_review_bead_ids: tuple[str, ...],
    ) -> FrontendTraceabilityChecklistItem:
        if missing_review_bead_ids:
            return FrontendTraceabilityChecklistItem(
                check=FrontendTraceabilityCheck.REVIEW_EVIDENCE,
                passed=False,
                reason_code="review_evidence_missing",
            )
        return FrontendTraceabilityChecklistItem(
            check=FrontendTraceabilityCheck.REVIEW_EVIDENCE,
            passed=True,
            reason_code="review_evidence_complete",
        )

    def _alignment_item(
        self,
        plan_alignment_gaps: dict[str, tuple[str, ...]],
    ) -> FrontendTraceabilityChecklistItem:
        if plan_alignment_gaps:
            return FrontendTraceabilityChecklistItem(
                check=FrontendTraceabilityCheck.PLAN_ALIGNMENT,
                passed=False,
                reason_code="plan_alignment_gap",
            )
        return FrontendTraceabilityChecklistItem(
            check=FrontendTraceabilityCheck.PLAN_ALIGNMENT,
            passed=True,
            reason_code="plan_alignment_complete",
        )


def _plan_alignment_gaps(
    bead_traces: tuple[FrontendBeadTrace, ...],
) -> dict[str, tuple[str, ...]]:
    gaps: dict[str, tuple[str, ...]] = {}
    for trace in bead_traces:
        missing: list[str] = []
        if not trace.journey_ids:
            missing.append("journey_ids")
        if not trace.module_path.endswith(".py"):
            missing.append("module_path")
        if missing:
            gaps[trace.bead_id] = tuple(missing)
    return gaps
