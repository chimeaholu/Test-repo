from agro_v2.frontend_performance_budgets import (
    FrontendPerformanceBudgetHarness,
    FrontendRouteBudget,
    FrontendRouteObservation,
)
from agro_v2.mobile_api_profile import (
    MobileApiProfile,
    MobileApiProfileRegistry,
    PaginationPolicy,
    PayloadBudget,
)


def build_registry() -> MobileApiProfileRegistry:
    registry = MobileApiProfileRegistry()
    registry.register(
        MobileApiProfile(
            version="frontend.v1",
            payload_budgets=(PayloadBudget("frontend.home.loader", max_bytes=320),),
            pagination=PaginationPolicy(default_page_size=10, max_page_size=25),
            resumable_operations=(),
        )
    )
    return registry


def test_budget_harness_passes_within_mobile_and_render_budgets():
    harness = FrontendPerformanceBudgetHarness(
        profile_registry=build_registry(),
        profile_version="frontend.v1",
    )
    harness.register_budget(
        FrontendRouteBudget(
            route_name="/app/home",
            endpoint_name="frontend.home.loader",
            max_payload_bytes=320,
            max_render_latency_ms=900,
            max_hydration_latency_ms=1200,
            min_cache_hit_ratio=0.5,
            min_replay_success_rate=0.99,
            max_duplicate_commits=0,
        )
    )

    evaluation = harness.evaluate(
        FrontendRouteObservation(
            route_name="/app/home",
            payload={"hero_title": "Farmer priorities", "cards": [{"id": "1"}]},
            render_latency_ms=480,
            hydration_latency_ms=620,
            cache_hit_ratio=0.72,
            replay_success_rate=1.0,
            duplicate_commits=0,
            shell_route="/app/home",
        )
    )

    assert evaluation.passed is True
    assert evaluation.failed_checks == ()


def test_budget_harness_flags_payload_and_shell_regressions():
    harness = FrontendPerformanceBudgetHarness(
        profile_registry=build_registry(),
        profile_version="frontend.v1",
    )
    harness.register_budget(
        FrontendRouteBudget(
            route_name="/app/home",
            endpoint_name="frontend.home.loader",
            max_payload_bytes=160,
            max_render_latency_ms=200,
            max_hydration_latency_ms=200,
            min_cache_hit_ratio=0.9,
            min_replay_success_rate=1.0,
            max_duplicate_commits=0,
        )
    )

    evaluation = harness.evaluate(
        FrontendRouteObservation(
            route_name="/app/home",
            payload={"hero_title": "Farmer priorities", "cards": [{"id": "1", "copy": "x" * 300}]},
            render_latency_ms=480,
            hydration_latency_ms=620,
            cache_hit_ratio=0.4,
            replay_success_rate=0.8,
            duplicate_commits=1,
            shell_route="/app/listings",
        )
    )

    assert evaluation.passed is False
    assert "payload_budget_exceeded" in evaluation.failed_checks
    assert "shell_route_mismatch" in evaluation.failed_checks
