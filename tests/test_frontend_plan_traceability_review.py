from agro_v2.frontend_plan_traceability_review import (
    FrontendBeadTrace,
    FrontendPlanTraceabilityRequest,
    FrontendPlanTraceabilityReview,
)


def build_request(**overrides) -> FrontendPlanTraceabilityRequest:
    payload = {
        "review_id": "f4-trace",
        "expected_bead_ids": ("F-022", "F-023", "F-024"),
        "known_dependency_ids": ("F-022", "F-023", "F-024", "B-039", "B-044"),
        "bead_traces": (
            FrontendBeadTrace(
                bead_id="F-022",
                title="Contract adapter package",
                dependency_ids=("B-039",),
                module_path="src/agro_v2/frontend_contract_adapters.py",
                test_files=("tests/test_frontend_contract_adapters.py",),
                review_artifacts=("execution/reviews/f4-arch.md",),
                journey_ids=("FJ-C01",),
                scope_summary="typed DTO adapters",
            ),
            FrontendBeadTrace(
                bead_id="F-023",
                title="Route loader and mutation services",
                dependency_ids=("F-022",),
                module_path="src/agro_v2/frontend_route_services.py",
                test_files=("tests/test_frontend_route_services.py",),
                review_artifacts=("execution/reviews/f4-arch.md",),
                journey_ids=("FJ-C02",),
                scope_summary="route transport layer",
            ),
            FrontendBeadTrace(
                bead_id="F-024",
                title="Performance instrumentation and budgets",
                dependency_ids=("B-039", "B-044"),
                module_path="src/agro_v2/frontend_performance_budgets.py",
                test_files=("tests/test_frontend_performance_budgets.py",),
                review_artifacts=("execution/reviews/f4-arch.md",),
                journey_ids=("FJ-R05",),
                scope_summary="budget checks",
            ),
        ),
    }
    payload.update(overrides)
    return FrontendPlanTraceabilityRequest(**payload)


def test_frontend_plan_traceability_review_passes_for_complete_package():
    outcome = FrontendPlanTraceabilityReview().review(build_request())

    assert outcome.passed is True
    assert outcome.plan_alignment_gaps == {}


def test_frontend_plan_traceability_review_flags_missing_tests_and_dependencies():
    outcome = FrontendPlanTraceabilityReview().review(
        build_request(
            bead_traces=(
                FrontendBeadTrace(
                    bead_id="F-022",
                    title="Contract adapter package",
                    dependency_ids=("B-999",),
                    module_path="src/agro_v2/frontend_contract_adapters.py",
                    test_files=(),
                    review_artifacts=("execution/reviews/f4-arch.md",),
                    journey_ids=(),
                    scope_summary="typed DTO adapters",
                ),
            )
        )
    )

    assert outcome.passed is False
    assert outcome.missing_bead_ids == ("F-023", "F-024")
    assert outcome.unknown_dependency_ids == ("B-999",)
    assert outcome.missing_test_bead_ids == ("F-022",)
    assert outcome.plan_alignment_gaps["F-022"] == ("journey_ids",)
