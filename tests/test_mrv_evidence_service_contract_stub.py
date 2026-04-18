"""Executable validation stub for B-019 MRV evidence record contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b019_mrv_evidence_record_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_assumptions_provenance_and_audit_requirements():
    contract = _load_contract()

    assert contract["bead_id"] == "B-019"
    assert {"assumptions", "provenance", "audit_log"} <= set(contract["scope"]["focus"])
    assert {"source_signal_id", "provenance_key", "reconciliation_key"} <= set(
        contract["provenance_fields"]
    )


def test_contract_declares_mrv_test_obligations_and_persisted_fields():
    contract = _load_contract()

    assert {"audit_event_id", "audit_event_hash", "methodology"} <= set(contract["persisted_fields"])
    assert contract["test_obligations"]["journey"] == "EP-008"
    assert contract["test_obligations"]["data_check"] == "DI-006"
