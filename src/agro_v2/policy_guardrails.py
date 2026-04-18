"""B-008 policy guardrail framework with decision matrix and evaluator."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class PolicyDecision(str, Enum):
    ALLOW = "allow"
    DENY = "deny"
    CHALLENGE = "challenge"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass(frozen=True)
class ToolPolicyRule:
    tool_name: str
    allowed_roles: tuple[str, ...]
    allowed_country_codes: tuple[str, ...] = ()
    risk_level: RiskLevel = RiskLevel.LOW
    requires_hitl: bool = False


@dataclass(frozen=True)
class PolicyEvaluationInput:
    tool_name: str
    actor_role: str
    country_code: str
    risk_score: int = 0
    hitl_approved: bool = False


@dataclass(frozen=True)
class PolicyOutcome:
    decision: PolicyDecision
    reason_code: str
    hitl_required: bool
    matched_rule: str | None = None


DEFAULT_POLICY_DECISION_MATRIX: dict[RiskLevel, PolicyDecision] = {
    RiskLevel.LOW: PolicyDecision.ALLOW,
    RiskLevel.MEDIUM: PolicyDecision.ALLOW,
    RiskLevel.HIGH: PolicyDecision.CHALLENGE,
}

DEFAULT_TOOL_POLICY_RULES: tuple[ToolPolicyRule, ...] = (
    ToolPolicyRule(
        tool_name="market.read_prices",
        allowed_roles=("farmer", "cooperative_admin", "admin", "compliance"),
        allowed_country_codes=("GH", "NG", "JM"),
        risk_level=RiskLevel.LOW,
    ),
    ToolPolicyRule(
        tool_name="wallet.release_escrow",
        allowed_roles=("finance_ops", "admin"),
        allowed_country_codes=("GH", "NG", "JM"),
        risk_level=RiskLevel.HIGH,
        requires_hitl=True,
    ),
    ToolPolicyRule(
        tool_name="agent.export_audit_bundle",
        allowed_roles=("compliance", "admin"),
        allowed_country_codes=("GH", "NG", "JM"),
        risk_level=RiskLevel.MEDIUM,
        requires_hitl=True,
    ),
)


class PolicyDecisionMatrix:
    """Scaffold matrix for risk-based allow/deny/challenge policy posture."""

    def __init__(
        self,
        *,
        matrix: dict[RiskLevel, PolicyDecision] | None = None,
        risk_thresholds: dict[RiskLevel, int] | None = None,
    ) -> None:
        self._matrix = matrix or DEFAULT_POLICY_DECISION_MATRIX
        self._risk_thresholds = risk_thresholds or {
            RiskLevel.LOW: 25,
            RiskLevel.MEDIUM: 60,
            RiskLevel.HIGH: 85,
        }
        self._validate()

    @property
    def matrix(self) -> dict[RiskLevel, PolicyDecision]:
        return dict(self._matrix)

    def decision_for(self, rule_risk_level: RiskLevel, risk_score: int) -> PolicyDecision:
        if risk_score >= self._risk_thresholds[RiskLevel.HIGH]:
            return self._matrix[RiskLevel.HIGH]
        if risk_score >= self._risk_thresholds[RiskLevel.MEDIUM]:
            return self._matrix[RiskLevel.MEDIUM]
        return self._matrix[rule_risk_level]

    def _validate(self) -> None:
        missing_levels = {RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH}.difference(
            self._matrix
        )
        if missing_levels:
            raise ValueError(f"policy matrix missing levels: {sorted(missing_levels)}")
        for level in (RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH):
            if level not in self._risk_thresholds:
                raise ValueError(f"missing risk threshold for {level.value}")


class AgentPolicyGuardrailEngine:
    """Evaluates policy requests using allow-list rules and risk/HITL matrix."""

    def __init__(
        self,
        *,
        rules: tuple[ToolPolicyRule, ...] = DEFAULT_TOOL_POLICY_RULES,
        decision_matrix: PolicyDecisionMatrix | None = None,
    ) -> None:
        self._rules = {rule.tool_name: rule for rule in rules}
        self._decision_matrix = decision_matrix or PolicyDecisionMatrix()

    def evaluate(self, request: PolicyEvaluationInput) -> PolicyOutcome:
        if not 0 <= request.risk_score <= 100:
            raise ValueError("risk_score must be between 0 and 100")

        rule = self._rules.get(request.tool_name)
        if rule is None:
            return PolicyOutcome(
                decision=PolicyDecision.DENY,
                reason_code="tool_not_allowlisted",
                hitl_required=False,
            )

        if request.actor_role not in rule.allowed_roles:
            return PolicyOutcome(
                decision=PolicyDecision.DENY,
                reason_code="role_not_allowed",
                hitl_required=False,
                matched_rule=rule.tool_name,
            )

        country_code = request.country_code.upper()
        if rule.allowed_country_codes and country_code not in rule.allowed_country_codes:
            return PolicyOutcome(
                decision=PolicyDecision.DENY,
                reason_code="country_not_allowed",
                hitl_required=False,
                matched_rule=rule.tool_name,
            )

        matrix_decision = self._decision_matrix.decision_for(rule.risk_level, request.risk_score)
        requires_hitl = rule.requires_hitl or matrix_decision == PolicyDecision.CHALLENGE

        if requires_hitl and not request.hitl_approved:
            return PolicyOutcome(
                decision=PolicyDecision.CHALLENGE,
                reason_code="hitl_required",
                hitl_required=True,
                matched_rule=rule.tool_name,
            )

        return PolicyOutcome(
            decision=PolicyDecision.ALLOW,
            reason_code="allow",
            hitl_required=requires_hitl,
            matched_rule=rule.tool_name,
        )


def evaluate_allow_deny(
    engine: AgentPolicyGuardrailEngine,
    request: PolicyEvaluationInput,
    *,
    strict: bool = False,
) -> PolicyOutcome:
    """Evaluate policy and optionally collapse challenge decisions to deny."""
    outcome = engine.evaluate(request)
    if strict and outcome.decision == PolicyDecision.CHALLENGE:
        return PolicyOutcome(
            decision=PolicyDecision.DENY,
            reason_code="hitl_required",
            hitl_required=True,
            matched_rule=outcome.matched_rule,
        )
    return outcome
