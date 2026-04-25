import pytest

from agro_v2.android_mobile_ux_harness import (
    AndroidMobileUxHarnessError,
    AndroidUxScenarioFixture,
    AndroidUxScenarioId,
    AndroidUxScenarioObservation,
    AndroidUxStateObservation,
    build_default_android_mobile_ux_harness,
)
from agro_v2.android_performance_harness import (
    AndroidDataCheckId,
    AndroidJourneyId,
    AndroidMatrixId,
    ScenarioObservation,
)
from agro_v2.interaction_feedback_library import CriticalFlow, InteractionState


def build_performance_observation(matrix_id: AndroidMatrixId, **overrides) -> ScenarioObservation:
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


def build_state_observation(state: InteractionState, **overrides) -> AndroidUxStateObservation:
    payload = {
        "state": state,
        "reading_grade": 5.0,
        "primary_action_words": 2,
        "step_count": 3,
        "trust_marker_count": 2 if state == InteractionState.TRUST else 0,
        "offline_handoff_present": state not in {InteractionState.OFFLINE, InteractionState.RETRY},
    }
    payload.update(overrides)
    return AndroidUxStateObservation(**payload)


def test_default_harness_covers_all_matrix_ids_and_flows():
    harness = build_default_android_mobile_ux_harness()
    snapshot = harness.fixture_snapshot()

    assert snapshot["scenario_ids"] == ["UXA-001", "UXA-002", "UXA-003", "UXA-004"]
    assert snapshot["matrix_ids"] == ["ARM-001", "ARM-002", "ARM-003", "ARM-004"]
    assert set(snapshot["flows"]) == {
        "listing_create",
        "negotiation_reply",
        "settlement_status",
        "offline_sync",
    }


def test_fixture_integrity_rejects_duplicate_matrix_coverage():
    harness = build_default_android_mobile_ux_harness()
    fixtures = list(harness.fixtures)
    fixtures[1] = AndroidUxScenarioFixture(
        scenario_id=AndroidUxScenarioId.UXA_002,
        matrix_id=AndroidMatrixId.ARM_001,
        flow=CriticalFlow.NEGOTIATION_REPLY,
        required_states=(
            InteractionState.LOADING,
            InteractionState.ERROR,
            InteractionState.TRUST,
        ),
        max_reading_grade=6.0,
        max_primary_action_words=2,
        max_step_count=4,
        min_trust_marker_count=2,
        require_offline_handoff=False,
    )

    with pytest.raises(AndroidMobileUxHarnessError, match="duplicate matrix coverage"):
        type(harness)(
            performance_harness=harness.performance_harness,
            interaction_library=harness.interaction_library,
            fixtures=tuple(fixtures),
        )


def test_evaluate_passes_when_performance_and_clarity_checks_hold():
    harness = build_default_android_mobile_ux_harness()

    evaluation = harness.evaluate(
        AndroidUxScenarioObservation(
            scenario_id=AndroidUxScenarioId.UXA_004,
            performance_observation=build_performance_observation(AndroidMatrixId.ARM_004),
            state_observations={
                InteractionState.OFFLINE: build_state_observation(
                    InteractionState.OFFLINE,
                    offline_handoff_present=True,
                ),
                InteractionState.RETRY: build_state_observation(
                    InteractionState.RETRY,
                    offline_handoff_present=True,
                ),
                InteractionState.TRUST: build_state_observation(
                    InteractionState.TRUST,
                    trust_marker_count=2,
                ),
            },
        )
    )

    assert evaluation.passed is True
    assert evaluation.failed_checks == ()
    assert evaluation.ux_journey_id == "UXJ-005"
    assert evaluation.ux_data_check_id == "UXDI-004"


def test_evaluate_flags_performance_and_copy_regressions():
    harness = build_default_android_mobile_ux_harness()

    evaluation = harness.evaluate(
        AndroidUxScenarioObservation(
            scenario_id=AndroidUxScenarioId.UXA_003,
            performance_observation=build_performance_observation(
                AndroidMatrixId.ARM_003,
                payload_bytes=400,
                replay_success_rate=0.9,
            ),
            state_observations={
                InteractionState.LOADING: build_state_observation(
                    InteractionState.LOADING,
                    reading_grade=6.2,
                ),
                InteractionState.RETRY: build_state_observation(
                    InteractionState.RETRY,
                    primary_action_words=4,
                    offline_handoff_present=False,
                ),
                InteractionState.TRUST: build_state_observation(
                    InteractionState.TRUST,
                    step_count=5,
                    trust_marker_count=1,
                ),
            },
        )
    )

    assert evaluation.passed is False
    assert "performance:payload_budget_exceeded" in evaluation.failed_checks
    assert "performance:replay_success_below_target" in evaluation.failed_checks
    assert "reading_grade_too_high:loading" in evaluation.failed_checks
    assert "primary_action_too_long:retry" in evaluation.failed_checks
    assert "offline_handoff_missing:retry" in evaluation.failed_checks
    assert "step_count_too_high:trust" in evaluation.failed_checks
    assert "trust_marker_count_too_low" in evaluation.failed_checks


def test_evaluate_suite_requires_all_canonical_scenarios():
    harness = build_default_android_mobile_ux_harness()

    with pytest.raises(
        AndroidMobileUxHarnessError,
        match="one result per canonical UX scenario fixture",
    ):
        harness.evaluate_suite(
            (
                AndroidUxScenarioObservation(
                    scenario_id=AndroidUxScenarioId.UXA_001,
                    performance_observation=build_performance_observation(AndroidMatrixId.ARM_001),
                    state_observations={
                        InteractionState.LOADING: build_state_observation(InteractionState.LOADING),
                        InteractionState.OFFLINE: build_state_observation(
                            InteractionState.OFFLINE,
                            offline_handoff_present=True,
                        ),
                        InteractionState.RETRY: build_state_observation(
                            InteractionState.RETRY,
                            offline_handoff_present=True,
                        ),
                    },
                ),
            )
        )
