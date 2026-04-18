"""B-031 planning loop quality engine scaffold."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class IntentClass(str, Enum):
    TRIVIAL = "trivial"
    NON_TRIVIAL = "non_trivial"


class RiskClass(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class PlanningCheckpoint(str, Enum):
    INTENT_CAPTURED = "intent_captured"
    CONTEXT_COMPACTED = "context_compacted"
    PLAN_ARTIFACT_ATTACHED = "plan_artifact_attached"
    PHASE_REVIEW_PASSED = "phase_review_passed"


class PhaseCheckpointError(ValueError):
    """Raised when required planning checkpoints are missing or misordered."""


@dataclass(frozen=True)
class PlannerTriggerInput:
    intent_class: IntentClass
    risk_class: RiskClass


@dataclass(frozen=True)
class PlannerTriggerOutcome:
    requires_planner_artifact: bool
    reason_code: str


@dataclass(frozen=True)
class ExecutionGateOutcome:
    allowed: bool
    reason_code: str
    missing_checkpoints: tuple[PlanningCheckpoint, ...] = ()


class PhaseCheckpointEnforcer:
    """Tracks ordered phase checkpoints for each workflow."""

    def __init__(
        self,
        required_checkpoints: tuple[PlanningCheckpoint, ...] | None = None,
    ) -> None:
        self._required = required_checkpoints or (
            PlanningCheckpoint.INTENT_CAPTURED,
            PlanningCheckpoint.CONTEXT_COMPACTED,
            PlanningCheckpoint.PLAN_ARTIFACT_ATTACHED,
            PlanningCheckpoint.PHASE_REVIEW_PASSED,
        )
        self._checkpoint_index = {checkpoint: idx for idx, checkpoint in enumerate(self._required)}
        self._workflow_checkpoints: dict[str, tuple[PlanningCheckpoint, ...]] = {}

    def record_checkpoint(self, workflow_id: str, checkpoint: PlanningCheckpoint) -> None:
        if not workflow_id.strip():
            raise ValueError("workflow_id is required")
        if checkpoint not in self._checkpoint_index:
            raise PhaseCheckpointError(
                f"checkpoint not configured for enforcement: {checkpoint.value}"
            )

        recorded = self._workflow_checkpoints.get(workflow_id, ())
        target_index = self._checkpoint_index[checkpoint]

        if checkpoint in recorded:
            return

        if target_index != len(recorded):
            expected = self._required[len(recorded)]
            raise PhaseCheckpointError(
                "checkpoint out of sequence: "
                f"expected '{expected.value}' before '{checkpoint.value}'"
            )

        self._workflow_checkpoints[workflow_id] = (*recorded, checkpoint)

    def missing_checkpoints(self, workflow_id: str) -> tuple[PlanningCheckpoint, ...]:
        recorded = self._workflow_checkpoints.get(workflow_id, ())
        return tuple(checkpoint for checkpoint in self._required if checkpoint not in recorded)

    def assert_complete(self, workflow_id: str) -> None:
        missing = self.missing_checkpoints(workflow_id)
        if missing:
            labels = ", ".join(checkpoint.value for checkpoint in missing)
            raise PhaseCheckpointError(f"workflow '{workflow_id}' missing checkpoints: {labels}")


class PlanningLoopQualityEngine:
    """Applies planner trigger policy and phase checkpoint execution gating."""

    def __init__(
        self,
        checkpoint_enforcer: PhaseCheckpointEnforcer | None = None,
    ) -> None:
        self._checkpoint_enforcer = checkpoint_enforcer or PhaseCheckpointEnforcer()

    def evaluate_trigger(self, request: PlannerTriggerInput) -> PlannerTriggerOutcome:
        if request.intent_class == IntentClass.NON_TRIVIAL:
            return PlannerTriggerOutcome(
                requires_planner_artifact=True,
                reason_code="non_trivial_intent_requires_planner",
            )

        if request.risk_class in {RiskClass.MEDIUM, RiskClass.HIGH}:
            return PlannerTriggerOutcome(
                requires_planner_artifact=True,
                reason_code="elevated_risk_requires_planner",
            )

        return PlannerTriggerOutcome(
            requires_planner_artifact=False,
            reason_code="trivial_low_risk",
        )

    def record_checkpoint(self, workflow_id: str, checkpoint: PlanningCheckpoint) -> None:
        self._checkpoint_enforcer.record_checkpoint(workflow_id, checkpoint)

    def evaluate_execution_gate(
        self,
        *,
        workflow_id: str,
        trigger_outcome: PlannerTriggerOutcome,
        planner_artifact_id: str | None,
    ) -> ExecutionGateOutcome:
        missing_checkpoints = self._checkpoint_enforcer.missing_checkpoints(workflow_id)
        if missing_checkpoints:
            return ExecutionGateOutcome(
                allowed=False,
                reason_code="phase_checkpoints_incomplete",
                missing_checkpoints=missing_checkpoints,
            )

        if trigger_outcome.requires_planner_artifact and not (planner_artifact_id or "").strip():
            return ExecutionGateOutcome(
                allowed=False,
                reason_code="planner_artifact_required",
            )

        return ExecutionGateOutcome(
            allowed=True,
            reason_code="allow",
        )
