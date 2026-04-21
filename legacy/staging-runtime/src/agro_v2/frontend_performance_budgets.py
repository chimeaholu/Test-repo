"""F-024 frontend route budget instrumentation and low-end readiness checks."""

from __future__ import annotations

from dataclasses import dataclass

from .mobile_api_profile import MobileApiProfileRegistry, MobileApiProfileError


class FrontendPerformanceBudgetError(ValueError):
    """Raised when route budgets or observations are invalid."""


@dataclass(frozen=True)
class FrontendRouteBudget:
    route_name: str
    endpoint_name: str
    max_payload_bytes: int
    max_render_latency_ms: int
    max_hydration_latency_ms: int
    min_cache_hit_ratio: float
    min_replay_success_rate: float
    max_duplicate_commits: int
    shell_route: str = "/app/home"

    def __post_init__(self) -> None:
        if not self.route_name.startswith("/app/"):
            raise FrontendPerformanceBudgetError("route_name must live under /app")
        if not self.endpoint_name.strip():
            raise FrontendPerformanceBudgetError("endpoint_name is required")
        if self.max_payload_bytes <= 0:
            raise FrontendPerformanceBudgetError("max_payload_bytes must be greater than zero")
        if self.max_render_latency_ms <= 0 or self.max_hydration_latency_ms <= 0:
            raise FrontendPerformanceBudgetError("latency budgets must be greater than zero")
        if not 0 <= self.min_cache_hit_ratio <= 1:
            raise FrontendPerformanceBudgetError("min_cache_hit_ratio must be between 0 and 1")
        if not 0 <= self.min_replay_success_rate <= 1:
            raise FrontendPerformanceBudgetError(
                "min_replay_success_rate must be between 0 and 1"
            )
        if self.max_duplicate_commits < 0:
            raise FrontendPerformanceBudgetError("max_duplicate_commits must be >= 0")


@dataclass(frozen=True)
class FrontendRouteObservation:
    route_name: str
    payload: dict[str, object]
    render_latency_ms: int
    hydration_latency_ms: int
    cache_hit_ratio: float
    replay_success_rate: float
    duplicate_commits: int
    shell_route: str

    def __post_init__(self) -> None:
        if not self.route_name.startswith("/app/"):
            raise FrontendPerformanceBudgetError("route_name must live under /app")
        if self.render_latency_ms < 0 or self.hydration_latency_ms < 0:
            raise FrontendPerformanceBudgetError("latency values must be >= 0")
        if not 0 <= self.cache_hit_ratio <= 1:
            raise FrontendPerformanceBudgetError("cache_hit_ratio must be between 0 and 1")
        if not 0 <= self.replay_success_rate <= 1:
            raise FrontendPerformanceBudgetError("replay_success_rate must be between 0 and 1")
        if self.duplicate_commits < 0:
            raise FrontendPerformanceBudgetError("duplicate_commits must be >= 0")


@dataclass(frozen=True)
class FrontendBudgetEvaluation:
    route_name: str
    passed: bool
    payload_bytes: int
    failed_checks: tuple[str, ...]
    data_check_id: str
    metadata: dict[str, object]


class FrontendPerformanceBudgetHarness:
    """Enforces mobile payload, render, and offline budget thresholds per route."""

    def __init__(
        self,
        *,
        profile_registry: MobileApiProfileRegistry,
        profile_version: str,
    ) -> None:
        self._profile_registry = profile_registry
        self._profile_version = profile_version
        self._budgets: dict[str, FrontendRouteBudget] = {}

    def register_budget(self, budget: FrontendRouteBudget) -> None:
        if budget.route_name in self._budgets:
            raise FrontendPerformanceBudgetError(
                f"budget already registered for route: {budget.route_name}"
            )
        self._budgets[budget.route_name] = budget

    def evaluate(self, observation: FrontendRouteObservation) -> FrontendBudgetEvaluation:
        budget = self._budgets.get(observation.route_name)
        if budget is None:
            raise FrontendPerformanceBudgetError(
                f"budget not registered for route: {observation.route_name}"
            )
        failed_checks: list[str] = []
        try:
            budget_result = self._profile_registry.assert_payload_budget(
                version=self._profile_version,
                endpoint_name=budget.endpoint_name,
                payload=observation.payload,
            )
            payload_bytes = budget_result.size_bytes
        except MobileApiProfileError:
            payload_bytes = 0
            failed_checks.append("payload_budget_exceeded")
        else:
            if payload_bytes > budget.max_payload_bytes:
                failed_checks.append("payload_budget_exceeded")

        if observation.render_latency_ms > budget.max_render_latency_ms:
            failed_checks.append("render_budget_exceeded")
        if observation.hydration_latency_ms > budget.max_hydration_latency_ms:
            failed_checks.append("hydration_budget_exceeded")
        if observation.cache_hit_ratio < budget.min_cache_hit_ratio:
            failed_checks.append("cache_hit_ratio_below_budget")
        if observation.replay_success_rate < budget.min_replay_success_rate:
            failed_checks.append("replay_success_rate_below_budget")
        if observation.duplicate_commits > budget.max_duplicate_commits:
            failed_checks.append("duplicate_commit_budget_exceeded")
        if observation.shell_route != budget.shell_route:
            failed_checks.append("shell_route_mismatch")

        return FrontendBudgetEvaluation(
            route_name=observation.route_name,
            passed=not failed_checks,
            payload_bytes=payload_bytes,
            failed_checks=tuple(failed_checks),
            data_check_id="PF-004",
            metadata={
                "endpoint_name": budget.endpoint_name,
                "render_latency_ms": observation.render_latency_ms,
                "hydration_latency_ms": observation.hydration_latency_ms,
                "cache_hit_ratio": observation.cache_hit_ratio,
                "replay_success_rate": observation.replay_success_rate,
            },
        )
