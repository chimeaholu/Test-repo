"""Executable validation stub for B-038 adversarial intelligence gate contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b038_adversarial_intelligence_gate.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_required_checklist_items():
    contract = _load_contract()

    checklist_items = set(contract["gate"]["required_checklist_items"])

    assert contract["bead_id"] == "B-038"
    assert {
        "planner_gate",
        "verifier_audit",
        "memory_revalidation",
        "router_escalation",
        "eval_benchmark",
        "traceability",
    } <= checklist_items


def test_contract_declares_required_traceability_ids():
    contract = _load_contract()

    required_ids = set(contract["traceability"]["required_ids"])

    assert {
        "AIJ-001",
        "AIJ-006",
        "IDI-001",
        "IDI-005",
    } <= required_ids


def test_contract_declares_eval_thresholds():
    contract = _load_contract()

    assert contract["eval_thresholds"]["minimum_average_score"] == 0.85
    assert contract["eval_thresholds"]["minimum_fixture_count"] == 2
