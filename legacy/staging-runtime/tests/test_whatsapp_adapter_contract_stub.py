"""Executable validation stub for B-005 WhatsApp adapter contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b005_whatsapp_adapter_contract.json"
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
        "status",
        "scope",
        "inbound_message",
        "intent_parser",
        "templates",
    }
    assert required.issubset(contract.keys())
    assert contract["bead_id"] == "B-005"


def test_contract_declares_required_message_fields_and_intents():
    contract = _load_contract()

    required_fields = set(contract["inbound_message"]["required_fields"])
    supported_intents = set(contract["intent_parser"]["supported_intents"])

    assert {"message_id", "contact_id", "message_type", "locale"} <= required_fields
    assert {
        "help",
        "create_listing",
        "negotiation_reply",
        "settlement_status",
        "unknown",
    } <= supported_intents


def test_contract_fallback_policy_matches_expected_channels():
    contract = _load_contract()

    fallback_policy = contract["templates"]["fallback_policy"]

    assert fallback_policy["delivery_failed"] == "sms"
    assert fallback_policy["session_window_expired"] == "sms"
    assert fallback_policy["network_degraded"] == "ussd"
