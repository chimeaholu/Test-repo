from agro_v2.frontend_architecture_review_gate import (
    FrontendAdapterReview,
    FrontendArchitectureReviewGate,
    FrontendArchitectureReviewRequest,
    FrontendAutomationReview,
    FrontendBudgetReview,
    FrontendRouteBoundary,
)


def build_request(**overrides) -> FrontendArchitectureReviewRequest:
    payload = {
        "review_id": "f4-arch",
        "expected_routes": ("/app/home", "/app/listings", "/app/finance/queue"),
        "required_journey_ids": ("FJ-C01", "FJ-C07", "FJ-R05"),
        "required_mutation_actions": ("listing.publish", "finance.approve"),
        "route_boundaries": (
            FrontendRouteBoundary(
                route_name="/app/home",
                role="farmer",
                loader_name="load_home",
                adapter_name="FrontendContractAdapters",
                mutation_actions=("listing.publish",),
                source_bead_ids=("F-022", "F-023"),
            ),
            FrontendRouteBoundary(
                route_name="/app/listings",
                role="buyer",
                loader_name="load_listings",
                adapter_name="FrontendContractAdapters",
                mutation_actions=("listing.publish",),
                source_bead_ids=("F-022", "F-023"),
            ),
            FrontendRouteBoundary(
                route_name="/app/finance/queue",
                role="finance",
                loader_name="load_finance",
                adapter_name="FrontendContractAdapters",
                mutation_actions=("finance.approve",),
                source_bead_ids=("F-022", "F-023"),
            ),
        ),
        "adapter_reviews": (
            FrontendAdapterReview(
                adapter_name="FrontendContractAdapters",
                schema_version="frontend.dto.v1",
                supported_routes=("/app/home", "/app/listings", "/app/finance/queue"),
                typed_validation=True,
            ),
        ),
        "budget_reviews": (
            FrontendBudgetReview("/app/home", True, "PF-001"),
            FrontendBudgetReview("/app/listings", True, "PF-002"),
            FrontendBudgetReview("/app/finance/queue", True, "PF-003"),
        ),
        "automation_reviews": (
            FrontendAutomationReview("FJ-C01", "/app/home", True, ("mobile",)),
            FrontendAutomationReview("FJ-C07", "/app/finance/queue", True, ("desktop",)),
            FrontendAutomationReview("FJ-R05", "/app/finance/queue", True, ("desktop",)),
        ),
    }
    payload.update(overrides)
    return FrontendArchitectureReviewRequest(**payload)


def test_frontend_architecture_gate_passes_with_complete_frontend_package():
    outcome = FrontendArchitectureReviewGate().review(build_request())

    assert outcome.passed is True
    assert outcome.blocking_reason_codes == ()


def test_frontend_architecture_gate_fails_when_mutation_or_budget_is_missing():
    outcome = FrontendArchitectureReviewGate().review(
        build_request(
            budget_reviews=(
                FrontendBudgetReview("/app/home", True, "PF-001"),
                FrontendBudgetReview("/app/listings", False, "PF-002"),
                FrontendBudgetReview("/app/finance/queue", True, "PF-003"),
            ),
            route_boundaries=build_request().route_boundaries[:-1],
        )
    )

    assert outcome.passed is False
    assert "performance_budget_review_failed" in outcome.blocking_reason_codes
    assert "mutation_actions_missing" in outcome.blocking_reason_codes
