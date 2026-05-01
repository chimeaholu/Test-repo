"""Executable validation stub for B-043 notification broker contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b043_notification_broker_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_unified_channel_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-043"
    assert {"whatsapp", "sms", "push"} <= set(contract["scope"]["channels"])


def test_contract_declares_delivery_state_parity():
    contract = _load_contract()

    assert {
        "queued",
        "sent",
        "fallback_sent",
        "action_required",
        "failed",
    } <= set(contract["delivery_state_model"])
    assert contract["push_policy"]["profile_endpoint"] == "notifications.push.deliver"


def test_contract_declares_android_test_obligations():
    contract = _load_contract()

    assert {"ARJ-004", "EP-003"} <= set(contract["test_obligations"]["journeys"])
    assert contract["test_obligations"]["data_check"] == "ARDI-005"

