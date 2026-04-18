"""Executable validation stub for B-024 quality evidence attachments contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b024_quality_evidence_attachments_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_attachment_capture_scope():
    contract = _load_contract()

    assert contract["bead_id"] == "B-024"
    assert {"attachment_capture", "metadata_validation", "ux_state_coverage"} <= set(
        contract["scope"]["focus"]
    )


def test_contract_declares_required_fields_and_obligations():
    contract = _load_contract()

    assert {"attachment_id", "event_id", "metadata"} <= set(
        contract["attachment"]["required_fields"]
    )
    assert contract["test_obligations"]["journey"] == "CJ-007"
    assert contract["test_obligations"]["data_check"] == "DI-006"
