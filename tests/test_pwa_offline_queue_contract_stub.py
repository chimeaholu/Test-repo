"""Executable validation stub for B-006 PWA offline queue contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b006_pwa_offline_queue_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_has_required_top_level_fields():
    contract = _load_contract()
    required = {
        "bead_id",
        "name",
        "version",
        "scope",
        "queue_item",
        "transitions",
        "dedupe",
        "replay_policy",
        "connectivity",
        "telemetry",
    }
    assert required.issubset(contract.keys())
    assert contract["bead_id"] == "B-006"


def test_queue_state_machine_stub_invariants():
    contract = _load_contract()
    states = set(contract["queue_item"]["state_enum"])
    transitions = contract["transitions"]

    # Stub invariant: every state has a transition entry and no unknown targets.
    assert states == set(transitions.keys())
    for source_state, targets in transitions.items():
        assert source_state in states
        assert set(targets).issubset(states)

    # Stub invariant: terminal states should not transition further.
    for terminal in ("acked", "failed_terminal", "cancelled"):
        assert transitions[terminal] == []


def test_replay_and_dedupe_stub_defaults():
    contract = _load_contract()
    replay_policy = contract["replay_policy"]
    dedupe_policy = contract["dedupe"]

    assert replay_policy["max_attempts"] >= 1
    assert replay_policy["ordering"] == "created_at_asc"
    assert dedupe_policy["strategy"] == "idempotency_key"
