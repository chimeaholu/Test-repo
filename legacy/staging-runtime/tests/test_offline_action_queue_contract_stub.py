"""Executable validation stub for B-040 offline action queue contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b040_offline_action_queue_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_enqueue_replay_and_dedupe_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-040"
    assert {
        "enqueue",
        "replay",
        "dedupe",
        "reconciliation",
    } <= set(contract["scope"]["focus"])


def test_contract_declares_android_queue_state_model_and_conflict_placeholder():
    contract = _load_contract()

    assert {
        "queued",
        "replaying",
        "synced",
        "failed_retryable",
        "failed_terminal",
        "conflicted",
    } <= set(contract["queue_state_model"]["statuses"])
    assert contract["queue_state_model"]["conflict_state"] == "b041_follow_on"


def test_contract_declares_android_test_obligations():
    contract = _load_contract()

    assert contract["test_obligations"]["journey"] == "ARJ-002"
    assert contract["test_obligations"]["data_check"] == "ARDI-002"

