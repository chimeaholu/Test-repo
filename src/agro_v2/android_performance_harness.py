"""B-044 low-end Android performance budget harness."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class AndroidPerformanceHarnessError(ValueError):
    """Raised when Android harness fixtures or observations are invalid."""


class AndroidMatrixId(str, Enum):
    ARM_001 = "ARM-001"
    ARM_002 = "ARM-002"
    ARM_003 = "ARM-003"
    ARM_004 = "ARM-004"


class AndroidJourneyId(str, Enum):
    ARJ_001 = "ARJ-001"
    ARJ_002 = "ARJ-002"
    ARJ_003 = "ARJ-003"
    ARJ_004 = "ARJ-004"
    ARJ_005 = "ARJ-005"
    ARJ_006 = "ARJ-006"


class AndroidDataCheckId(str, Enum):
    ARDI_001 = "ARDI-001"
    ARDI_002 = "ARDI-002"
    ARDI_003 = "ARDI-003"
    ARDI_004 = "ARDI-004"
    ARDI_005 = "ARDI-005"


class NetworkProfile(str, Enum):
    STABLE_4G = "stable_4g"
    UNSTABLE_3G = "unstable_3g"
    PACKET_LOSS = "packet_loss"
    SIGNAL_TRANSITIONS = "signal_transitions"


class BackgroundProfile(str, Enum):
    FOREGROUND_ONLY = "foreground_only"
    INTERMITTENT_BACKGROUND = "intermittent_background"
    SUSPENDED_RESUME = "suspended_resume"


@dataclass(frozen=True)
class PerformanceBudget:
    max_p95_latency_ms: int
    max_payload_bytes: int
    min_replay_success_rate: float = 1.0
    max_duplicate_commits: int = 0
    max_data_loss_count: int = 0
    max_conflict_resolution_ms: int | None = None

    def __post_init__(self) -> None:
        if self.max_p95_latency_ms <= 0:
            raise AndroidPerformanceHarnessError("max_p95_latency_ms must be greater than zero")
        if self.max_payload_bytes <= 0:
            raise AndroidPerformanceHarnessError("max_payload_bytes must be greater than zero")
        if not 0 <= self.min_replay_success_rate <= 1:
            raise AndroidPerformanceHarnessError(
                "min_replay_success_rate must be between 0 and 1"
            )
        if self.max_duplicate_commits < 0:
            raise AndroidPerformanceHarnessError("max_duplicate_commits must be >= 0")
        if self.max_data_loss_count < 0:
            raise AndroidPerformanceHarnessError("max_data_loss_count must be >= 0")
        if self.max_conflict_resolution_ms is not None and self.max_conflict_resolution_ms <= 0:
            raise AndroidPerformanceHarnessError(
                "max_conflict_resolution_ms must be greater than zero"
            )


@dataclass(frozen=True)
class AndroidScenarioFixture:
    matrix_id: AndroidMatrixId
    device_profile: str
    network_profile: NetworkProfile
    background_profile: BackgroundProfile
    memory_class_gb: int
    required_journeys: tuple[AndroidJourneyId, ...]
    required_data_checks: tuple[AndroidDataCheckId, ...]
    budget: PerformanceBudget

    def __post_init__(self) -> None:
        if not self.device_profile.strip():
            raise AndroidPerformanceHarnessError("device_profile is required")
        if self.memory_class_gb <= 0:
            raise AndroidPerformanceHarnessError("memory_class_gb must be greater than zero")
        if not self.required_journeys:
            raise AndroidPerformanceHarnessError("required_journeys must not be empty")
        if not self.required_data_checks:
            raise AndroidPerformanceHarnessError("required_data_checks must not be empty")


@dataclass(frozen=True)
class ScenarioObservation:
    matrix_id: AndroidMatrixId
    p95_latency_ms: int
    payload_bytes: int
    replay_success_rate: float
    duplicate_commits: int
    data_loss_count: int
    background_resume_count: int
    background_resume_success_count: int
    conflict_resolution_ms: int | None
    journey_results: dict[AndroidJourneyId, bool]
    data_check_results: dict[AndroidDataCheckId, bool]

    def __post_init__(self) -> None:
        if self.p95_latency_ms < 0:
            raise AndroidPerformanceHarnessError("p95_latency_ms must be >= 0")
        if self.payload_bytes < 0:
            raise AndroidPerformanceHarnessError("payload_bytes must be >= 0")
        if not 0 <= self.replay_success_rate <= 1:
            raise AndroidPerformanceHarnessError("replay_success_rate must be between 0 and 1")
        if self.duplicate_commits < 0:
            raise AndroidPerformanceHarnessError("duplicate_commits must be >= 0")
        if self.data_loss_count < 0:
            raise AndroidPerformanceHarnessError("data_loss_count must be >= 0")
        if self.background_resume_count < 0:
            raise AndroidPerformanceHarnessError("background_resume_count must be >= 0")
        if self.background_resume_success_count < 0:
            raise AndroidPerformanceHarnessError("background_resume_success_count must be >= 0")
        if self.background_resume_success_count > self.background_resume_count:
            raise AndroidPerformanceHarnessError(
                "background_resume_success_count cannot exceed background_resume_count"
            )
        if self.conflict_resolution_ms is not None and self.conflict_resolution_ms < 0:
            raise AndroidPerformanceHarnessError("conflict_resolution_ms must be >= 0")


@dataclass(frozen=True)
class HarnessEvaluation:
    matrix_id: AndroidMatrixId
    passed: bool
    covered_journeys: tuple[AndroidJourneyId, ...]
    covered_data_checks: tuple[AndroidDataCheckId, ...]
    failed_checks: tuple[str, ...]


@dataclass(frozen=True)
class HarnessSuiteReport:
    passed: bool
    evaluations: tuple[HarnessEvaluation, ...]
    covered_journeys: tuple[AndroidJourneyId, ...]
    covered_data_checks: tuple[AndroidDataCheckId, ...]


class LowEndAndroidPerformanceHarness:
    """Evaluates Android readiness observations against canonical low-end fixtures."""

    def __init__(self, fixtures: tuple[AndroidScenarioFixture, ...]) -> None:
        if not fixtures:
            raise AndroidPerformanceHarnessError("fixtures must not be empty")
        self._fixtures = fixtures
        self.validate_fixture_integrity()

    @property
    def fixtures(self) -> tuple[AndroidScenarioFixture, ...]:
        return self._fixtures

    def validate_fixture_integrity(self) -> None:
        seen: set[AndroidMatrixId] = set()
        journeys: set[AndroidJourneyId] = set()
        data_checks: set[AndroidDataCheckId] = set()

        for fixture in self._fixtures:
            if fixture.matrix_id in seen:
                raise AndroidPerformanceHarnessError(
                    f"duplicate matrix fixture: {fixture.matrix_id.value}"
                )
            seen.add(fixture.matrix_id)
            journeys.update(fixture.required_journeys)
            data_checks.update(fixture.required_data_checks)

            if (
                fixture.matrix_id == AndroidMatrixId.ARM_001
                and fixture.network_profile != NetworkProfile.UNSTABLE_3G
            ):
                raise AndroidPerformanceHarnessError("ARM-001 must model unstable 3G")
            if (
                fixture.matrix_id == AndroidMatrixId.ARM_002
                and fixture.background_profile != BackgroundProfile.SUSPENDED_RESUME
            ):
                raise AndroidPerformanceHarnessError(
                    "ARM-002 must model intermittent background suspension"
                )
            if (
                fixture.matrix_id == AndroidMatrixId.ARM_003
                and fixture.network_profile != NetworkProfile.PACKET_LOSS
            ):
                raise AndroidPerformanceHarnessError("ARM-003 must model packet loss")
            if (
                fixture.matrix_id == AndroidMatrixId.ARM_004
                and fixture.network_profile != NetworkProfile.SIGNAL_TRANSITIONS
            ):
                raise AndroidPerformanceHarnessError("ARM-004 must model signal transitions")

        if seen != set(AndroidMatrixId):
            raise AndroidPerformanceHarnessError("fixture set must cover ARM-001 through ARM-004")
        if journeys != set(AndroidJourneyId):
            raise AndroidPerformanceHarnessError("fixture set must cover ARJ-001 through ARJ-006")
        if data_checks != set(AndroidDataCheckId):
            raise AndroidPerformanceHarnessError(
                "fixture set must cover ARDI-001 through ARDI-005"
            )

    def evaluate(self, observation: ScenarioObservation) -> HarnessEvaluation:
        fixture = self._get_fixture(observation.matrix_id)
        failed_checks: list[str] = []

        for journey in fixture.required_journeys:
            if not observation.journey_results.get(journey, False):
                failed_checks.append(f"journey_failed:{journey.value}")

        for data_check in fixture.required_data_checks:
            if not observation.data_check_results.get(data_check, False):
                failed_checks.append(f"data_check_failed:{data_check.value}")

        if observation.p95_latency_ms > fixture.budget.max_p95_latency_ms:
            failed_checks.append("latency_budget_exceeded")
        if observation.payload_bytes > fixture.budget.max_payload_bytes:
            failed_checks.append("payload_budget_exceeded")
        if observation.replay_success_rate < fixture.budget.min_replay_success_rate:
            failed_checks.append("replay_success_below_target")
        if observation.duplicate_commits > fixture.budget.max_duplicate_commits:
            failed_checks.append("duplicate_commit_budget_exceeded")
        if observation.data_loss_count > fixture.budget.max_data_loss_count:
            failed_checks.append("data_loss_detected")
        if (
            fixture.background_profile in {
                BackgroundProfile.INTERMITTENT_BACKGROUND,
                BackgroundProfile.SUSPENDED_RESUME,
            }
            and observation.background_resume_count != observation.background_resume_success_count
        ):
            failed_checks.append("background_resume_loss")
        if (
            fixture.budget.max_conflict_resolution_ms is not None
            and (
                observation.conflict_resolution_ms is None
                or observation.conflict_resolution_ms > fixture.budget.max_conflict_resolution_ms
            )
        ):
            failed_checks.append("conflict_resolution_budget_exceeded")

        return HarnessEvaluation(
            matrix_id=observation.matrix_id,
            passed=not failed_checks,
            covered_journeys=fixture.required_journeys,
            covered_data_checks=fixture.required_data_checks,
            failed_checks=tuple(failed_checks),
        )

    def evaluate_suite(
        self,
        observations: tuple[ScenarioObservation, ...],
    ) -> HarnessSuiteReport:
        if len(observations) != len(self._fixtures):
            raise AndroidPerformanceHarnessError(
                "observations must include one result per canonical matrix fixture"
            )

        evaluations = tuple(self.evaluate(observation) for observation in observations)
        covered_journeys = tuple(
            sorted({journey for item in evaluations for journey in item.covered_journeys}, key=str)
        )
        covered_data_checks = tuple(
            sorted(
                {check for item in evaluations for check in item.covered_data_checks},
                key=str,
            )
        )
        return HarnessSuiteReport(
            passed=all(item.passed for item in evaluations),
            evaluations=evaluations,
            covered_journeys=covered_journeys,
            covered_data_checks=covered_data_checks,
        )

    def _get_fixture(self, matrix_id: AndroidMatrixId) -> AndroidScenarioFixture:
        for fixture in self._fixtures:
            if fixture.matrix_id == matrix_id:
                return fixture
        raise AndroidPerformanceHarnessError(f"unknown matrix fixture: {matrix_id.value}")


def build_default_android_harness() -> LowEndAndroidPerformanceHarness:
    return LowEndAndroidPerformanceHarness(
        fixtures=(
            AndroidScenarioFixture(
                matrix_id=AndroidMatrixId.ARM_001,
                device_profile="low_ram_android_2gb",
                network_profile=NetworkProfile.UNSTABLE_3G,
                background_profile=BackgroundProfile.INTERMITTENT_BACKGROUND,
                memory_class_gb=2,
                required_journeys=(AndroidJourneyId.ARJ_001, AndroidJourneyId.ARJ_002),
                required_data_checks=(
                    AndroidDataCheckId.ARDI_001,
                    AndroidDataCheckId.ARDI_002,
                ),
                budget=PerformanceBudget(
                    max_p95_latency_ms=2200,
                    max_payload_bytes=240,
                    min_replay_success_rate=0.99,
                ),
            ),
            AndroidScenarioFixture(
                matrix_id=AndroidMatrixId.ARM_002,
                device_profile="mid_tier_android_4gb",
                network_profile=NetworkProfile.UNSTABLE_3G,
                background_profile=BackgroundProfile.SUSPENDED_RESUME,
                memory_class_gb=4,
                required_journeys=(AndroidJourneyId.ARJ_002, AndroidJourneyId.ARJ_005),
                required_data_checks=(AndroidDataCheckId.ARDI_002,),
                budget=PerformanceBudget(
                    max_p95_latency_ms=2400,
                    max_payload_bytes=240,
                    min_replay_success_rate=1.0,
                ),
            ),
            AndroidScenarioFixture(
                matrix_id=AndroidMatrixId.ARM_003,
                device_profile="low_end_android_cpu_pressure",
                network_profile=NetworkProfile.PACKET_LOSS,
                background_profile=BackgroundProfile.INTERMITTENT_BACKGROUND,
                memory_class_gb=3,
                required_journeys=(AndroidJourneyId.ARJ_001, AndroidJourneyId.ARJ_004),
                required_data_checks=(
                    AndroidDataCheckId.ARDI_001,
                    AndroidDataCheckId.ARDI_005,
                ),
                budget=PerformanceBudget(
                    max_p95_latency_ms=2600,
                    max_payload_bytes=240,
                    min_replay_success_rate=0.98,
                ),
            ),
            AndroidScenarioFixture(
                matrix_id=AndroidMatrixId.ARM_004,
                device_profile="signal_transition_android_cohort",
                network_profile=NetworkProfile.SIGNAL_TRANSITIONS,
                background_profile=BackgroundProfile.INTERMITTENT_BACKGROUND,
                memory_class_gb=3,
                required_journeys=(
                    AndroidJourneyId.ARJ_003,
                    AndroidJourneyId.ARJ_006,
                ),
                required_data_checks=(
                    AndroidDataCheckId.ARDI_003,
                    AndroidDataCheckId.ARDI_004,
                ),
                budget=PerformanceBudget(
                    max_p95_latency_ms=2500,
                    max_payload_bytes=240,
                    min_replay_success_rate=0.98,
                    max_conflict_resolution_ms=1800,
                ),
            ),
        )
    )
