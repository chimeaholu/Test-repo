from pathlib import Path

from agro_v2.staging_runtime import (
    apply_action,
    build_seed_state,
    load_state,
    seed_state,
    teardown_state,
    verify_check,
)


def test_seed_and_teardown_are_idempotent(tmp_path: Path):
    state_path = tmp_path / "runtime-state.json"

    first = seed_state(state_path, "e2e-critical")
    second = seed_state(state_path, "e2e-critical")

    assert first["applied"] is True
    assert second["idempotent"] is True
    assert first["seed_fingerprint"] == second["seed_fingerprint"]

    first_teardown = teardown_state(state_path, "e2e-critical")
    second_teardown = teardown_state(state_path, "e2e-critical")

    assert first_teardown["removed"] is True
    assert second_teardown["idempotent"] is True


def test_verification_checks_pass_after_expected_actions(tmp_path: Path):
    state_path = tmp_path / "runtime-state.json"
    seed_state(state_path, "e2e-critical")
    state = load_state(state_path)

    for action in (
        "accept-consent",
        "publish-draft-listing",
        "approve-negotiation",
        "release-escrow",
        "attach-advisory-citations",
        "acknowledge-alert",
        "approve-finance-case",
        "append-traceability-dispatch",
    ):
        state = apply_action(state, action, "admin-001")

    assert verify_check(state, "auth-onboarding")["passed"] is True
    assert verify_check(state, "listing-publish")["passed"] is True
    assert verify_check(state, "negotiation-approval")["passed"] is True
    assert verify_check(state, "escrow-release")["passed"] is True
    assert verify_check(state, "advisory-citations")["passed"] is True
    assert verify_check(state, "climate-ack")["passed"] is True
    assert verify_check(state, "finance-hitl")["passed"] is True
    assert verify_check(state, "traceability-dispatch")["passed"] is True
    assert verify_check(state, "admin-analytics")["passed"] is True
    assert verify_check(state, "full-critical")["passed"] is True


def test_seed_state_contains_required_staging_contract_ids():
    state = build_seed_state("e2e-critical")

    assert state["listings"]["listing-001"]["status"] == "published"
    assert state["negotiation"]["thread_id"] == "negotiation-001"
    assert state["finance"]["case_id"] == "finance-case-001"
    assert state["insurance"]["trigger_id"] == "insurance-trigger-001"
    assert state["traceability"]["consignment_id"] == "consignment-001"
