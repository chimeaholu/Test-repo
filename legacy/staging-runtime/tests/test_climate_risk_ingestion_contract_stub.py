"""Executable validation stub for B-017 climate ingestion contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b017_climate_risk_ingestion_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_weather_and_satellite_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-017"
    assert {"weather", "satellite"} <= set(contract["scope"]["sources"])


def test_contract_declares_provenance_and_reconciliation_fields():
    contract = _load_contract()

    assert {
        "signal_id",
        "provenance_key",
        "reconciliation_key",
        "confidence",
    } <= set(contract["normalized_signal"]["required_fields"])


def test_contract_declares_climate_test_obligations():
    contract = _load_contract()

    assert contract["test_obligations"]["journey"] == "CJ-006"
    assert contract["test_obligations"]["data_check"] == "DI-006"

