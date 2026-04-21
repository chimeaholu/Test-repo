"""B-015 reviewer agent workflow for confidence thresholds and escalation."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .advisory_retrieval import AdvisoryRetrievalResult
from .policy_guardrails import (
    AgentPolicyGuardrailEngine,
    PolicyDecision,
    PolicyEvaluationInput,
    PolicyOutcome,
    PolicyDecisionMatrix,
    RiskLevel,
    ToolPolicyRule,
)


class ReviewerDecision(str, Enum):
    APPROVE = "approve"
    BLOCK = "block"
    ESCALATE = "escalate"


class ReviewerWorkflowError(ValueError):
    """Raised when a reviewer decision request is invalid."""


@dataclass(frozen=True)
class ReviewerDecisionRequest:
    advisory_result: AdvisoryRetrievalResult
    actor_role: str
    country_code: str
    confidence_score: float
    risk_score: int
    hitl_approved: bool = False


@dataclass(frozen=True)
class ReviewerDecisionOutcome:
    decision: ReviewerDecision
    reason_code: str
    escalation_required: bool
    minimum_confidence: float
    matched_source_ids: tuple[str, ...]
    policy_decision: PolicyDecision | None = None
    policy_reason_code: str | None = None


DEFAULT_REVIEWER_RULES: tuple[ToolPolicyRule, ...] = (
    ToolPolicyRule(
        tool_name="advisory.deliver_response",
        allowed_roles=("advisor_agent", "reviewer_agent", "admin"),
        allowed_country_codes=("GH", "NG", "JM"),
        risk_level=RiskLevel.MEDIUM,
        requires_hitl=False,
    ),
)


class ReviewerAgentDecisionWorkflow:
    """Applies source/confidence thresholds and HITL escalation for advisory delivery."""

    def __init__(
        self,
        *,
        policy_engine: AgentPolicyGuardrailEngine | None = None,
        confidence_thresholds: dict[RiskLevel, float] | None = None,
    ) -> None:
        self._policy_engine = policy_engine or AgentPolicyGuardrailEngine(
            rules=DEFAULT_REVIEWER_RULES,
            decision_matrix=PolicyDecisionMatrix(),
        )
        self._thresholds = confidence_thresholds or {
            RiskLevel.LOW: 0.4,
            RiskLevel.MEDIUM: 0.65,
            RiskLevel.HIGH: 0.85,
        }

    def evaluate(self, request: ReviewerDecisionRequest) -> ReviewerDecisionOutcome:
        self._validate_request(request)

        risk_level = self._risk_level_for(request.risk_score)
        minimum_confidence = self._thresholds[risk_level]

        if not request.advisory_result.citations:
            return ReviewerDecisionOutcome(
                decision=ReviewerDecision.BLOCK,
                reason_code="citations_required",
                escalation_required=False,
                minimum_confidence=minimum_confidence,
                matched_source_ids=(),
            )

        if request.confidence_score < minimum_confidence:
            if risk_level == RiskLevel.HIGH and not request.hitl_approved:
                return ReviewerDecisionOutcome(
                    decision=ReviewerDecision.BLOCK,
                    reason_code="hitl_required_for_high_risk_low_confidence",
                    escalation_required=True,
                    minimum_confidence=minimum_confidence,
                    matched_source_ids=request.advisory_result.source_ids,
                )
            return ReviewerDecisionOutcome(
                decision=ReviewerDecision.ESCALATE,
                reason_code="confidence_below_threshold",
                escalation_required=True,
                minimum_confidence=minimum_confidence,
                matched_source_ids=request.advisory_result.source_ids,
            )

        policy_outcome = self._policy_engine.evaluate(
            PolicyEvaluationInput(
                tool_name="advisory.deliver_response",
                actor_role=request.actor_role,
                country_code=request.country_code,
                risk_score=request.risk_score,
                hitl_approved=request.hitl_approved,
            )
        )
        return self._from_policy_outcome(
            policy_outcome=policy_outcome,
            request=request,
            minimum_confidence=minimum_confidence,
        )

    def _from_policy_outcome(
        self,
        *,
        policy_outcome: PolicyOutcome,
        request: ReviewerDecisionRequest,
        minimum_confidence: float,
    ) -> ReviewerDecisionOutcome:
        if policy_outcome.decision == PolicyDecision.DENY:
            return ReviewerDecisionOutcome(
                decision=ReviewerDecision.BLOCK,
                reason_code="policy_block",
                escalation_required=False,
                minimum_confidence=minimum_confidence,
                matched_source_ids=request.advisory_result.source_ids,
                policy_decision=policy_outcome.decision,
                policy_reason_code=policy_outcome.reason_code,
            )
        if policy_outcome.decision == PolicyDecision.CHALLENGE:
            return ReviewerDecisionOutcome(
                decision=ReviewerDecision.ESCALATE,
                reason_code="policy_hitl_required",
                escalation_required=True,
                minimum_confidence=minimum_confidence,
                matched_source_ids=request.advisory_result.source_ids,
                policy_decision=policy_outcome.decision,
                policy_reason_code=policy_outcome.reason_code,
            )
        return ReviewerDecisionOutcome(
            decision=ReviewerDecision.APPROVE,
            reason_code="allow",
            escalation_required=policy_outcome.hitl_required,
            minimum_confidence=minimum_confidence,
            matched_source_ids=request.advisory_result.source_ids,
            policy_decision=policy_outcome.decision,
            policy_reason_code=policy_outcome.reason_code,
        )

    def _validate_request(self, request: ReviewerDecisionRequest) -> None:
        if not 0 <= request.confidence_score <= 1:
            raise ReviewerWorkflowError("confidence_score must be between 0 and 1")
        if not 0 <= request.risk_score <= 100:
            raise ReviewerWorkflowError("risk_score must be between 0 and 100")
        missing = {RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH}.difference(self._thresholds)
        if missing:
            raise ReviewerWorkflowError(f"missing confidence thresholds: {sorted(missing)}")

    @staticmethod
    def _risk_level_for(risk_score: int) -> RiskLevel:
        if risk_score >= 85:
            return RiskLevel.HIGH
        if risk_score >= 60:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW
