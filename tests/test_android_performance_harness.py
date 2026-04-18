import pytest

from agro_v2.android_performance_harness import (
    AndroidDataCheckId,
    AndroidJourneyId,
    AndroidMatrixId,
    AndroidPerformanceHarnessError,
    AndroidScenarioFixture,
    BackgroundProfile,
    NetworkProfile,
    PerformanceBudget,
    ScenarioObservation,
    build_default_android_harness,
)


def build_observation(
    matrix_id: AndroidMatrixId,
    **overrides,
) -> ScenarioObservation:
    payload = {
        "matrix_id": matrix_id,
        "p95_latency_ms": 1800,
        "payload_bytes": 180,
        "replay_success_rate": 1.0,
        "duplicate_commits": 0,
        "data_loss_count": 0,
        "background_resume_count": 2,
        "background_resume_success_count": 2,
        "conflict_resolution_ms": 1200,
        "journey_results": {
            AndroidJourneyId.ARJ_001: True,
            AndroidJourneyId.ARJ_002: True,
            AndroidJourneyId.ARJ_003: True,
            AndroidJourneyId.ARJ_004: True,
            AndroidJourneyId.ARJ_005: True,
            AndroidJourneyId.ARJ_006: True,
        },
        "data_check_results": {
            AndroidDataCheckId.ARDI_001: True,
            AndroidDataCheckId.ARDI_002: True,
            AndroidDataCheckId.ARDI_003: True,
            AndroidDataCheckId.ARDI_004: True,
            AndroidDataCheckId.ARDI_005: True,
        },
    }
    payload.update(overrides)
    return ScenarioObservation(**payload)


def test_default_harness_covers_full_android_matrix_and_readiness_obligations():
    harness = build_default_android_harness()

    assert [fixture.matrix_id for fixture in harness.fixtures] == [
        AndroidMatrixId.ARM_001,
        AndroidMatrixId.ARM_002,
        AndroidMatrixId.ARM_003,
        AndroidMatrixId.ARM_004,
    ]
    assert {
        journey for fixture in harness.fixtures for journey in fixture.required_journeys
    } == set(AndroidJourneyId)
    assert {
        check for fixture in harness.fixtures for check in fixture.required_data_checks
    } == set(AndroidDataCheckId)


def test_fixture_integrity_rejects_wrong_network_binding_for_arm001():
    fixtures = list(build_default_android_harness().fixtures)
    fixtures[0] = AndroidScenarioFixture(
        matrix_id=AndroidMatrixId.ARM_001,
        device_profile="broken",
        network_profile=NetworkProfile.STABLE_4G,
        background_profile=BackgroundProfile.INTERMITTENT_BACKGROUND,
        memory_class_gb=2,
        required_journeys=(AndroidJourneyId.ARJ_001, AndroidJourneyId.ARJ_002),
        required_data_checks=(AndroidDataCheckId.ARDI_001, AndroidDataCheckId.ARDI_002),
        budget=PerformanceBudget(max_p95_latency_ms=2200, max_payload_bytes=240),
    )

    with pytest.raises(AndroidPerformanceHarnessError, match="unstable 3G"):
        type(build_default_android_harness())(tuple(fixtures))


def test_harness_evaluate_passes_when_observation_stays_within_budget():
    harness = build_default_android_harness()

    evaluation = harness.evaluate(build_observation(AndroidMatrixId.ARM_004))

    assert evaluation.matrix_id == AndroidMatrixId.ARM_004
    assert evaluation.passed is True
    assert evaluation.failed_checks == ()


def test_harness_evaluate_flags_budget_and_coverage_failures():
    harness = build_default_android_harness()

    evaluation = harness.evaluate(
        build_observation(
            AndroidMatrixId.ARM_004,
            p95_latency_ms=2700,
            conflict_resolution_ms=2200,
            journey_results={
                AndroidJourneyId.ARJ_001: True,
                AndroidJourneyId.ARJ_002: True,
                AndroidJourneyId.ARJ_003: False,
                AndroidJourneyId.ARJ_004: True,
                AndroidJourneyId.ARJ_005: True,
                AndroidJourneyId.ARJ_006: True,
            },
            data_check_results={
                AndroidDataCheckId.ARDI_001: True,
                AndroidDataCheckId.ARDI_002: True,
                AndroidDataCheckId.ARDI_003: True,
                AndroidDataCheckId.ARDI_004: False,
                AndroidDataCheckId.ARDI_005: True,
            },
        )
    )

    assert evaluation.passed is False
    assert "journey_failed:ARJ-003" in evaluation.failed_checks
    assert "data_check_failed:ARDI-004" in evaluation.failed_checks
    assert "latency_budget_exceeded" in evaluation.failed_checks
    assert "conflict_resolution_budget_exceeded" in evaluation.failed_checks


def test_harness_suite_requires_full_fixture_set_and_reports_global_pass():
    harness = build_default_android_harness()

    suite = harness.evaluate_suite(
        (
            build_observation(AndroidMatrixId.ARM_001, replay_success_rate=0.995),
            build_observation(AndroidMatrixId.ARM_002),
            build_observation(AndroidMatrixId.ARM_003, payload_bytes=220),
            build_observation(AndroidMatrixId.ARM_004),
        )
    )

    assert suite.passed is True
    assert set(suite.covered_journeys) == set(AndroidJourneyId)
    assert set(suite.covered_data_checks) == set(AndroidDataCheckId)

    with pytest.raises(AndroidPerformanceHarnessError, match="one result per canonical matrix"):
        harness.evaluate_suite(
            (
                build_observation(AndroidMatrixId.ARM_001),
                build_observation(AndroidMatrixId.ARM_002),
            )
        )


def test_background_resume_loss_and_duplicate_commits_fail_low_end_scenario():
    harness = build_default_android_harness()

    evaluation = harness.evaluate(
        build_observation(
            AndroidMatrixId.ARM_001,
            replay_success_rate=0.95,
            duplicate_commits=1,
            background_resume_count=3,
            background_resume_success_count=2,
        )
    )

    assert evaluation.passed is False
    assert "replay_success_below_target" in evaluation.failed_checks
    assert "duplicate_commit_budget_exceeded" in evaluation.failed_checks
    assert "background_resume_loss" in evaluation.failed_checks

