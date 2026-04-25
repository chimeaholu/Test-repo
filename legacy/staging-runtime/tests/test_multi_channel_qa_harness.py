import pytest

from agro_v2.multi_channel_qa_harness import (
    HarnessChannel,
    JourneyFixture,
    MultiChannelQAHarness,
    MultiChannelQAHarnessError,
    ScenarioKind,
    build_default_multi_channel_qa_harness,
)


def test_default_harness_covers_all_canonical_journeys_and_data_checks():
    harness = build_default_multi_channel_qa_harness()

    assert len(harness.fixtures) == 16
    assert {fixture.journey_id for fixture in harness.fixtures} == {
        "CJ-001",
        "CJ-002",
        "CJ-003",
        "CJ-004",
        "CJ-005",
        "CJ-006",
        "CJ-007",
        "CJ-008",
        "EP-001",
        "EP-002",
        "EP-003",
        "EP-004",
        "EP-005",
        "EP-006",
        "EP-007",
        "EP-008",
    }
    assert {check for fixture in harness.fixtures for check in fixture.required_data_checks} == {
        "DI-001",
        "DI-002",
        "DI-003",
        "DI-004",
        "DI-005",
        "DI-006",
    }


def test_fixture_integrity_rejects_missing_journey_coverage():
    fixtures = build_default_multi_channel_qa_harness().fixtures[:-1]

    with pytest.raises(
        MultiChannelQAHarnessError,
        match="fixture set must cover CJ-001..008 and EP-001..008",
    ):
        MultiChannelQAHarness(fixtures)


def test_ussd_timeout_fixture_exercises_recovery_path():
    harness = build_default_multi_channel_qa_harness()

    execution = harness.execute_fixture("EP-002")

    assert execution.primary_channel == HarnessChannel.USSD
    assert execution.passed is True
    assert "timeout_recovery" in execution.checkpoints


def test_whatsapp_fixture_exercises_command_stub():
    harness = build_default_multi_channel_qa_harness()

    execution = harness.execute_fixture("CJ-003")

    assert execution.primary_channel == HarnessChannel.WHATSAPP
    assert execution.passed is True
    assert "negotiation_reply" in execution.checkpoints


def test_suite_execution_reports_full_pass():
    harness = build_default_multi_channel_qa_harness()

    suite = harness.execute_suite()

    assert suite.passed is True
    assert suite.execution_count == 16
    assert set(suite.covered_journeys) == {fixture.journey_id for fixture in harness.fixtures}
    assert set(suite.covered_data_checks) == {
        "DI-001",
        "DI-002",
        "DI-003",
        "DI-004",
        "DI-005",
        "DI-006",
    }


def test_fixture_rejects_unsupported_bead_reference():
    fixture = JourneyFixture(
        journey_id="CJ-001",
        primary_channel=HarnessChannel.USSD,
        scenario_kind=ScenarioKind.USSD_PROFILE,
        required_beads=("B-004", "B-999"),
        required_data_checks=("DI-001",),
        expected_checkpoint="profile_capture",
    )
    fixtures = (fixture,) + build_default_multi_channel_qa_harness().fixtures[1:]

    with pytest.raises(
        MultiChannelQAHarnessError,
        match="unsupported beads",
    ):
        MultiChannelQAHarness(fixtures)
