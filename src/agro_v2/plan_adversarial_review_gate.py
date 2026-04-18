"""B-029 plan adversarial review gate."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class PlanAdversarialReviewError(ValueError):
    """Raised when plan review requests are malformed."""


class PlanReviewCheck(str, Enum):
    SCOPE_ALIGNMENT = "scope_alignment"
    DEPENDENCY_INTEGRITY = "dependency_integrity"
    TEST_COVERAGE = "test_coverage"
    TRACEABILITY_MATRIX = "traceability_matrix"
    BLOCKER_CLASSIFICATION = "blocker_classification"


@dataclass(frozen=True)
class BeadDesignReview:
    bead_id: str
    scope_summary: str
    dependency_ids: tuple[str, ...]
    unit_test_obligations: tuple[str, ...]
    e2e_journeys: tuple[str, ...]
    data_checks: tuple[str, ...]
    workflow_specs: tuple[str, ...]
    risk_controls: tuple[str, ...]
    test_expansion_items: tuple[str, ...]
    blocker_labels: tuple[str, ...] = ()
    non_blocker_labels: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not self.bead_id.strip():
            raise PlanAdversarialReviewError("bead_id is required")
        if not self.scope_summary.strip():
            raise PlanAdversarialReviewError("scope_summary is required")
        if self.bead_id in self.dependency_ids:
            raise PlanAdversarialReviewError("bead cannot depend on itself")


@dataclass(frozen=True)
class PlanReviewRequest:
    review_id: str
    expected_bead_ids: tuple[str, ...]
    known_bead_ids: tuple[str, ...]
    bead_reviews: tuple[BeadDesignReview, ...]

    def __post_init__(self) -> None:
        if not self.review_id.strip():
            raise PlanAdversarialReviewError("review_id is required")
        if not self.expected_bead_ids:
            raise PlanAdversarialReviewError("expected_bead_ids must not be empty")
        if not self.known_bead_ids:
            raise PlanAdversarialReviewError("known_bead_ids must not be empty")
        if not self.bead_reviews:
            raise PlanAdversarialReviewError("bead_reviews must not be empty")


@dataclass(frozen=True)
class PlanReviewChecklistItem:
    check: PlanReviewCheck
    passed: bool
    reason_code: str


@dataclass(frozen=True)
class PlanReviewOutcome:
    passed: bool
    checklist: tuple[PlanReviewChecklistItem, ...]
    blocking_reason_codes: tuple[str, ...]
    missing_bead_ids: tuple[str, ...]
    unknown_dependency_ids: tuple[str, ...]
    traceability_gaps: dict[str, tuple[str, ...]]


class PlanAdversarialReviewGate:
    """Detects scope, dependency, and test-traceability gaps in bead planning."""

    def review(self, request: PlanReviewRequest) -> PlanReviewOutcome:
        reviews_by_bead = {}
        for review in request.bead_reviews:
            if review.bead_id in reviews_by_bead:
                raise PlanAdversarialReviewError(f"duplicate bead review: {review.bead_id}")
            reviews_by_bead[review.bead_id] = review

        missing_bead_ids = tuple(
            bead_id for bead_id in request.expected_bead_ids if bead_id not in reviews_by_bead
        )
        unknown_dependency_ids = tuple(
            sorted(
                {
                    dependency
                    for review in request.bead_reviews
                    for dependency in review.dependency_ids
                    if dependency not in request.known_bead_ids
                }
            )
        )
        traceability_gaps = _traceability_gaps(request.bead_reviews)

        checklist = (
            self._scope_alignment_item(missing_bead_ids),
            self._dependency_integrity_item(unknown_dependency_ids),
            self._test_coverage_item(request.bead_reviews),
            self._traceability_item(traceability_gaps),
            self._blocker_classification_item(request.bead_reviews),
        )
        blocking_reason_codes = tuple(item.reason_code for item in checklist if not item.passed)

        return PlanReviewOutcome(
            passed=not blocking_reason_codes,
            checklist=checklist,
            blocking_reason_codes=blocking_reason_codes,
            missing_bead_ids=missing_bead_ids,
            unknown_dependency_ids=unknown_dependency_ids,
            traceability_gaps=traceability_gaps,
        )

    def _scope_alignment_item(
        self,
        missing_bead_ids: tuple[str, ...],
    ) -> PlanReviewChecklistItem:
        if missing_bead_ids:
            return PlanReviewChecklistItem(
                check=PlanReviewCheck.SCOPE_ALIGNMENT,
                passed=False,
                reason_code="missing_bead_review",
            )
        return PlanReviewChecklistItem(
            check=PlanReviewCheck.SCOPE_ALIGNMENT,
            passed=True,
            reason_code="scope_reviews_complete",
        )

    def _dependency_integrity_item(
        self,
        unknown_dependency_ids: tuple[str, ...],
    ) -> PlanReviewChecklistItem:
        if unknown_dependency_ids:
            return PlanReviewChecklistItem(
                check=PlanReviewCheck.DEPENDENCY_INTEGRITY,
                passed=False,
                reason_code="unknown_dependency_detected",
            )
        return PlanReviewChecklistItem(
            check=PlanReviewCheck.DEPENDENCY_INTEGRITY,
            passed=True,
            reason_code="dependencies_resolved",
        )

    def _test_coverage_item(
        self,
        bead_reviews: tuple[BeadDesignReview, ...],
    ) -> PlanReviewChecklistItem:
        incomplete = [
            review.bead_id
            for review in bead_reviews
            if not review.unit_test_obligations or not review.data_checks
        ]
        if incomplete:
            return PlanReviewChecklistItem(
                check=PlanReviewCheck.TEST_COVERAGE,
                passed=False,
                reason_code="test_obligations_incomplete",
            )
        return PlanReviewChecklistItem(
            check=PlanReviewCheck.TEST_COVERAGE,
            passed=True,
            reason_code="test_obligations_complete",
        )

    def _traceability_item(
        self,
        traceability_gaps: dict[str, tuple[str, ...]],
    ) -> PlanReviewChecklistItem:
        if traceability_gaps:
            return PlanReviewChecklistItem(
                check=PlanReviewCheck.TRACEABILITY_MATRIX,
                passed=False,
                reason_code="traceability_gap_detected",
            )
        return PlanReviewChecklistItem(
            check=PlanReviewCheck.TRACEABILITY_MATRIX,
            passed=True,
            reason_code="traceability_complete",
        )

    def _blocker_classification_item(
        self,
        bead_reviews: tuple[BeadDesignReview, ...],
    ) -> PlanReviewChecklistItem:
        missing_classification = [
            review.bead_id
            for review in bead_reviews
            if review.blocker_labels and not all(label.strip() for label in review.blocker_labels)
        ]
        if missing_classification:
            return PlanReviewChecklistItem(
                check=PlanReviewCheck.BLOCKER_CLASSIFICATION,
                passed=False,
                reason_code="blocker_labels_invalid",
            )
        return PlanReviewChecklistItem(
            check=PlanReviewCheck.BLOCKER_CLASSIFICATION,
            passed=True,
            reason_code="blockers_classified",
        )


def _traceability_gaps(
    bead_reviews: tuple[BeadDesignReview, ...],
) -> dict[str, tuple[str, ...]]:
    gaps: dict[str, tuple[str, ...]] = {}
    for review in bead_reviews:
        missing: list[str] = []
        if not review.workflow_specs:
            missing.append("workflow_specs")
        if not review.risk_controls:
            missing.append("risk_controls")
        if not review.test_expansion_items:
            missing.append("test_expansion_items")
        if missing:
            gaps[review.bead_id] = tuple(missing)
    return gaps
