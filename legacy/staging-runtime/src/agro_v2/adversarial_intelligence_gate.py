"""B-038 adversarial rollout gate for planner/verifier/runtime interactions."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .agent_eval import HarnessEvaluationReport
from .memory_selector import MemorySelectionOutcome
from .model_router import ModelRouteOutcome
from .planning_loop import ExecutionGateOutcome
from .verifier_loop import VerifierDecision, VerifierLoopOutcome


REQUIRED_TRACEABILITY_IDS: tuple[str, ...] = (
    "AIJ-001",
    "AIJ-002",
    "AIJ-003",
    "AIJ-004",
    "AIJ-005",
    "AIJ-006",
    "IDI-001",
    "IDI-002",
    "IDI-003",
    "IDI-004",
    "IDI-005",
)


class AdversarialCheck(str, Enum):
    PLANNER_GATE = "planner_gate"
    VERIFIER_AUDIT = "verifier_audit"
    MEMORY_REVALIDATION = "memory_revalidation"
    ROUTER_ESCALATION = "router_escalation"
    EVAL_BENCHMARK = "eval_benchmark"
    TRACEABILITY = "traceability"


class AdversarialIntelligenceGateError(ValueError):
    """Raised when adversarial-gate inputs are malformed."""


@dataclass(frozen=True)
class AdversarialChecklistItem:
    check: AdversarialCheck
    passed: bool
    reason_code: str


@dataclass(frozen=True)
class AdversarialGateRequest:
    workflow_id: str
    execution_gate: ExecutionGateOutcome
    verifier_outcome: VerifierLoopOutcome
    memory_selection: MemorySelectionOutcome
    model_route: ModelRouteOutcome
    eval_report: HarnessEvaluationReport
    requirement_traceability: dict[str, tuple[str, ...]]
    minimum_eval_average: float = 0.85
    minimum_eval_fixtures: int = 2

    def __post_init__(self) -> None:
        if not self.workflow_id.strip():
            raise AdversarialIntelligenceGateError("workflow_id is required")
        if not 0 <= self.minimum_eval_average <= 1:
            raise AdversarialIntelligenceGateError(
                "minimum_eval_average must be between 0 and 1"
            )
        if self.minimum_eval_fixtures <= 0:
            raise AdversarialIntelligenceGateError("minimum_eval_fixtures must be positive")


@dataclass(frozen=True)
class AdversarialGateOutcome:
    passed: bool
    blocking_reason_codes: tuple[str, ...]
    checklist: tuple[AdversarialChecklistItem, ...]
    missing_traceability_ids: tuple[str, ...]


class AdversarialIntelligenceGate:
    """Applies a rollout-readiness checklist across intelligence subsystems."""

    def review(self, request: AdversarialGateRequest) -> AdversarialGateOutcome:
        checklist = (
            self._planner_gate_item(request),
            self._verifier_audit_item(request),
            self._memory_revalidation_item(request),
            self._router_escalation_item(request),
            self._eval_benchmark_item(request),
            self._traceability_item(request),
        )
        blocking_reason_codes = tuple(item.reason_code for item in checklist if not item.passed)
        missing_traceability_ids = _missing_traceability_ids(request.requirement_traceability)
        return AdversarialGateOutcome(
            passed=not blocking_reason_codes,
            blocking_reason_codes=blocking_reason_codes,
            checklist=checklist,
            missing_traceability_ids=missing_traceability_ids,
        )

    def _planner_gate_item(self, request: AdversarialGateRequest) -> AdversarialChecklistItem:
        if request.execution_gate.allowed and request.execution_gate.reason_code == "allow":
            return AdversarialChecklistItem(
                check=AdversarialCheck.PLANNER_GATE,
                passed=True,
                reason_code="planner_gate_enforced",
            )
        return AdversarialChecklistItem(
            check=AdversarialCheck.PLANNER_GATE,
            passed=False,
            reason_code=request.execution_gate.reason_code,
        )

    def _verifier_audit_item(self, request: AdversarialGateRequest) -> AdversarialChecklistItem:
        log = request.verifier_outcome.decision_log
        if log.workflow_id != request.workflow_id:
            return AdversarialChecklistItem(
                check=AdversarialCheck.VERIFIER_AUDIT,
                passed=False,
                reason_code="verifier_log_workflow_mismatch",
            )
        if not log.reason_code or not log.executor_model or not log.verifier_model:
            return AdversarialChecklistItem(
                check=AdversarialCheck.VERIFIER_AUDIT,
                passed=False,
                reason_code="verifier_log_incomplete",
            )
        if request.verifier_outcome.decision == VerifierDecision.BLOCK:
            return AdversarialChecklistItem(
                check=AdversarialCheck.VERIFIER_AUDIT,
                passed=False,
                reason_code="verifier_blocked",
            )
        return AdversarialChecklistItem(
            check=AdversarialCheck.VERIFIER_AUDIT,
            passed=True,
            reason_code="verifier_log_complete",
        )

    def _memory_revalidation_item(self, request: AdversarialGateRequest) -> AdversarialChecklistItem:
        if not request.memory_selection.requires_revalidation:
            return AdversarialChecklistItem(
                check=AdversarialCheck.MEMORY_REVALIDATION,
                passed=True,
                reason_code="no_stale_memory_selected",
            )
        if request.verifier_outcome.escalation_required:
            return AdversarialChecklistItem(
                check=AdversarialCheck.MEMORY_REVALIDATION,
                passed=True,
                reason_code="stale_memory_escalated",
            )
        return AdversarialChecklistItem(
            check=AdversarialCheck.MEMORY_REVALIDATION,
            passed=False,
            reason_code="stale_memory_not_escalated",
        )

    def _router_escalation_item(self, request: AdversarialGateRequest) -> AdversarialChecklistItem:
        route_log = request.model_route.route_log
        if route_log.workflow_id != request.workflow_id:
            return AdversarialChecklistItem(
                check=AdversarialCheck.ROUTER_ESCALATION,
                passed=False,
                reason_code="router_log_workflow_mismatch",
            )
        if request.model_route.requires_human_review and not request.verifier_outcome.escalation_required:
            return AdversarialChecklistItem(
                check=AdversarialCheck.ROUTER_ESCALATION,
                passed=False,
                reason_code="router_challenge_not_escalated",
            )
        return AdversarialChecklistItem(
            check=AdversarialCheck.ROUTER_ESCALATION,
            passed=True,
            reason_code="router_evidence_recorded",
        )

    def _eval_benchmark_item(self, request: AdversarialGateRequest) -> AdversarialChecklistItem:
        report = request.eval_report
        if report.total_fixtures < request.minimum_eval_fixtures:
            return AdversarialChecklistItem(
                check=AdversarialCheck.EVAL_BENCHMARK,
                passed=False,
                reason_code="insufficient_eval_fixture_count",
            )
        if report.passed_fixtures != report.total_fixtures:
            return AdversarialChecklistItem(
                check=AdversarialCheck.EVAL_BENCHMARK,
                passed=False,
                reason_code="eval_fixture_failure",
            )
        if report.average_score < request.minimum_eval_average:
            return AdversarialChecklistItem(
                check=AdversarialCheck.EVAL_BENCHMARK,
                passed=False,
                reason_code="eval_average_below_threshold",
            )
        return AdversarialChecklistItem(
            check=AdversarialCheck.EVAL_BENCHMARK,
            passed=True,
            reason_code="eval_gate_passed",
        )

    def _traceability_item(self, request: AdversarialGateRequest) -> AdversarialChecklistItem:
        missing = _missing_traceability_ids(request.requirement_traceability)
        if missing:
            return AdversarialChecklistItem(
                check=AdversarialCheck.TRACEABILITY,
                passed=False,
                reason_code="traceability_missing",
            )
        return AdversarialChecklistItem(
            check=AdversarialCheck.TRACEABILITY,
            passed=True,
            reason_code="traceability_complete",
        )


def _missing_traceability_ids(
    requirement_traceability: dict[str, tuple[str, ...]],
) -> tuple[str, ...]:
    missing = []
    for requirement_id in REQUIRED_TRACEABILITY_IDS:
        evidence = requirement_traceability.get(requirement_id, ())
        normalized = tuple(item.strip() for item in evidence if item.strip())
        if not normalized:
            missing.append(requirement_id)
    return tuple(missing)
