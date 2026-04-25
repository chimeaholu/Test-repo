from agro_v2.frontend_playwright_harness import (
    FrontendPlaywrightHarness,
    FrontendPlaywrightObservation,
)


def test_default_suite_covers_all_frontend_journeys():
    suite = FrontendPlaywrightHarness().build_default_suite()

    journey_ids = {scenario.journey_id for scenario in suite}
    assert len(suite) == 21
    assert {"FJ-C01", "FJ-C08", "FJ-R05", "FJ-E06", "FJ-D06"} <= journey_ids


def test_evaluate_flags_console_errors_and_missing_data_references():
    harness = FrontendPlaywrightHarness()
    observations = tuple(
        FrontendPlaywrightObservation(
            scenario_id=scenario.scenario_id,
            passed=True,
            screenshot_path=f"artifacts/{scenario.scenario_id}.png",
            console_errors=(),
            network_error_count=0,
            data_reference_ids=("ref-1",) if scenario.required_data_reference else (),
            latency_ms=500,
        )
        for scenario in harness.build_default_suite()
    )
    failing = list(observations)
    failing[6] = FrontendPlaywrightObservation(
        scenario_id="fj-c07-desktop",
        passed=True,
        screenshot_path="artifacts/fj-c07-desktop.png",
        console_errors=("hydration failed",),
        network_error_count=0,
        data_reference_ids=(),
        latency_ms=700,
    )

    report = harness.evaluate(tuple(failing))

    assert report.passed is False
    assert report.failed_scenario_ids == ("fj-c07-desktop",)
