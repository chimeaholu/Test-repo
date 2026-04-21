import pytest

from agro_v2.partner_api_gateway import (
    PartnerApiGateway,
    PartnerApiGatewayError,
    PartnerApiRequest,
    PartnerScope,
)
from agro_v2.tool_contracts import ToolContractRegistry


def build_gateway(**overrides) -> PartnerApiGateway:
    clock = overrides.pop("clock", None) or (lambda: _ts("2026-04-13T09:05:00+00:00"))
    return PartnerApiGateway(clock=clock, **overrides)


def build_request(**overrides) -> PartnerApiRequest:
    payload = {
        "request_id": "pag-026-1",
        "idempotency_key": "idem-026-1",
        "schema_version": "partner-gateway.v1",
        "credential_id": "cred-000001",
        "endpoint": "/partner/v1/enterprise/analytics/mart",
        "country_code": "GH",
        "actor_id": "svc-partner-gateway",
    }
    payload.update(overrides)
    return PartnerApiRequest(**payload)


def _ts(value: str):
    from datetime import datetime

    return datetime.fromisoformat(value)


def test_gateway_authorizes_analytics_route_and_appends_audit_chain():
    gateway = build_gateway()
    credential = gateway.issue_credential(
        partner_id="coop-analytics",
        scopes=(PartnerScope.ANALYTICS_MART_READ,),
        allowed_country_codes=("GH",),
        issued_by="ops-026",
    )

    decision = gateway.authorize(build_request(credential_id=credential.credential_id))

    assert decision.route_name == "enterprise.analytics.mart.read"
    assert decision.partner_id == "coop-analytics"
    assert decision.granted_scopes == ("analytics.mart.read",)
    assert decision.data_check_id == "DI-003"
    assert len(gateway.audit_records) == 1
    assert gateway.audit_records[0]["previous_event_hash"] is None


def test_gateway_enforces_required_scope_and_country_scoping():
    gateway = build_gateway()
    country_limited = gateway.issue_credential(
        partner_id="ops-audit",
        scopes=(PartnerScope.AUDIT_EVENTS_READ,),
        allowed_country_codes=("NG",),
        issued_by="ops-026",
    )

    with pytest.raises(PartnerApiGatewayError, match="requested country"):
        gateway.authorize(
            build_request(
                credential_id=country_limited.credential_id,
                country_code="GH",
                endpoint="/partner/v1/compliance/audit-events",
            )
        )

    scope_limited = gateway.issue_credential(
        partner_id="ops-audit",
        scopes=(PartnerScope.AUDIT_EVENTS_READ,),
        allowed_country_codes=("GH",),
        issued_by="ops-026",
    )

    with pytest.raises(PartnerApiGatewayError, match="required scope"):
        gateway.authorize(
            build_request(
                credential_id=scope_limited.credential_id,
                request_id="pag-026-2",
                idempotency_key="idem-026-2",
            )
        )


def test_gateway_rejects_expired_or_revoked_credentials():
    gateway = build_gateway()
    expired = gateway.issue_credential(
        partner_id="coop-expired",
        scopes=(PartnerScope.ANALYTICS_MART_READ,),
        allowed_country_codes=("GH",),
        issued_by="ops-026",
        expires_at="2026-04-13T09:04:59+00:00",
    )

    with pytest.raises(PartnerApiGatewayError, match="expired"):
        gateway.authorize(build_request(credential_id=expired.credential_id))

    active = gateway.issue_credential(
        partner_id="coop-revoked",
        scopes=(PartnerScope.ANALYTICS_MART_READ,),
        allowed_country_codes=("GH",),
        issued_by="ops-026",
    )
    gateway.revoke_credential(active.credential_id)

    with pytest.raises(PartnerApiGatewayError, match="not active"):
        gateway.authorize(
            build_request(
                credential_id=active.credential_id,
                request_id="pag-026-2",
                idempotency_key="idem-026-2",
            )
        )


def test_gateway_idempotency_replays_same_response_and_rejects_payload_drift():
    gateway = build_gateway()
    credential = gateway.issue_credential(
        partner_id="coop-analytics",
        scopes=(PartnerScope.ANALYTICS_MART_READ,),
        allowed_country_codes=("GH",),
        issued_by="ops-026",
    )
    request = build_request(credential_id=credential.credential_id)

    first = gateway.authorize(request)
    replay = gateway.authorize(request)

    assert replay == first
    assert len(gateway.audit_records) == 1

    with pytest.raises(PartnerApiGatewayError, match="idempotency_key already bound"):
        gateway.authorize(
            build_request(
                credential_id=credential.credential_id,
                endpoint="/partner/v1/compliance/audit-events",
            )
        )


def test_gateway_registers_contract_with_registry():
    registry = ToolContractRegistry()
    gateway = build_gateway(contract_registry=registry)
    credential = gateway.issue_credential(
        partner_id="coop-analytics",
        scopes=(PartnerScope.ANALYTICS_MART_READ,),
        allowed_country_codes=("GH",),
        issued_by="ops-026",
    )

    decision = gateway.authorize(build_request(credential_id=credential.credential_id))
    contract = registry.get("partner.api_gateway.authorize", "partner-gateway.v1")

    assert contract.tool_name == "partner.api_gateway.authorize"
    assert decision.metadata["data_domain"] == "enterprise_analytics"
