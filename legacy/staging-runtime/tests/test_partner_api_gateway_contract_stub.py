"""Executable validation stub for B-026 partner API gateway contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b026_partner_api_gateway_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_scoped_credential_focus():
    contract = _load_contract()

    assert contract["bead_id"] == "B-026"
    assert contract["tool_name"] == "partner.api_gateway.authorize"
    assert {"scoped_credentials", "enterprise_partner_api", "append_only_access_audit"} <= set(
        contract["scope"]["focus"]
    )


def test_contract_declares_required_fields_and_obligations():
    contract = _load_contract()

    assert {"credential_id", "endpoint", "country_code"} <= set(
        contract["input"]["required_fields"]
    )
    assert {"route_name", "granted_scopes", "audit_event_id"} <= set(
        contract["output"]["required_fields"]
    )
    assert contract["test_obligations"]["journey"] == "EP-005"
    assert contract["test_obligations"]["data_check"] == "DI-003"
