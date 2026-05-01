"""F-025 frontend Playwright suite planning and result evaluation."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class FrontendPlaywrightHarnessError(ValueError):
    """Raised when frontend automation scenarios or observations are malformed."""


class FrontendScenarioKind(str, Enum):
    CRITICAL = "critical"
    ERROR = "error"
    RESPONSIVE = "responsive"
    DATA_INTEGRITY = "data_integrity"


@dataclass(frozen=True)
class FrontendPlaywrightScenario:
    scenario_id: str
    journey_id: str
    route_name: str
    viewport: str
    kind: FrontendScenarioKind
    required_data_reference: bool

    def __post_init__(self) -> None:
        if not self.scenario_id.strip():
            raise FrontendPlaywrightHarnessError("scenario_id is required")
        if not self.journey_id.strip():
            raise FrontendPlaywrightHarnessError("journey_id is required")
        if not self.route_name.startswith("/app/"):
            raise FrontendPlaywrightHarnessError("route_name must live under /app")
        if self.viewport not in {"mobile", "desktop"}:
            raise FrontendPlaywrightHarnessError("viewport must be mobile or desktop")


@dataclass(frozen=True)
class FrontendPlaywrightObservation:
    scenario_id: str
    passed: bool
    screenshot_path: str
    console_errors: tuple[str, ...]
    network_error_count: int
    data_reference_ids: tuple[str, ...]
    latency_ms: int

    def __post_init__(self) -> None:
        if not self.scenario_id.strip():
            raise FrontendPlaywrightHarnessError("scenario_id is required")
        if self.network_error_count < 0:
            raise FrontendPlaywrightHarnessError("network_error_count must be >= 0")
        if self.latency_ms < 0:
            raise FrontendPlaywrightHarnessError("latency_ms must be >= 0")


@dataclass(frozen=True)
class FrontendPlaywrightSuiteReport:
    passed: bool
    total_scenarios: int
    failed_scenario_ids: tuple[str, ...]
    missing_scenario_ids: tuple[str, ...]
    missing_journey_ids: tuple[str, ...]
    coverage_by_kind: dict[str, int]


DEFAULT_SCENARIOS: tuple[FrontendPlaywrightScenario, ...] = (
    FrontendPlaywrightScenario("fj-c01-mobile", "FJ-C01", "/app/onboarding", "mobile", FrontendScenarioKind.CRITICAL, False),
    FrontendPlaywrightScenario("fj-c02-mobile", "FJ-C02", "/app/listings", "mobile", FrontendScenarioKind.CRITICAL, False),
    FrontendPlaywrightScenario("fj-c03-mobile", "FJ-C03", "/app/negotiation", "mobile", FrontendScenarioKind.CRITICAL, False),
    FrontendPlaywrightScenario("fj-c04-mobile", "FJ-C04", "/app/wallet", "mobile", FrontendScenarioKind.CRITICAL, True),
    FrontendPlaywrightScenario("fj-c05-mobile", "FJ-C05", "/app/advisory/new", "mobile", FrontendScenarioKind.CRITICAL, True),
    FrontendPlaywrightScenario("fj-c06-mobile", "FJ-C06", "/app/climate/alerts", "mobile", FrontendScenarioKind.CRITICAL, True),
    FrontendPlaywrightScenario("fj-c07-desktop", "FJ-C07", "/app/finance/queue", "desktop", FrontendScenarioKind.DATA_INTEGRITY, True),
    FrontendPlaywrightScenario("fj-c08-desktop", "FJ-C08", "/app/traceability", "desktop", FrontendScenarioKind.DATA_INTEGRITY, True),
    FrontendPlaywrightScenario("fj-r01-mobile", "FJ-R01", "/app/home", "mobile", FrontendScenarioKind.RESPONSIVE, False),
    FrontendPlaywrightScenario("fj-r02-desktop", "FJ-R02", "/app/listings", "desktop", FrontendScenarioKind.RESPONSIVE, False),
    FrontendPlaywrightScenario("fj-r05-desktop", "FJ-R05", "/app/admin/analytics", "desktop", FrontendScenarioKind.RESPONSIVE, True),
    FrontendPlaywrightScenario("fj-e01-mobile", "FJ-E01", "/app/listings/new", "mobile", FrontendScenarioKind.ERROR, False),
    FrontendPlaywrightScenario("fj-e02-mobile", "FJ-E02", "/app/negotiation", "mobile", FrontendScenarioKind.ERROR, False),
    FrontendPlaywrightScenario("fj-e03-mobile", "FJ-E03", "/app/wallet", "mobile", FrontendScenarioKind.ERROR, True),
    FrontendPlaywrightScenario("fj-e04-mobile", "FJ-E04", "/app/wallet", "mobile", FrontendScenarioKind.ERROR, True),
    FrontendPlaywrightScenario("fj-e05-desktop", "FJ-E05", "/app/finance/queue", "desktop", FrontendScenarioKind.ERROR, True),
    FrontendPlaywrightScenario("fj-e06-mobile", "FJ-E06", "/app/traceability/consignment/evidence/new", "mobile", FrontendScenarioKind.ERROR, True),
    FrontendPlaywrightScenario("fj-d01-mobile", "FJ-D01", "/app/onboarding/consent", "mobile", FrontendScenarioKind.DATA_INTEGRITY, True),
    FrontendPlaywrightScenario("fj-d02-mobile", "FJ-D02", "/app/offline/outbox", "mobile", FrontendScenarioKind.DATA_INTEGRITY, True),
    FrontendPlaywrightScenario("fj-d05-desktop", "FJ-D05", "/app/traceability", "desktop", FrontendScenarioKind.DATA_INTEGRITY, True),
    FrontendPlaywrightScenario("fj-d06-desktop", "FJ-D06", "/app/admin/analytics", "desktop", FrontendScenarioKind.DATA_INTEGRITY, True),
)


class FrontendPlaywrightHarness:
    """Defines the frontend automation matrix and evaluates observed executions."""

    def build_default_suite(self) -> tuple[FrontendPlaywrightScenario, ...]:
        return DEFAULT_SCENARIOS

    def evaluate(
        self,
        observations: tuple[FrontendPlaywrightObservation, ...],
    ) -> FrontendPlaywrightSuiteReport:
        scenarios = {scenario.scenario_id: scenario for scenario in self.build_default_suite()}
        observed = {observation.scenario_id: observation for observation in observations}
        missing_scenario_ids = tuple(
            scenario_id for scenario_id in scenarios if scenario_id not in observed
        )
        failed_scenario_ids: list[str] = []
        for scenario_id, scenario in scenarios.items():
            observation = observed.get(scenario_id)
            if observation is None:
                continue
            if (
                not observation.passed
                or not observation.screenshot_path.strip()
                or observation.console_errors
                or observation.network_error_count
                or (
                    scenario.required_data_reference
                    and not observation.data_reference_ids
                )
            ):
                failed_scenario_ids.append(scenario_id)

        observed_journeys = {
            scenarios[scenario_id].journey_id
            for scenario_id in observed
            if scenario_id in scenarios
        }
        missing_journey_ids = tuple(
            sorted(
                {
                    scenario.journey_id
                    for scenario in scenarios.values()
                    if scenario.journey_id not in observed_journeys
                }
            )
        )
        coverage_by_kind: dict[str, int] = {}
        for scenario in scenarios.values():
            coverage_by_kind.setdefault(scenario.kind.value, 0)
            coverage_by_kind[scenario.kind.value] += 1

        return FrontendPlaywrightSuiteReport(
            passed=not missing_scenario_ids and not failed_scenario_ids,
            total_scenarios=len(scenarios),
            failed_scenario_ids=tuple(sorted(failed_scenario_ids)),
            missing_scenario_ids=missing_scenario_ids,
            missing_journey_ids=missing_journey_ids,
            coverage_by_kind=coverage_by_kind,
        )
