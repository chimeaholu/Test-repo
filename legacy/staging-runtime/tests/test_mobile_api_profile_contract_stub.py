"""Executable validation stub for B-039 mobile API profile contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b039_mobile_api_profile_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_versioning_and_budget_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-039"
    assert contract["versioning"]["strategy"] == "backward_compatible_profile_negotiation"
    assert {"payload_budget", "pagination", "resumable_operations"} <= set(
        contract["scope"]["focus"]
    )


def test_contract_declares_android_budget_and_pagination_limits():
    contract = _load_contract()

    budgets = contract["payload_budgets"]

    assert budgets["market.listings.index"]["max_bytes"] == 240
    assert budgets["market.listings.index"]["max_items"] == 3
    assert contract["pagination"]["max_page_size"] == 50


def test_contract_declares_resumable_operation_requirements():
    contract = _load_contract()

    operation = contract["resumable_operations"]["market.offers.mutate"]

    assert operation["operation_token_required"] is True
    assert operation["token_ttl_seconds"] == 900
    assert {"ARJ-001", "ARJ-004"} <= set(contract["test_obligations"]["journeys"])
    assert contract["test_obligations"]["data_check"] == "ARDI-001"
