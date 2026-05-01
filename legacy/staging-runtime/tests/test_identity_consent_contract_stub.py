"""Executable validation stub for B-002 identity/consent contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b002_identity_consent_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_identity_states_and_lifecycle():
    contract = _load_contract()

    assert contract["bead_id"] == "B-002"
    assert contract["state_machine"]["states"] == [
        "identified",
        "consent_pending",
        "consent_granted",
        "consent_revoked",
    ]
    assert contract["state_machine"]["allowed_transitions"] == {
        "identified": ["consent_pending", "consent_granted"],
        "consent_pending": ["consent_granted"],
        "consent_granted": ["consent_revoked"],
    }


def test_contract_declares_required_capture_fields():
    contract = _load_contract()

    assert contract["consent_capture"]["required_fields"] == [
        "policy_version",
        "scope_ids",
        "channel",
        "captured_at",
    ]
    assert contract["consent_capture"]["data_check"] == "DI-004"


def test_contract_declares_b002_dependencies_and_test_obligations():
    contract = _load_contract()

    assert contract["dependencies"] == ["B-001"]
    assert contract["test_obligations"]["unit"] == "consent lifecycle transitions"
    assert contract["test_obligations"]["journey"] == "CJ-001"
    assert contract["test_obligations"]["data_check"] == "DI-004"
