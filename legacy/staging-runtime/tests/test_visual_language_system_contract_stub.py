"""Executable validation stub for B-050 visual language system contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b050_visual_language_system_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_visual_token_focus():
    contract = _load_contract()

    assert contract["bead_id"] == "B-050"
    assert {"typography_tokens", "color_tokens", "spacing_rules"} <= set(
        contract["scope"]["focus"]
    )


def test_contract_declares_ux_obligations():
    contract = _load_contract()

    assert {"theme_name", "typography", "colors", "spacing"} <= set(
        contract["system_snapshot"]["required_fields"]
    )
    assert contract["test_obligations"]["journey"] == "UXJ-001"
    assert contract["test_obligations"]["ux_quality"] == "UXJ-002 + UXDI-002"
    assert contract["test_obligations"]["data_check"] == "UXDI-001"
