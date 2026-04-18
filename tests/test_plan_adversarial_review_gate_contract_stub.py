"""Executable validation stub for B-029 plan adversarial review contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b029_plan_adversarial_review_gate_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_required_checklist_items():
    contract = _load_contract()

    assert contract["bead_id"] == "B-029"
    assert contract["gate"]["required_checklist_items"] == [
        "scope_alignment",
        "dependency_integrity",
        "test_coverage",
        "traceability_matrix",
        "blocker_classification",
    ]


def test_contract_declares_traceability_matrix_fields():
    contract = _load_contract()

    assert contract["traceability"]["required_fields"] == [
        "workflow_specs",
        "risk_controls",
        "test_expansion_items",
    ]
    assert contract["traceability"]["data_check"] == "traceability matrix integrity"


def test_contract_declares_b029_dependencies_and_test_obligations():
    contract = _load_contract()

    assert contract["dependencies"] == "B-001 to B-054 design docs"
    assert contract["test_obligations"]["unit"] == "review checklist completion"
    assert contract["test_obligations"]["journey"] == "n/a"
    assert contract["test_obligations"]["data_check"] == "traceability matrix integrity"
