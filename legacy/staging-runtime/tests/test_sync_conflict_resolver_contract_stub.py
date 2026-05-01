"""Executable validation stub for B-041 sync conflict resolver contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b041_sync_conflict_resolver_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_deterministic_precedence_order():
    contract = _load_contract()

    assert contract["bead_id"] == "B-041"
    assert contract["precedence_order"] == [
        "session_parity",
        "policy_gate",
        "server_precedence",
        "client_retry",
    ]


def test_contract_declares_user_visible_resolution_states():
    contract = _load_contract()

    assert {
        "server_version_applied",
        "retry_ready",
        "session_refresh_required",
        "reauth_required",
        "manual_review_required",
    } <= set(contract["user_resolution_states"])


def test_contract_declares_android_test_obligations_and_audit_payload():
    contract = _load_contract()

    assert {"ARJ-003", "ARJ-005"} <= set(contract["test_obligations"]["journeys"])
    assert contract["test_obligations"]["data_check"] == "ARDI-003"
    assert {"conflict_type", "resolution_policy", "final_state"} <= set(
        contract["audit_payload_fields"]
    )
