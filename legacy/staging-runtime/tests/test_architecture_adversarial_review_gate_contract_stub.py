"""Executable validation stub for B-030 architecture adversarial review contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b030_architecture_adversarial_review_gate_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_required_architecture_checks():
    contract = _load_contract()

    assert contract["bead_id"] == "B-030"
    assert contract["gate"]["required_checklist_items"] == [
        "boundary_integrity",
        "scale_feasibility",
        "security_controls",
        "deployment_feasibility",
        "requirement_mapping",
    ]


def test_contract_declares_security_and_deployment_requirements():
    contract = _load_contract()

    assert contract["security"]["required_controls"] == [
        "auth_boundary",
        "data_isolation",
        "audit_logging",
        "secret_management",
    ]
    assert contract["deployment"]["required_environments"] == ["staging", "production"]
    assert contract["traceability"]["data_check"] == "architecture-to-requirement mapping completeness"


def test_contract_declares_b030_dependencies_and_test_obligations():
    contract = _load_contract()

    assert contract["dependencies"] == "B-001 to B-054 design docs"
    assert contract["test_obligations"]["unit"] == "architecture gate checklist completion"
    assert contract["test_obligations"]["journey"] == "n/a"
    assert contract["test_obligations"]["data_check"] == "architecture-to-requirement mapping completeness"
