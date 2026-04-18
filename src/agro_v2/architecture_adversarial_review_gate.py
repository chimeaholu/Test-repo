"""B-030 architecture adversarial review gate."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


REQUIRED_SECURITY_CONTROL_IDS: tuple[str, ...] = (
    "auth_boundary",
    "data_isolation",
    "audit_logging",
    "secret_management",
)
REQUIRED_DEPLOYMENT_ENVIRONMENTS: tuple[str, ...] = ("staging", "production")


class ArchitectureReviewCheck(str, Enum):
    BOUNDARY_INTEGRITY = "boundary_integrity"
    SCALE_FEASIBILITY = "scale_feasibility"
    SECURITY_CONTROLS = "security_controls"
    DEPLOYMENT_FEASIBILITY = "deployment_feasibility"
    REQUIREMENT_MAPPING = "requirement_mapping"


class ArchitectureAdversarialReviewError(ValueError):
    """Raised when architecture review evidence is malformed."""


@dataclass(frozen=True)
class ServiceBoundaryReview:
    boundary_id: str
    owner: str
    dependency_ids: tuple[str, ...]
    trust_boundary: str
    public_entrypoint: bool

    def __post_init__(self) -> None:
        if not self.boundary_id.strip():
            raise ArchitectureAdversarialReviewError("boundary_id is required")
        if not self.owner.strip():
            raise ArchitectureAdversarialReviewError("owner is required")
        if not self.trust_boundary.strip():
            raise ArchitectureAdversarialReviewError("trust_boundary is required")
        if self.boundary_id in self.dependency_ids:
            raise ArchitectureAdversarialReviewError("boundary cannot depend on itself")


@dataclass(frozen=True)
class ScaleReview:
    boundary_id: str
    peak_rps: int
    headroom_ratio: float
    backpressure_defined: bool

    def __post_init__(self) -> None:
        if not self.boundary_id.strip():
            raise ArchitectureAdversarialReviewError("boundary_id is required")
        if self.peak_rps <= 0:
            raise ArchitectureAdversarialReviewError("peak_rps must be greater than zero")
        if self.headroom_ratio <= 1:
            raise ArchitectureAdversarialReviewError("headroom_ratio must be greater than one")


@dataclass(frozen=True)
class SecurityControlReview:
    control_id: str
    owner: str
    enforced: bool

    def __post_init__(self) -> None:
        if not self.control_id.strip():
            raise ArchitectureAdversarialReviewError("control_id is required")
        if not self.owner.strip():
            raise ArchitectureAdversarialReviewError("owner is required")


@dataclass(frozen=True)
class DeploymentReview:
    environment: str
    target: str
    regions: tuple[str, ...]
    healthcheck_defined: bool
    rollback_defined: bool

    def __post_init__(self) -> None:
        if not self.environment.strip():
            raise ArchitectureAdversarialReviewError("environment is required")
        if not self.target.strip():
            raise ArchitectureAdversarialReviewError("target is required")
        if not self.regions:
            raise ArchitectureAdversarialReviewError("regions must not be empty")


@dataclass(frozen=True)
class ArchitectureReviewRequest:
    review_id: str
    expected_boundary_ids: tuple[str, ...]
    boundary_reviews: tuple[ServiceBoundaryReview, ...]
    scale_reviews: tuple[ScaleReview, ...]
    security_controls: tuple[SecurityControlReview, ...]
    deployment_reviews: tuple[DeploymentReview, ...]
    required_requirement_ids: tuple[str, ...]
    requirement_mapping: dict[str, tuple[str, ...]]

    def __post_init__(self) -> None:
        if not self.review_id.strip():
            raise ArchitectureAdversarialReviewError("review_id is required")
        if not self.expected_boundary_ids:
            raise ArchitectureAdversarialReviewError("expected_boundary_ids must not be empty")
        if not self.required_requirement_ids:
            raise ArchitectureAdversarialReviewError("required_requirement_ids must not be empty")


@dataclass(frozen=True)
class ArchitectureReviewChecklistItem:
    check: ArchitectureReviewCheck
    passed: bool
    reason_code: str


@dataclass(frozen=True)
class ArchitectureReviewOutcome:
    passed: bool
    checklist: tuple[ArchitectureReviewChecklistItem, ...]
    blocking_reason_codes: tuple[str, ...]
    missing_boundary_ids: tuple[str, ...]
    unknown_dependency_ids: tuple[str, ...]
    missing_requirement_ids: tuple[str, ...]


class ArchitectureAdversarialReviewGate:
    """Checks architecture evidence for boundaries, scale, security, and rollout fit."""

    def review(self, request: ArchitectureReviewRequest) -> ArchitectureReviewOutcome:
        boundary_ids = {review.boundary_id for review in request.boundary_reviews}
        missing_boundary_ids = tuple(
            boundary_id
            for boundary_id in request.expected_boundary_ids
            if boundary_id not in boundary_ids
        )
        unknown_dependency_ids = tuple(
            sorted(
                {
                    dependency_id
                    for review in request.boundary_reviews
                    for dependency_id in review.dependency_ids
                    if dependency_id not in boundary_ids
                }
            )
        )
        missing_requirement_ids = tuple(
            requirement_id
            for requirement_id in request.required_requirement_ids
            if not _has_mapping(request.requirement_mapping.get(requirement_id, ()))
        )
        checklist = (
            self._boundary_integrity_item(missing_boundary_ids, unknown_dependency_ids),
            self._scale_feasibility_item(request),
            self._security_controls_item(request),
            self._deployment_feasibility_item(request),
            self._requirement_mapping_item(missing_requirement_ids),
        )
        blocking_reason_codes = tuple(item.reason_code for item in checklist if not item.passed)
        return ArchitectureReviewOutcome(
            passed=not blocking_reason_codes,
            checklist=checklist,
            blocking_reason_codes=blocking_reason_codes,
            missing_boundary_ids=missing_boundary_ids,
            unknown_dependency_ids=unknown_dependency_ids,
            missing_requirement_ids=missing_requirement_ids,
        )

    def _boundary_integrity_item(
        self,
        missing_boundary_ids: tuple[str, ...],
        unknown_dependency_ids: tuple[str, ...],
    ) -> ArchitectureReviewChecklistItem:
        if missing_boundary_ids:
            return ArchitectureReviewChecklistItem(
                check=ArchitectureReviewCheck.BOUNDARY_INTEGRITY,
                passed=False,
                reason_code="boundary_reviews_incomplete",
            )
        if unknown_dependency_ids:
            return ArchitectureReviewChecklistItem(
                check=ArchitectureReviewCheck.BOUNDARY_INTEGRITY,
                passed=False,
                reason_code="boundary_dependency_unresolved",
            )
        return ArchitectureReviewChecklistItem(
            check=ArchitectureReviewCheck.BOUNDARY_INTEGRITY,
            passed=True,
            reason_code="boundary_integrity_passed",
        )

    def _scale_feasibility_item(
        self,
        request: ArchitectureReviewRequest,
    ) -> ArchitectureReviewChecklistItem:
        scale_by_boundary = {review.boundary_id: review for review in request.scale_reviews}
        for boundary_id in request.expected_boundary_ids:
            review = scale_by_boundary.get(boundary_id)
            if review is None:
                return ArchitectureReviewChecklistItem(
                    check=ArchitectureReviewCheck.SCALE_FEASIBILITY,
                    passed=False,
                    reason_code="scale_review_missing",
                )
            if not review.backpressure_defined:
                return ArchitectureReviewChecklistItem(
                    check=ArchitectureReviewCheck.SCALE_FEASIBILITY,
                    passed=False,
                    reason_code="backpressure_not_defined",
                )
        return ArchitectureReviewChecklistItem(
            check=ArchitectureReviewCheck.SCALE_FEASIBILITY,
            passed=True,
            reason_code="scale_feasibility_passed",
        )

    def _security_controls_item(
        self,
        request: ArchitectureReviewRequest,
    ) -> ArchitectureReviewChecklistItem:
        control_ids = {
            review.control_id
            for review in request.security_controls
            if review.enforced
        }
        missing = [
            control_id for control_id in REQUIRED_SECURITY_CONTROL_IDS if control_id not in control_ids
        ]
        if missing:
            return ArchitectureReviewChecklistItem(
                check=ArchitectureReviewCheck.SECURITY_CONTROLS,
                passed=False,
                reason_code="security_controls_incomplete",
            )
        return ArchitectureReviewChecklistItem(
            check=ArchitectureReviewCheck.SECURITY_CONTROLS,
            passed=True,
            reason_code="security_controls_passed",
        )

    def _deployment_feasibility_item(
        self,
        request: ArchitectureReviewRequest,
    ) -> ArchitectureReviewChecklistItem:
        deployments = {review.environment: review for review in request.deployment_reviews}
        for environment in REQUIRED_DEPLOYMENT_ENVIRONMENTS:
            review = deployments.get(environment)
            if review is None:
                return ArchitectureReviewChecklistItem(
                    check=ArchitectureReviewCheck.DEPLOYMENT_FEASIBILITY,
                    passed=False,
                    reason_code="deployment_environment_missing",
                )
            if not review.healthcheck_defined or not review.rollback_defined:
                return ArchitectureReviewChecklistItem(
                    check=ArchitectureReviewCheck.DEPLOYMENT_FEASIBILITY,
                    passed=False,
                    reason_code="deployment_recovery_incomplete",
                )
        return ArchitectureReviewChecklistItem(
            check=ArchitectureReviewCheck.DEPLOYMENT_FEASIBILITY,
            passed=True,
            reason_code="deployment_feasibility_passed",
        )

    def _requirement_mapping_item(
        self,
        missing_requirement_ids: tuple[str, ...],
    ) -> ArchitectureReviewChecklistItem:
        if missing_requirement_ids:
            return ArchitectureReviewChecklistItem(
                check=ArchitectureReviewCheck.REQUIREMENT_MAPPING,
                passed=False,
                reason_code="requirement_mapping_incomplete",
            )
        return ArchitectureReviewChecklistItem(
            check=ArchitectureReviewCheck.REQUIREMENT_MAPPING,
            passed=True,
            reason_code="requirement_mapping_complete",
        )


def _has_mapping(evidence: tuple[str, ...]) -> bool:
    return any(item.strip() for item in evidence)
