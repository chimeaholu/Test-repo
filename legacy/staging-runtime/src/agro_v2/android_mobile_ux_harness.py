"""B-053 low-end Android mobile UX polish harness."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .android_performance_harness import (
    AndroidMatrixId,
    LowEndAndroidPerformanceHarness,
    ScenarioObservation,
    build_default_android_harness,
)
from .interaction_feedback_library import (
    CriticalFlow,
    InteractionFeedbackLibrary,
    InteractionState,
    build_default_interaction_feedback_library,
)


class AndroidMobileUxHarnessError(ValueError):
    """Raised when low-end Android UX fixtures or observations are invalid."""


class AndroidUxScenarioId(str, Enum):
    UXA_001 = "UXA-001"
    UXA_002 = "UXA-002"
    UXA_003 = "UXA-003"
    UXA_004 = "UXA-004"


@dataclass(frozen=True)
class AndroidUxStateObservation:
    state: InteractionState
    reading_grade: float
    primary_action_words: int
    step_count: int
    trust_marker_count: int
    offline_handoff_present: bool

    def __post_init__(self) -> None:
        if self.reading_grade < 0:
            raise AndroidMobileUxHarnessError("reading_grade must be >= 0")
        if self.primary_action_words <= 0:
            raise AndroidMobileUxHarnessError("primary_action_words must be greater than zero")
        if self.step_count <= 0:
            raise AndroidMobileUxHarnessError("step_count must be greater than zero")
        if self.trust_marker_count < 0:
            raise AndroidMobileUxHarnessError("trust_marker_count must be >= 0")


@dataclass(frozen=True)
class AndroidUxScenarioFixture:
    scenario_id: AndroidUxScenarioId
    matrix_id: AndroidMatrixId
    flow: CriticalFlow
    required_states: tuple[InteractionState, ...]
    max_reading_grade: float
    max_primary_action_words: int
    max_step_count: int
    min_trust_marker_count: int
    require_offline_handoff: bool

    def __post_init__(self) -> None:
        if not self.required_states:
            raise AndroidMobileUxHarnessError("required_states must not be empty")
        if self.max_reading_grade <= 0:
            raise AndroidMobileUxHarnessError("max_reading_grade must be greater than zero")
        if self.max_primary_action_words <= 0:
            raise AndroidMobileUxHarnessError(
                "max_primary_action_words must be greater than zero"
            )
        if self.max_step_count <= 0:
            raise AndroidMobileUxHarnessError("max_step_count must be greater than zero")
        if self.min_trust_marker_count < 0:
            raise AndroidMobileUxHarnessError("min_trust_marker_count must be >= 0")


@dataclass(frozen=True)
class AndroidUxScenarioObservation:
    scenario_id: AndroidUxScenarioId
    performance_observation: ScenarioObservation
    state_observations: dict[InteractionState, AndroidUxStateObservation]

    def __post_init__(self) -> None:
        if not self.state_observations:
            raise AndroidMobileUxHarnessError("state_observations must not be empty")


@dataclass(frozen=True)
class AndroidUxScenarioEvaluation:
    scenario_id: AndroidUxScenarioId
    matrix_id: AndroidMatrixId
    flow: CriticalFlow
    passed: bool
    failed_checks: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


@dataclass(frozen=True)
class AndroidUxSuiteReport:
    passed: bool
    evaluations: tuple[AndroidUxScenarioEvaluation, ...]
    covered_matrix_ids: tuple[AndroidMatrixId, ...]
    covered_flows: tuple[CriticalFlow, ...]


class LowEndAndroidMobileUxHarness:
    """Combines Android performance readiness with low-end UX clarity checks."""

    def __init__(
        self,
        *,
        performance_harness: LowEndAndroidPerformanceHarness,
        interaction_library: InteractionFeedbackLibrary,
        fixtures: tuple[AndroidUxScenarioFixture, ...],
    ) -> None:
        if not fixtures:
            raise AndroidMobileUxHarnessError("fixtures must not be empty")
        self.performance_harness = performance_harness
        self.interaction_library = interaction_library
        self._fixtures = fixtures
        self.validate_fixture_integrity()

    @property
    def fixtures(self) -> tuple[AndroidUxScenarioFixture, ...]:
        return self._fixtures

    def validate_fixture_integrity(self) -> None:
        seen_scenarios: set[AndroidUxScenarioId] = set()
        seen_matrices: set[AndroidMatrixId] = set()

        for fixture in self._fixtures:
            if fixture.scenario_id in seen_scenarios:
                raise AndroidMobileUxHarnessError(
                    f"duplicate UX scenario fixture: {fixture.scenario_id.value}"
                )
            if fixture.matrix_id in seen_matrices:
                raise AndroidMobileUxHarnessError(
                    f"duplicate matrix coverage: {fixture.matrix_id.value}"
                )
            seen_scenarios.add(fixture.scenario_id)
            seen_matrices.add(fixture.matrix_id)

            for state in fixture.required_states:
                self.interaction_library.resolve(flow=fixture.flow, state=state)

        if seen_scenarios != set(AndroidUxScenarioId):
            raise AndroidMobileUxHarnessError("fixture set must cover UXA-001 through UXA-004")
        if seen_matrices != set(AndroidMatrixId):
            raise AndroidMobileUxHarnessError("fixture set must cover ARM-001 through ARM-004")

    def evaluate(self, observation: AndroidUxScenarioObservation) -> AndroidUxScenarioEvaluation:
        fixture = self._get_fixture(observation.scenario_id)
        failed_checks: list[str] = []

        if observation.performance_observation.matrix_id != fixture.matrix_id:
            raise AndroidMobileUxHarnessError("performance observation matrix does not match fixture")

        performance_evaluation = self.performance_harness.evaluate(observation.performance_observation)
        if not performance_evaluation.passed:
            failed_checks.extend(
                f"performance:{check}" for check in performance_evaluation.failed_checks
            )

        for state in fixture.required_states:
            state_observation = observation.state_observations.get(state)
            if state_observation is None:
                failed_checks.append(f"missing_state:{state.value}")
                continue

            if state_observation.reading_grade > fixture.max_reading_grade:
                failed_checks.append(f"reading_grade_too_high:{state.value}")
            if state_observation.primary_action_words > fixture.max_primary_action_words:
                failed_checks.append(f"primary_action_too_long:{state.value}")
            if state_observation.step_count > fixture.max_step_count:
                failed_checks.append(f"step_count_too_high:{state.value}")
            if (
                state == InteractionState.TRUST
                and state_observation.trust_marker_count < fixture.min_trust_marker_count
            ):
                failed_checks.append("trust_marker_count_too_low")
            if (
                fixture.require_offline_handoff
                and state in {InteractionState.OFFLINE, InteractionState.RETRY}
                and not state_observation.offline_handoff_present
            ):
                failed_checks.append(f"offline_handoff_missing:{state.value}")

        return AndroidUxScenarioEvaluation(
            scenario_id=fixture.scenario_id,
            matrix_id=fixture.matrix_id,
            flow=fixture.flow,
            passed=not failed_checks,
            failed_checks=tuple(failed_checks),
            ux_journey_id="UXJ-005",
            ux_data_check_id="UXDI-004",
        )

    def evaluate_suite(
        self,
        observations: tuple[AndroidUxScenarioObservation, ...],
    ) -> AndroidUxSuiteReport:
        if len(observations) != len(self._fixtures):
            raise AndroidMobileUxHarnessError(
                "observations must include one result per canonical UX scenario fixture"
            )
        evaluations = tuple(self.evaluate(observation) for observation in observations)
        return AndroidUxSuiteReport(
            passed=all(item.passed for item in evaluations),
            evaluations=evaluations,
            covered_matrix_ids=tuple(sorted({item.matrix_id for item in evaluations}, key=str)),
            covered_flows=tuple(sorted({item.flow for item in evaluations}, key=str)),
        )

    def fixture_snapshot(self) -> dict[str, object]:
        return {
            "scenario_ids": [fixture.scenario_id.value for fixture in self._fixtures],
            "matrix_ids": [fixture.matrix_id.value for fixture in self._fixtures],
            "flows": [fixture.flow.value for fixture in self._fixtures],
        }

    def _get_fixture(self, scenario_id: AndroidUxScenarioId) -> AndroidUxScenarioFixture:
        for fixture in self._fixtures:
            if fixture.scenario_id == scenario_id:
                return fixture
        raise AndroidMobileUxHarnessError(f"unknown UX scenario fixture: {scenario_id.value}")


def build_default_android_mobile_ux_harness() -> LowEndAndroidMobileUxHarness:
    return LowEndAndroidMobileUxHarness(
        performance_harness=build_default_android_harness(),
        interaction_library=build_default_interaction_feedback_library(),
        fixtures=(
            AndroidUxScenarioFixture(
                scenario_id=AndroidUxScenarioId.UXA_001,
                matrix_id=AndroidMatrixId.ARM_001,
                flow=CriticalFlow.LISTING_CREATE,
                required_states=(
                    InteractionState.LOADING,
                    InteractionState.OFFLINE,
                    InteractionState.RETRY,
                ),
                max_reading_grade=6.0,
                max_primary_action_words=2,
                max_step_count=3,
                min_trust_marker_count=0,
                require_offline_handoff=True,
            ),
            AndroidUxScenarioFixture(
                scenario_id=AndroidUxScenarioId.UXA_002,
                matrix_id=AndroidMatrixId.ARM_002,
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
            ),
            AndroidUxScenarioFixture(
                scenario_id=AndroidUxScenarioId.UXA_003,
                matrix_id=AndroidMatrixId.ARM_003,
                flow=CriticalFlow.SETTLEMENT_STATUS,
                required_states=(
                    InteractionState.LOADING,
                    InteractionState.RETRY,
                    InteractionState.TRUST,
                ),
                max_reading_grade=5.5,
                max_primary_action_words=2,
                max_step_count=3,
                min_trust_marker_count=2,
                require_offline_handoff=True,
            ),
            AndroidUxScenarioFixture(
                scenario_id=AndroidUxScenarioId.UXA_004,
                matrix_id=AndroidMatrixId.ARM_004,
                flow=CriticalFlow.OFFLINE_SYNC,
                required_states=(
                    InteractionState.OFFLINE,
                    InteractionState.RETRY,
                    InteractionState.TRUST,
                ),
                max_reading_grade=5.5,
                max_primary_action_words=2,
                max_step_count=3,
                min_trust_marker_count=2,
                require_offline_handoff=True,
            ),
        ),
    )
