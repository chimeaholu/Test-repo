"""Executable validation stub for B-013 settlement notification contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b013_settlement_notification_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_channel_and_fallback_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-013"
    assert contract["scope"]["primary_channel"] == "whatsapp"
    assert contract["scope"]["fallback_channel"] == "sms"


def test_contract_lists_required_status_coverage():
    contract = _load_contract()

    supported_statuses = set(contract["settlement_status"]["supported_statuses"])

    assert {
        "funding_pending",
        "funded",
        "released",
        "reversed",
        "disputed",
    } <= supported_statuses


def test_contract_fallback_triggers_match_expected_error_paths():
    contract = _load_contract()

    fallback_triggers = set(contract["fallback_policy"]["trigger_conditions"])

    assert {
        "delivery_failed",
        "session_window_expired",
        "network_degraded",
    } <= fallback_triggers
