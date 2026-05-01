"""F-026 frontend architecture signoff gate for routes, adapters, budgets, and automation."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class FrontendArchitectureReviewError(ValueError):
    """Raised when frontend architecture review evidence is malformed."""


class FrontendArchitectureCheck(str, Enum):
    ROUTE_BOUNDARIES = "route_boundaries"
    ADAPTER_COVERAGE = "adapter_coverage"
    MUTATION_WIRING = "mutation_wiring"
    PERFORMANCE_BUDGETS = "performance_budgets"
    AUTOMATION_COVERAGE = "automation_coverage"


@dataclass(frozen=True)
class FrontendRouteBoundary:
    route_name: str
    role: str
    loader_name: str
    adapter_name: str
    mutation_actions: tuple[str, ...]
    source_bead_ids: tuple[str, ...]

    def __post_init__(self) -> None:
        if not self.route_name.startswith("/app/"):
            raise FrontendArchitectureReviewError("route_name must live under /app")
        if not self.role.strip():
            raise FrontendArchitectureReviewError("role is required")
        if not self.loader_name.strip():
            raise FrontendArchitectureReviewError("loader_name is required")
        if not self.adapter_name.strip():
            raise FrontendArchitectureReviewError("adapter_name is required")
        if not self.source_bead_ids:
            raise FrontendArchitectureReviewError("source_bead_ids must not be empty")


@dataclass(frozen=True)
class FrontendAdapterReview:
    adapter_name: str
    schema_version: str
    supported_routes: tuple[str, ...]
    typed_validation: bool

    def __post_init__(self) -> None:
        if not self.adapter_name.strip():
            raise FrontendArchitectureReviewError("adapter_name is required")
        if not self.schema_version.strip():
            raise FrontendArchitectureReviewError("schema_version is required")
        if not self.supported_routes:
            raise FrontendArchitectureReviewError("supported_routes must not be empty")


@dataclass(frozen=True)
class FrontendBudgetReview:
    route_name: str
    passed: bool
    artifact_id: str


@dataclass(frozen=True)
class FrontendAutomationReview:
    journey_id: str
    route_name: str
    passed: bool
    viewport_matrix: tuple[str, ...]


@dataclass(frozen=True)
class FrontendArchitectureReviewRequest:
    review_id: str
    expected_routes: tuple[str, ...]
    required_journey_ids: tuple[str, ...]
    required_mutation_actions: tuple[str, ...]
    route_boundaries: tuple[FrontendRouteBoundary, ...]
    adapter_reviews: tuple[FrontendAdapterReview, ...]
    budget_reviews: tuple[FrontendBudgetReview, ...]
    automation_reviews: tuple[FrontendAutomationReview, ...]

    def __post_init__(self) -> None:
        if not self.review_id.strip():
            raise FrontendArchitectureReviewError("review_id is required")
        if not self.expected_routes:
            raise FrontendArchitectureReviewError("expected_routes must not be empty")
        if not self.required_journey_ids:
            raise FrontendArchitectureReviewError("required_journey_ids must not be empty")


@dataclass(frozen=True)
class FrontendArchitectureChecklistItem:
    check: FrontendArchitectureCheck
    passed: bool
    reason_code: str


@dataclass(frozen=True)
class FrontendArchitectureReviewOutcome:
    passed: bool
    checklist: tuple[FrontendArchitectureChecklistItem, ...]
    blocking_reason_codes: tuple[str, ...]
    missing_routes: tuple[str, ...]
    missing_journey_ids: tuple[str, ...]
    missing_mutation_actions: tuple[str, ...]


class FrontendArchitectureReviewGate:
    """Checks the final frontend transport posture before release evidence is published."""

    def review(
        self,
        request: FrontendArchitectureReviewRequest,
    ) -> FrontendArchitectureReviewOutcome:
        boundary_routes = {boundary.route_name for boundary in request.route_boundaries}
        missing_routes = tuple(
            route_name for route_name in request.expected_routes if route_name not in boundary_routes
        )
        supported_routes = {
            route_name
            for review in request.adapter_reviews
            if review.typed_validation
            for route_name in review.supported_routes
        }
        missing_mutation_actions = tuple(
            sorted(
                {
                    action
                    for action in request.required_mutation_actions
                    if action
                    not in {
                        mutation
                        for boundary in request.route_boundaries
                        for mutation in boundary.mutation_actions
                    }
                }
            )
        )
        missing_journey_ids = tuple(
            journey_id
            for journey_id in request.required_journey_ids
            if journey_id
            not in {
                review.journey_id
                for review in request.automation_reviews
                if review.passed
            }
        )

        checklist = (
            self._route_item(missing_routes),
            self._adapter_item(request, supported_routes),
            self._mutation_item(missing_mutation_actions),
            self._budget_item(request),
            self._automation_item(missing_journey_ids, request),
        )
        blocking_reason_codes = tuple(item.reason_code for item in checklist if not item.passed)
        return FrontendArchitectureReviewOutcome(
            passed=not blocking_reason_codes,
            checklist=checklist,
            blocking_reason_codes=blocking_reason_codes,
            missing_routes=missing_routes,
            missing_journey_ids=missing_journey_ids,
            missing_mutation_actions=missing_mutation_actions,
        )

    def _route_item(
        self,
        missing_routes: tuple[str, ...],
    ) -> FrontendArchitectureChecklistItem:
        if missing_routes:
            return FrontendArchitectureChecklistItem(
                check=FrontendArchitectureCheck.ROUTE_BOUNDARIES,
                passed=False,
                reason_code="route_boundaries_incomplete",
            )
        return FrontendArchitectureChecklistItem(
            check=FrontendArchitectureCheck.ROUTE_BOUNDARIES,
            passed=True,
            reason_code="route_boundaries_complete",
        )

    def _adapter_item(
        self,
        request: FrontendArchitectureReviewRequest,
        supported_routes: set[str],
    ) -> FrontendArchitectureChecklistItem:
        for boundary in request.route_boundaries:
            if boundary.route_name not in supported_routes:
                return FrontendArchitectureChecklistItem(
                    check=FrontendArchitectureCheck.ADAPTER_COVERAGE,
                    passed=False,
                    reason_code="typed_adapter_missing",
                )
        return FrontendArchitectureChecklistItem(
            check=FrontendArchitectureCheck.ADAPTER_COVERAGE,
            passed=True,
            reason_code="typed_adapters_complete",
        )

    def _mutation_item(
        self,
        missing_mutation_actions: tuple[str, ...],
    ) -> FrontendArchitectureChecklistItem:
        if missing_mutation_actions:
            return FrontendArchitectureChecklistItem(
                check=FrontendArchitectureCheck.MUTATION_WIRING,
                passed=False,
                reason_code="mutation_actions_missing",
            )
        return FrontendArchitectureChecklistItem(
            check=FrontendArchitectureCheck.MUTATION_WIRING,
            passed=True,
            reason_code="mutation_actions_complete",
        )

    def _budget_item(
        self,
        request: FrontendArchitectureReviewRequest,
    ) -> FrontendArchitectureChecklistItem:
        if any(not review.passed for review in request.budget_reviews):
            return FrontendArchitectureChecklistItem(
                check=FrontendArchitectureCheck.PERFORMANCE_BUDGETS,
                passed=False,
                reason_code="performance_budget_review_failed",
            )
        return FrontendArchitectureChecklistItem(
            check=FrontendArchitectureCheck.PERFORMANCE_BUDGETS,
            passed=True,
            reason_code="performance_budget_reviews_passed",
        )

    def _automation_item(
        self,
        missing_journey_ids: tuple[str, ...],
        request: FrontendArchitectureReviewRequest,
    ) -> FrontendArchitectureChecklistItem:
        if missing_journey_ids:
            return FrontendArchitectureChecklistItem(
                check=FrontendArchitectureCheck.AUTOMATION_COVERAGE,
                passed=False,
                reason_code="automation_coverage_incomplete",
            )
        if any(
            "mobile" not in review.viewport_matrix and "desktop" not in review.viewport_matrix
            for review in request.automation_reviews
        ):
            return FrontendArchitectureChecklistItem(
                check=FrontendArchitectureCheck.AUTOMATION_COVERAGE,
                passed=False,
                reason_code="automation_viewport_matrix_missing",
            )
        return FrontendArchitectureChecklistItem(
            check=FrontendArchitectureCheck.AUTOMATION_COVERAGE,
            passed=True,
            reason_code="automation_coverage_complete",
        )
