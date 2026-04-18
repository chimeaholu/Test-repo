import pytest

from agro_v2.planning_loop import (
    IntentClass,
    PhaseCheckpointEnforcer,
    PhaseCheckpointError,
    PlannerTriggerInput,
    PlanningCheckpoint,
    PlanningLoopQualityEngine,
    RiskClass,
)


def test_trigger_policy_skips_planner_for_trivial_low_risk():
    engine = PlanningLoopQualityEngine()

    outcome = engine.evaluate_trigger(
        PlannerTriggerInput(intent_class=IntentClass.TRIVIAL, risk_class=RiskClass.LOW)
    )

    assert outcome.requires_planner_artifact is False
    assert outcome.reason_code == "trivial_low_risk"


def test_trigger_policy_requires_planner_for_non_trivial_intent():
    engine = PlanningLoopQualityEngine()

    outcome = engine.evaluate_trigger(
        PlannerTriggerInput(intent_class=IntentClass.NON_TRIVIAL, risk_class=RiskClass.LOW)
    )

    assert outcome.requires_planner_artifact is True
    assert outcome.reason_code == "non_trivial_intent_requires_planner"


def test_trigger_policy_requires_planner_for_elevated_risk_even_if_trivial_intent():
    engine = PlanningLoopQualityEngine()

    outcome = engine.evaluate_trigger(
        PlannerTriggerInput(intent_class=IntentClass.TRIVIAL, risk_class=RiskClass.HIGH)
    )

    assert outcome.requires_planner_artifact is True
    assert outcome.reason_code == "elevated_risk_requires_planner"


def test_checkpoint_enforcer_rejects_out_of_order_checkpoint():
    enforcer = PhaseCheckpointEnforcer()

    with pytest.raises(PhaseCheckpointError, match="out of sequence"):
        enforcer.record_checkpoint("wf-1", PlanningCheckpoint.PLAN_ARTIFACT_ATTACHED)


def test_checkpoint_enforcer_reports_missing_checkpoints():
    enforcer = PhaseCheckpointEnforcer()
    enforcer.record_checkpoint("wf-2", PlanningCheckpoint.INTENT_CAPTURED)

    missing = enforcer.missing_checkpoints("wf-2")
    assert missing == (
        PlanningCheckpoint.CONTEXT_COMPACTED,
        PlanningCheckpoint.PLAN_ARTIFACT_ATTACHED,
        PlanningCheckpoint.PHASE_REVIEW_PASSED,
    )


def test_execution_gate_blocks_when_phase_checkpoints_incomplete():
    engine = PlanningLoopQualityEngine()
    trigger = engine.evaluate_trigger(
        PlannerTriggerInput(intent_class=IntentClass.NON_TRIVIAL, risk_class=RiskClass.MEDIUM)
    )
    engine.record_checkpoint("wf-3", PlanningCheckpoint.INTENT_CAPTURED)
    engine.record_checkpoint("wf-3", PlanningCheckpoint.CONTEXT_COMPACTED)

    outcome = engine.evaluate_execution_gate(
        workflow_id="wf-3",
        trigger_outcome=trigger,
        planner_artifact_id="plan-123",
    )

    assert outcome.allowed is False
    assert outcome.reason_code == "phase_checkpoints_incomplete"
    assert outcome.missing_checkpoints == (
        PlanningCheckpoint.PLAN_ARTIFACT_ATTACHED,
        PlanningCheckpoint.PHASE_REVIEW_PASSED,
    )


def test_execution_gate_blocks_when_planner_artifact_missing():
    engine = PlanningLoopQualityEngine()
    trigger = engine.evaluate_trigger(
        PlannerTriggerInput(intent_class=IntentClass.NON_TRIVIAL, risk_class=RiskClass.HIGH)
    )
    for checkpoint in (
        PlanningCheckpoint.INTENT_CAPTURED,
        PlanningCheckpoint.CONTEXT_COMPACTED,
        PlanningCheckpoint.PLAN_ARTIFACT_ATTACHED,
        PlanningCheckpoint.PHASE_REVIEW_PASSED,
    ):
        engine.record_checkpoint("wf-4", checkpoint)

    outcome = engine.evaluate_execution_gate(
        workflow_id="wf-4",
        trigger_outcome=trigger,
        planner_artifact_id=" ",
    )

    assert outcome.allowed is False
    assert outcome.reason_code == "planner_artifact_required"


def test_execution_gate_allows_when_policy_and_checkpoints_are_satisfied():
    engine = PlanningLoopQualityEngine()
    trigger = engine.evaluate_trigger(
        PlannerTriggerInput(intent_class=IntentClass.NON_TRIVIAL, risk_class=RiskClass.MEDIUM)
    )
    for checkpoint in (
        PlanningCheckpoint.INTENT_CAPTURED,
        PlanningCheckpoint.CONTEXT_COMPACTED,
        PlanningCheckpoint.PLAN_ARTIFACT_ATTACHED,
        PlanningCheckpoint.PHASE_REVIEW_PASSED,
    ):
        engine.record_checkpoint("wf-5", checkpoint)

    outcome = engine.evaluate_execution_gate(
        workflow_id="wf-5",
        trigger_outcome=trigger,
        planner_artifact_id="plan-555",
    )

    assert outcome.allowed is True
    assert outcome.reason_code == "allow"
    assert outcome.missing_checkpoints == ()
