"""B-036 model router and budget guardrails for OSS-first inference routing."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class ModelTier(str, Enum):
    TIER_0 = "tier_0"
    TIER_1 = "tier_1"
    TIER_2 = "tier_2"
    TIER_3 = "tier_3"


class InferenceStage(str, Enum):
    INTENT = "intent"
    REASONING = "reasoning"
    VERIFIER = "verifier"


class ModelRouteDecision(str, Enum):
    ROUTE = "route"
    CHALLENGE = "challenge"


class BudgetGuardrailState(str, Enum):
    HEALTHY = "healthy"
    JOURNEY_WARNING = "journey_warning"
    DAILY_WARNING = "daily_warning"
    JOURNEY_CAP_EXCEEDED = "journey_cap_exceeded"
    DAILY_CAP_EXCEEDED = "daily_cap_exceeded"
    PREMIUM_QUOTA_EXCEEDED = "premium_quota_exceeded"


class ModelRouteError(ValueError):
    """Raised when model-routing inputs violate guardrail invariants."""


@dataclass(frozen=True)
class ModelRouterBudgetPolicy:
    journey_cap_usd: float
    daily_cap_usd: float
    warning_ratio: float = 0.8
    daily_premium_quota: int = 5

    def __post_init__(self) -> None:
        if self.journey_cap_usd <= 0:
            raise ModelRouteError("journey_cap_usd must be positive")
        if self.daily_cap_usd <= 0:
            raise ModelRouteError("daily_cap_usd must be positive")
        if not 0 < self.warning_ratio < 1:
            raise ModelRouteError("warning_ratio must be between 0 and 1")
        if self.daily_premium_quota <= 0:
            raise ModelRouteError("daily_premium_quota must be positive")


@dataclass(frozen=True)
class ModelRouteRequest:
    workflow_id: str
    stage: InferenceStage
    country_code: str
    risk_score: int
    confidence_score: float
    projected_tokens: int
    journey_spend_usd: float
    daily_spend_usd: float
    premium_escalations_today: int = 0
    policy_ambiguity: bool = False
    contradiction_unresolved: bool = False
    verifier_reject_count: int = 0


@dataclass(frozen=True)
class ModelRouteLog:
    workflow_id: str
    country_code: str
    stage: InferenceStage
    selected_tier: ModelTier | None
    selected_model: str | None
    decision: ModelRouteDecision
    reason_code: str
    projected_cost_usd: float
    journey_spend_after_usd: float
    daily_spend_after_usd: float
    budget_state: BudgetGuardrailState
    premium_escalated: bool


@dataclass(frozen=True)
class ModelRouteOutcome:
    selected_tier: ModelTier | None
    selected_model: str | None
    decision: ModelRouteDecision
    reason_code: str
    requires_human_review: bool
    budget_state: BudgetGuardrailState
    route_log: ModelRouteLog


@dataclass(frozen=True)
class _ModelProfile:
    tier: ModelTier
    model_name: str
    cost_per_1k_tokens_usd: float


DEFAULT_MODEL_PROFILES: dict[ModelTier, _ModelProfile] = {
    ModelTier.TIER_0: _ModelProfile(
        tier=ModelTier.TIER_0,
        model_name="oss-intent-fast",
        cost_per_1k_tokens_usd=0.02,
    ),
    ModelTier.TIER_1: _ModelProfile(
        tier=ModelTier.TIER_1,
        model_name="oss-reasoner-core",
        cost_per_1k_tokens_usd=0.08,
    ),
    ModelTier.TIER_2: _ModelProfile(
        tier=ModelTier.TIER_2,
        model_name="oss-verifier",
        cost_per_1k_tokens_usd=0.05,
    ),
    ModelTier.TIER_3: _ModelProfile(
        tier=ModelTier.TIER_3,
        model_name="premium-escalation",
        cost_per_1k_tokens_usd=0.4,
    ),
}


class ModelRouterGuardrails:
    """Routes inference calls with OSS-first selection and hard budget limits."""

    def __init__(
        self,
        *,
        budget_policy: ModelRouterBudgetPolicy | None = None,
        model_profiles: dict[ModelTier, _ModelProfile] | None = None,
    ) -> None:
        self._budget_policy = budget_policy or ModelRouterBudgetPolicy(
            journey_cap_usd=3.0,
            daily_cap_usd=50.0,
        )
        self._model_profiles = model_profiles or DEFAULT_MODEL_PROFILES

    def route(self, request: ModelRouteRequest) -> ModelRouteOutcome:
        self._validate_request(request)

        base_tier = self._base_tier_for(request.stage)
        premium_required = self._premium_required(request)
        budget_state = self._budget_state(request)

        if premium_required:
            premium_outcome = self._maybe_route_premium(request=request, budget_state=budget_state)
            if premium_outcome is not None:
                return premium_outcome

            return self._challenge(
                request=request,
                reason_code=self._budget_block_reason(budget_state),
                budget_state=budget_state,
                projected_cost_usd=self._projected_cost(ModelTier.TIER_3, request.projected_tokens),
            )

        selected_tier = self._apply_budget_downgrade(base_tier=base_tier, request=request)
        projected_cost_usd = self._projected_cost(selected_tier, request.projected_tokens)
        final_budget_state = self._resolve_final_budget_state(
            budget_state=budget_state,
            request=request,
            selected_tier=selected_tier,
        )

        if self._would_exceed_journey_cap(request, selected_tier):
            return self._challenge(
                request=request,
                reason_code="journey_budget_exceeded",
                budget_state=BudgetGuardrailState.JOURNEY_CAP_EXCEEDED,
                projected_cost_usd=projected_cost_usd,
            )

        if self._would_exceed_daily_cap(request, selected_tier):
            return self._challenge(
                request=request,
                reason_code="daily_budget_exceeded",
                budget_state=BudgetGuardrailState.DAILY_CAP_EXCEEDED,
                projected_cost_usd=projected_cost_usd,
            )

        return self._route(
            request=request,
            tier=selected_tier,
            reason_code=self._route_reason(selected_tier=selected_tier, base_tier=base_tier),
            budget_state=final_budget_state,
            projected_cost_usd=projected_cost_usd,
            premium_escalated=False,
        )

    def _maybe_route_premium(
        self,
        *,
        request: ModelRouteRequest,
        budget_state: BudgetGuardrailState,
    ) -> ModelRouteOutcome | None:
        if budget_state in {
            BudgetGuardrailState.DAILY_CAP_EXCEEDED,
            BudgetGuardrailState.JOURNEY_CAP_EXCEEDED,
            BudgetGuardrailState.PREMIUM_QUOTA_EXCEEDED,
            BudgetGuardrailState.DAILY_WARNING,
        }:
            return None
        if self._would_exceed_journey_cap(request, ModelTier.TIER_3):
            return None
        if self._would_exceed_daily_cap(request, ModelTier.TIER_3):
            return None

        return self._route(
            request=request,
            tier=ModelTier.TIER_3,
            reason_code="premium_escalation",
            budget_state=budget_state,
            projected_cost_usd=self._projected_cost(ModelTier.TIER_3, request.projected_tokens),
            premium_escalated=True,
        )

    def _route(
        self,
        *,
        request: ModelRouteRequest,
        tier: ModelTier,
        reason_code: str,
        budget_state: BudgetGuardrailState,
        projected_cost_usd: float,
        premium_escalated: bool,
    ) -> ModelRouteOutcome:
        model = self._model_profiles[tier]
        route_log = ModelRouteLog(
            workflow_id=request.workflow_id,
            country_code=request.country_code,
            stage=request.stage,
            selected_tier=tier,
            selected_model=model.model_name,
            decision=ModelRouteDecision.ROUTE,
            reason_code=reason_code,
            projected_cost_usd=projected_cost_usd,
            journey_spend_after_usd=request.journey_spend_usd + projected_cost_usd,
            daily_spend_after_usd=request.daily_spend_usd + projected_cost_usd,
            budget_state=budget_state,
            premium_escalated=premium_escalated,
        )
        return ModelRouteOutcome(
            selected_tier=tier,
            selected_model=model.model_name,
            decision=ModelRouteDecision.ROUTE,
            reason_code=reason_code,
            requires_human_review=False,
            budget_state=budget_state,
            route_log=route_log,
        )

    def _challenge(
        self,
        *,
        request: ModelRouteRequest,
        reason_code: str,
        budget_state: BudgetGuardrailState,
        projected_cost_usd: float,
    ) -> ModelRouteOutcome:
        route_log = ModelRouteLog(
            workflow_id=request.workflow_id,
            country_code=request.country_code,
            stage=request.stage,
            selected_tier=None,
            selected_model=None,
            decision=ModelRouteDecision.CHALLENGE,
            reason_code=reason_code,
            projected_cost_usd=projected_cost_usd,
            journey_spend_after_usd=request.journey_spend_usd,
            daily_spend_after_usd=request.daily_spend_usd,
            budget_state=budget_state,
            premium_escalated=False,
        )
        return ModelRouteOutcome(
            selected_tier=None,
            selected_model=None,
            decision=ModelRouteDecision.CHALLENGE,
            reason_code=reason_code,
            requires_human_review=True,
            budget_state=budget_state,
            route_log=route_log,
        )

    def _budget_state(self, request: ModelRouteRequest) -> BudgetGuardrailState:
        if request.premium_escalations_today >= self._budget_policy.daily_premium_quota:
            return BudgetGuardrailState.PREMIUM_QUOTA_EXCEEDED
        if request.journey_spend_usd >= self._budget_policy.journey_cap_usd:
            return BudgetGuardrailState.JOURNEY_CAP_EXCEEDED
        if request.daily_spend_usd >= self._budget_policy.daily_cap_usd:
            return BudgetGuardrailState.DAILY_CAP_EXCEEDED
        if request.daily_spend_usd >= self._budget_policy.daily_cap_usd * self._budget_policy.warning_ratio:
            return BudgetGuardrailState.DAILY_WARNING
        if request.journey_spend_usd >= (
            self._budget_policy.journey_cap_usd * self._budget_policy.warning_ratio
        ):
            return BudgetGuardrailState.JOURNEY_WARNING
        return BudgetGuardrailState.HEALTHY

    @staticmethod
    def _base_tier_for(stage: InferenceStage) -> ModelTier:
        if stage == InferenceStage.INTENT:
            return ModelTier.TIER_0
        if stage == InferenceStage.VERIFIER:
            return ModelTier.TIER_2
        return ModelTier.TIER_1

    @staticmethod
    def _premium_required(request: ModelRouteRequest) -> bool:
        return request.stage == InferenceStage.REASONING and request.risk_score >= 85 and (
            request.confidence_score < 0.75
            or request.policy_ambiguity
            or request.contradiction_unresolved
            or request.verifier_reject_count >= 2
        )

    def _apply_budget_downgrade(
        self,
        *,
        base_tier: ModelTier,
        request: ModelRouteRequest,
    ) -> ModelTier:
        if request.stage != InferenceStage.REASONING:
            return base_tier

        if request.daily_spend_usd >= self._budget_policy.daily_cap_usd * self._budget_policy.warning_ratio:
            return ModelTier.TIER_0
        if request.journey_spend_usd >= self._budget_policy.journey_cap_usd * self._budget_policy.warning_ratio:
            return ModelTier.TIER_0
        return base_tier

    def _resolve_final_budget_state(
        self,
        *,
        budget_state: BudgetGuardrailState,
        request: ModelRouteRequest,
        selected_tier: ModelTier,
    ) -> BudgetGuardrailState:
        if selected_tier == ModelTier.TIER_0 and budget_state in {
            BudgetGuardrailState.DAILY_WARNING,
            BudgetGuardrailState.JOURNEY_WARNING,
        }:
            return budget_state
        return budget_state

    def _projected_cost(self, tier: ModelTier, projected_tokens: int) -> float:
        profile = self._model_profiles[tier]
        return round((projected_tokens / 1000) * profile.cost_per_1k_tokens_usd, 4)

    def _would_exceed_journey_cap(self, request: ModelRouteRequest, tier: ModelTier) -> bool:
        projected_cost = self._projected_cost(tier, request.projected_tokens)
        return request.journey_spend_usd + projected_cost > self._budget_policy.journey_cap_usd

    def _would_exceed_daily_cap(self, request: ModelRouteRequest, tier: ModelTier) -> bool:
        projected_cost = self._projected_cost(tier, request.projected_tokens)
        return request.daily_spend_usd + projected_cost > self._budget_policy.daily_cap_usd

    @staticmethod
    def _route_reason(*, selected_tier: ModelTier, base_tier: ModelTier) -> str:
        if selected_tier != base_tier:
            return "budget_downgrade"
        return "oss_default"

    @staticmethod
    def _budget_block_reason(budget_state: BudgetGuardrailState) -> str:
        mapping = {
            BudgetGuardrailState.DAILY_WARNING: "premium_disabled_by_daily_budget_warning",
            BudgetGuardrailState.JOURNEY_CAP_EXCEEDED: "journey_budget_exceeded",
            BudgetGuardrailState.DAILY_CAP_EXCEEDED: "daily_budget_exceeded",
            BudgetGuardrailState.PREMIUM_QUOTA_EXCEEDED: "premium_quota_exceeded",
        }
        return mapping.get(budget_state, "premium_budget_blocked")

    @staticmethod
    def _validate_request(request: ModelRouteRequest) -> None:
        if not request.workflow_id.strip():
            raise ModelRouteError("workflow_id is required")
        if not request.country_code.strip():
            raise ModelRouteError("country_code is required")
        if not 0 <= request.risk_score <= 100:
            raise ModelRouteError("risk_score must be between 0 and 100")
        if not 0 <= request.confidence_score <= 1:
            raise ModelRouteError("confidence_score must be between 0 and 1")
        if request.projected_tokens <= 0:
            raise ModelRouteError("projected_tokens must be positive")
        if request.journey_spend_usd < 0:
            raise ModelRouteError("journey_spend_usd cannot be negative")
        if request.daily_spend_usd < 0:
            raise ModelRouteError("daily_spend_usd cannot be negative")
        if request.premium_escalations_today < 0:
            raise ModelRouteError("premium_escalations_today cannot be negative")
        if request.verifier_reject_count < 0:
            raise ModelRouteError("verifier_reject_count cannot be negative")
