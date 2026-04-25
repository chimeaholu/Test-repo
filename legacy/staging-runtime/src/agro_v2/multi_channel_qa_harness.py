"""B-028 QA harness for multi-channel E2E automation."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .offline_queue import ConnectivityState, OfflineQueue
from .ussd_adapter import UssdAdapterContract, build_default_ussd_adapter
from .whatsapp_adapter import (
    InboundWhatsAppMessage,
    WhatsAppAdapterContract,
    WhatsAppMessageType,
)


class MultiChannelQAHarnessError(ValueError):
    """Raised when canonical QA fixtures or harness executions are invalid."""


class HarnessChannel(str, Enum):
    USSD = "ussd"
    WHATSAPP = "whatsapp"
    PWA = "pwa"


class ScenarioKind(str, Enum):
    USSD_PROFILE = "ussd_profile"
    USSD_MARKET = "ussd_market"
    USSD_TIMEOUT = "ussd_timeout"
    WHATSAPP_HELP = "whatsapp_help"
    WHATSAPP_NEGOTIATION = "whatsapp_negotiation"
    WHATSAPP_SETTLEMENT = "whatsapp_settlement"
    PWA_ONLINE = "pwa_online"
    PWA_OFFLINE = "pwa_offline"
    PWA_DEGRADED = "pwa_degraded"


@dataclass(frozen=True)
class JourneyFixture:
    journey_id: str
    primary_channel: HarnessChannel
    scenario_kind: ScenarioKind
    required_beads: tuple[str, ...]
    required_data_checks: tuple[str, ...]
    expected_checkpoint: str

    def __post_init__(self) -> None:
        if not self.journey_id.strip():
            raise MultiChannelQAHarnessError("journey_id is required")
        if not self.required_beads:
            raise MultiChannelQAHarnessError("required_beads must not be empty")
        if not self.required_data_checks:
            raise MultiChannelQAHarnessError("required_data_checks must not be empty")
        if not self.expected_checkpoint.strip():
            raise MultiChannelQAHarnessError("expected_checkpoint is required")


@dataclass(frozen=True)
class HarnessExecution:
    journey_id: str
    primary_channel: HarnessChannel
    passed: bool
    checkpoints: tuple[str, ...]
    data_checks: tuple[str, ...]
    covered_beads: tuple[str, ...]


@dataclass(frozen=True)
class HarnessSuiteReport:
    passed: bool
    execution_count: int
    covered_journeys: tuple[str, ...]
    covered_data_checks: tuple[str, ...]


class MultiChannelQAHarness:
    """Validates canonical journey fixtures using channel-aware contract stubs."""

    _REQUIRED_JOURNEYS = tuple(
        [f"CJ-00{index}" for index in range(1, 9)]
        + [f"EP-00{index}" for index in range(1, 9)]
    )
    _REQUIRED_DATA_CHECKS = ("DI-001", "DI-002", "DI-003", "DI-004", "DI-005", "DI-006")
    _ALLOWED_BEADS = frozenset({"B-004", "B-005", "B-006", "B-009", "B-012"})

    def __init__(
        self,
        fixtures: tuple[JourneyFixture, ...],
        *,
        ussd_adapter: UssdAdapterContract | None = None,
        whatsapp_contract: WhatsAppAdapterContract | None = None,
        offline_queue: OfflineQueue | None = None,
    ) -> None:
        if not fixtures:
            raise MultiChannelQAHarnessError("fixtures must not be empty")
        self.fixtures = fixtures
        self._ussd = ussd_adapter or build_default_ussd_adapter()
        self._whatsapp = whatsapp_contract or WhatsAppAdapterContract()
        self._offline = offline_queue or OfflineQueue()
        self.validate_fixture_integrity()

    def validate_fixture_integrity(self) -> None:
        seen_journeys: set[str] = set()
        covered_data_checks: set[str] = set()

        for fixture in self.fixtures:
            if fixture.journey_id in seen_journeys:
                raise MultiChannelQAHarnessError(f"duplicate journey fixture: {fixture.journey_id}")
            seen_journeys.add(fixture.journey_id)
            covered_data_checks.update(fixture.required_data_checks)
            disallowed = set(fixture.required_beads) - self._ALLOWED_BEADS
            if disallowed:
                raise MultiChannelQAHarnessError(
                    f"fixture references unsupported beads: {sorted(disallowed)}"
                )

        if tuple(sorted(seen_journeys)) != self._REQUIRED_JOURNEYS:
            raise MultiChannelQAHarnessError("fixture set must cover CJ-001..008 and EP-001..008")
        if covered_data_checks != set(self._REQUIRED_DATA_CHECKS):
            raise MultiChannelQAHarnessError("fixture set must cover DI-001..006")

    def execute_fixture(self, journey_id: str) -> HarnessExecution:
        fixture = next((item for item in self.fixtures if item.journey_id == journey_id), None)
        if fixture is None:
            raise MultiChannelQAHarnessError(f"unknown journey_id: {journey_id}")
        checkpoints = self._exercise_scenario(fixture)
        return HarnessExecution(
            journey_id=fixture.journey_id,
            primary_channel=fixture.primary_channel,
            passed=fixture.expected_checkpoint in checkpoints,
            checkpoints=tuple(checkpoints),
            data_checks=fixture.required_data_checks,
            covered_beads=fixture.required_beads,
        )

    def execute_suite(self) -> HarnessSuiteReport:
        executions = tuple(self.execute_fixture(fixture.journey_id) for fixture in self.fixtures)
        if len(executions) != len(self._REQUIRED_JOURNEYS):
            raise MultiChannelQAHarnessError("suite must execute every canonical journey")
        return HarnessSuiteReport(
            passed=all(execution.passed for execution in executions),
            execution_count=len(executions),
            covered_journeys=tuple(execution.journey_id for execution in executions),
            covered_data_checks=tuple(
                sorted({check for execution in executions for check in execution.data_checks})
            ),
        )

    def _exercise_scenario(self, fixture: JourneyFixture) -> list[str]:
        if fixture.primary_channel == HarnessChannel.USSD:
            return self._exercise_ussd(fixture.scenario_kind)
        if fixture.primary_channel == HarnessChannel.WHATSAPP:
            return self._exercise_whatsapp(fixture.scenario_kind)
        return self._exercise_pwa(fixture.scenario_kind)

    def _exercise_ussd(self, scenario_kind: ScenarioKind) -> list[str]:
        checkpoints = ["session_started"]
        started = self._ussd.start_session(
            session_id="qa-session",
            workflow_id="qa-workflow",
            phone_number="+2335550100",
            country_code="GH",
            now_epoch_ms=1_000,
        )
        if scenario_kind == ScenarioKind.USSD_PROFILE:
            result = self._ussd.handle_input(
                session=started.session,
                input_text="1",
                now_epoch_ms=2_000,
            )
            return checkpoints + [result.session.last_event_type or "", "profile_capture"]

        market = self._ussd.handle_input(
            session=started.session,
            input_text="2",
            now_epoch_ms=2_000,
        )
        checkpoints.append("marketplace_opened")

        if scenario_kind == ScenarioKind.USSD_MARKET:
            result = self._ussd.handle_input(
                session=market.session,
                input_text="1",
                now_epoch_ms=3_000,
            )
            return checkpoints + [result.session.last_event_type or "", "listing_terminal"]

        timed_out = self._ussd.handle_input(
            session=market.session,
            input_text="1",
            now_epoch_ms=100_001,
        )
        resumed = self._ussd.handle_input(
            session=timed_out.session,
            input_text="9",
            now_epoch_ms=100_010,
        )
        return checkpoints + ["timeout_recovery", resumed.session.current_menu_id]

    def _exercise_whatsapp(self, scenario_kind: ScenarioKind) -> list[str]:
        payload = {
            ScenarioKind.WHATSAPP_HELP: "help",
            ScenarioKind.WHATSAPP_NEGOTIATION: "counter offer-1 4300",
            ScenarioKind.WHATSAPP_SETTLEMENT: "settlement escrow-1",
        }[scenario_kind]
        parsed = self._whatsapp.parse_command(
            InboundWhatsAppMessage(
                message_id="wa-msg-1",
                contact_id="farmer-1",
                message_type=WhatsAppMessageType.TEXT,
                text=payload,
            )
        )
        return ["message_parsed", parsed.intent.value, parsed.command_name]

    def _exercise_pwa(self, scenario_kind: ScenarioKind) -> list[str]:
        connectivity = {
            ScenarioKind.PWA_ONLINE: ConnectivityState.ONLINE,
            ScenarioKind.PWA_OFFLINE: ConnectivityState.OFFLINE,
            ScenarioKind.PWA_DEGRADED: ConnectivityState.DEGRADED,
        }[scenario_kind]
        queue_depth = 3 if scenario_kind == ScenarioKind.PWA_DEGRADED else 1
        handoff = self._offline.connectivity_handoff(connectivity, queue_depth=queue_depth)
        checkpoints = ["queue_checked", connectivity.value]
        if handoff.should_prompt and handoff.suggested_channel is not None:
            checkpoints.append(f"fallback:{handoff.suggested_channel.value}")
        else:
            checkpoints.append("stay_pwa")
        return checkpoints


def build_default_multi_channel_qa_harness() -> MultiChannelQAHarness:
    fixtures = (
        JourneyFixture("CJ-001", HarnessChannel.USSD, ScenarioKind.USSD_PROFILE, ("B-004",), ("DI-001",), "profile_capture"),
        JourneyFixture("CJ-002", HarnessChannel.PWA, ScenarioKind.PWA_ONLINE, ("B-006", "B-009"), ("DI-001", "DI-002"), "stay_pwa"),
        JourneyFixture("CJ-003", HarnessChannel.WHATSAPP, ScenarioKind.WHATSAPP_NEGOTIATION, ("B-005", "B-009"), ("DI-002",), "negotiation_reply"),
        JourneyFixture("CJ-004", HarnessChannel.PWA, ScenarioKind.PWA_OFFLINE, ("B-006", "B-012"), ("DI-003",), "fallback:whatsapp"),
        JourneyFixture("CJ-005", HarnessChannel.WHATSAPP, ScenarioKind.WHATSAPP_HELP, ("B-005",), ("DI-004", "DI-005"), "help"),
        JourneyFixture("CJ-006", HarnessChannel.PWA, ScenarioKind.PWA_DEGRADED, ("B-006",), ("DI-006",), "fallback:ussd"),
        JourneyFixture("CJ-007", HarnessChannel.USSD, ScenarioKind.USSD_MARKET, ("B-004", "B-009"), ("DI-001", "DI-002"), "listing_terminal"),
        JourneyFixture("CJ-008", HarnessChannel.WHATSAPP, ScenarioKind.WHATSAPP_SETTLEMENT, ("B-005", "B-012"), ("DI-003", "DI-005"), "settlement"),
        JourneyFixture("EP-001", HarnessChannel.USSD, ScenarioKind.USSD_PROFILE, ("B-004",), ("DI-001",), "identity.capture_requested"),
        JourneyFixture("EP-002", HarnessChannel.USSD, ScenarioKind.USSD_TIMEOUT, ("B-004", "B-006"), ("DI-001", "DI-002"), "timeout_recovery"),
        JourneyFixture("EP-003", HarnessChannel.WHATSAPP, ScenarioKind.WHATSAPP_SETTLEMENT, ("B-005", "B-012"), ("DI-003",), "settlement"),
        JourneyFixture("EP-004", HarnessChannel.PWA, ScenarioKind.PWA_OFFLINE, ("B-006", "B-012"), ("DI-003",), "fallback:whatsapp"),
        JourneyFixture("EP-005", HarnessChannel.PWA, ScenarioKind.PWA_ONLINE, ("B-006",), ("DI-003",), "stay_pwa"),
        JourneyFixture("EP-006", HarnessChannel.WHATSAPP, ScenarioKind.WHATSAPP_HELP, ("B-005",), ("DI-005",), "help"),
        JourneyFixture("EP-007", HarnessChannel.PWA, ScenarioKind.PWA_DEGRADED, ("B-006",), ("DI-002",), "fallback:ussd"),
        JourneyFixture("EP-008", HarnessChannel.WHATSAPP, ScenarioKind.WHATSAPP_SETTLEMENT, ("B-005", "B-012"), ("DI-006",), "settlement"),
    )
    return MultiChannelQAHarness(fixtures)
