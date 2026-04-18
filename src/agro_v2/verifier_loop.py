"""B-032 verifier loop runtime for approve/revise/block decision handling."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .advisory_retrieval import AdvisoryRetrievalResult
from .reviewer_workflow import (
    ReviewerAgentDecisionWorkflow,
    ReviewerDecision,
    ReviewerDecisionRequest,
)


class VerifierDecision(str, Enum):
    APPROVE = "approve"
    REVISE = "revise"
    BLOCK = "block"


class VerifierState(str, Enum):
    PENDING = "pending"
    REVISE_REQUESTED = "revise_requested"
    APPROVED = "approved"
    BLOCKED = "blocked"


class VerifierLoopError(ValueError):
    """Raised when a verifier transition request is invalid."""


@dataclass(frozen=True)
class VerifierLoopRequest:
    workflow_id: str
    current_state: VerifierState
    advisory_result: AdvisoryRetrievalResult
    actor_role: str
    country_code: str
    confidence_score: float
    risk_score: int
    executor_model: str
    executor_tier: str
    verifier_model: str
    verifier_tier: str
    hitl_approved: bool = False
    inconsistency_flags: tuple[str, ...] = ()


@dataclass(frozen=True)
class VerifierDecisionLog:
    workflow_id: str
    previous_state: VerifierState
    next_state: VerifierState
    decision: VerifierDecision
    reason_code: str
    source_ids: tuple[str, ...]
    citation_count: int
    executor_model: str
    executor_tier: str
    verifier_model: str
    verifier_tier: str


@dataclass(frozen=True)
class VerifierLoopOutcome:
    workflow_id: str
    previous_state: VerifierState
    current_state: VerifierState
    decision: VerifierDecision
    reason_code: str
    requires_revision: bool
    escalation_required: bool
    decision_log: VerifierDecisionLog


class VerifierLoopRuntime:
    """Runs an independent verifier pass before high-risk actions commit."""

    def __init__(
        self,
        *,
        reviewer_workflow: ReviewerAgentDecisionWorkflow | None = None,
    ) -> None:
        self._reviewer_workflow = reviewer_workflow or ReviewerAgentDecisionWorkflow()

    def evaluate(self, request: VerifierLoopRequest) -> VerifierLoopOutcome:
        self._validate_request(request)

        if request.inconsistency_flags:
            return self._build_outcome(
                request=request,
                decision=VerifierDecision.REVISE,
                next_state=VerifierState.REVISE_REQUESTED,
                reason_code="inconsistency_detected",
                escalation_required=True,
            )

        reviewer_outcome = self._reviewer_workflow.evaluate(
            ReviewerDecisionRequest(
                advisory_result=request.advisory_result,
                actor_role=request.actor_role,
                country_code=request.country_code,
                confidence_score=request.confidence_score,
                risk_score=request.risk_score,
                hitl_approved=request.hitl_approved,
            )
        )

        if reviewer_outcome.decision == ReviewerDecision.APPROVE:
            return self._build_outcome(
                request=request,
                decision=VerifierDecision.APPROVE,
                next_state=VerifierState.APPROVED,
                reason_code=reviewer_outcome.reason_code,
                escalation_required=reviewer_outcome.escalation_required,
            )

        if reviewer_outcome.decision == ReviewerDecision.ESCALATE:
            return self._build_outcome(
                request=request,
                decision=VerifierDecision.REVISE,
                next_state=VerifierState.REVISE_REQUESTED,
                reason_code=reviewer_outcome.reason_code,
                escalation_required=True,
            )

        return self._build_outcome(
            request=request,
            decision=VerifierDecision.BLOCK,
            next_state=VerifierState.BLOCKED,
            reason_code=reviewer_outcome.reason_code,
            escalation_required=reviewer_outcome.escalation_required,
        )

    def _build_outcome(
        self,
        *,
        request: VerifierLoopRequest,
        decision: VerifierDecision,
        next_state: VerifierState,
        reason_code: str,
        escalation_required: bool,
    ) -> VerifierLoopOutcome:
        decision_log = VerifierDecisionLog(
            workflow_id=request.workflow_id,
            previous_state=request.current_state,
            next_state=next_state,
            decision=decision,
            reason_code=reason_code,
            source_ids=request.advisory_result.source_ids,
            citation_count=len(request.advisory_result.citations),
            executor_model=request.executor_model,
            executor_tier=request.executor_tier,
            verifier_model=request.verifier_model,
            verifier_tier=request.verifier_tier,
        )
        return VerifierLoopOutcome(
            workflow_id=request.workflow_id,
            previous_state=request.current_state,
            current_state=next_state,
            decision=decision,
            reason_code=reason_code,
            requires_revision=decision == VerifierDecision.REVISE,
            escalation_required=escalation_required,
            decision_log=decision_log,
        )

    @staticmethod
    def _validate_request(request: VerifierLoopRequest) -> None:
        if not request.workflow_id.strip():
            raise VerifierLoopError("workflow_id is required")
        if request.current_state in {VerifierState.APPROVED, VerifierState.BLOCKED}:
            raise VerifierLoopError("terminal verifier states cannot be reevaluated")
        for field_name, value in (
            ("executor_model", request.executor_model),
            ("executor_tier", request.executor_tier),
            ("verifier_model", request.verifier_model),
            ("verifier_tier", request.verifier_tier),
        ):
            if not value.strip():
                raise VerifierLoopError(f"{field_name} is required")
