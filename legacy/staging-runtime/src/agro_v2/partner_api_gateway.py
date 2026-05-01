"""B-026 partner API gateway and scoped credential authorization."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from itertools import count

from .audit_events import compute_event_hash, validate_persisted_audit_record
from .country_pack import resolve_country_policy
from .tool_contracts import ContractField, ContractValueType, ToolContract, ToolContractRegistry


class PartnerApiGatewayError(ValueError):
    """Raised when partner gateway inputs or authorization checks fail."""


class PartnerCredentialStatus(str, Enum):
    ACTIVE = "active"
    REVOKED = "revoked"


class PartnerScope(str, Enum):
    ANALYTICS_MART_READ = "analytics.mart.read"
    AUDIT_EVENTS_READ = "audit.events.read"


@dataclass(frozen=True)
class PartnerApiRoute:
    route_name: str
    endpoint: str
    required_scopes: tuple[PartnerScope, ...]
    data_domain: str
    journey_id: str

    def __post_init__(self) -> None:
        if not self.route_name.strip():
            raise PartnerApiGatewayError("route_name is required")
        if not self.endpoint.strip():
            raise PartnerApiGatewayError("endpoint is required")
        if not self.required_scopes:
            raise PartnerApiGatewayError("required_scopes must not be empty")
        if not self.data_domain.strip():
            raise PartnerApiGatewayError("data_domain is required")
        if not self.journey_id.strip():
            raise PartnerApiGatewayError("journey_id is required")


@dataclass(frozen=True)
class PartnerApiCredential:
    credential_id: str
    partner_id: str
    schema_version: str
    scopes: tuple[PartnerScope, ...]
    allowed_country_codes: tuple[str, ...]
    issued_at: str
    expires_at: str | None
    issued_by: str
    status: PartnerCredentialStatus = PartnerCredentialStatus.ACTIVE

    def __post_init__(self) -> None:
        if not self.credential_id.strip():
            raise PartnerApiGatewayError("credential_id is required")
        if not self.partner_id.strip():
            raise PartnerApiGatewayError("partner_id is required")
        if not self.schema_version.strip():
            raise PartnerApiGatewayError("schema_version is required")
        if not self.scopes:
            raise PartnerApiGatewayError("scopes must not be empty")
        if not self.allowed_country_codes:
            raise PartnerApiGatewayError("allowed_country_codes must not be empty")
        if not self.issued_at.strip():
            raise PartnerApiGatewayError("issued_at is required")
        if not self.issued_by.strip():
            raise PartnerApiGatewayError("issued_by is required")
        _parse_timestamp(self.issued_at)
        if self.expires_at is not None:
            _parse_timestamp(self.expires_at)
        for country_code in self.allowed_country_codes:
            resolve_country_policy(country_code)


@dataclass(frozen=True)
class PartnerApiRequest:
    request_id: str
    idempotency_key: str
    schema_version: str
    credential_id: str
    endpoint: str
    country_code: str
    actor_id: str

    def __post_init__(self) -> None:
        if not self.request_id.strip():
            raise PartnerApiGatewayError("request_id is required")
        if not self.idempotency_key.strip():
            raise PartnerApiGatewayError("idempotency_key is required")
        if not self.schema_version.strip():
            raise PartnerApiGatewayError("schema_version is required")
        if not self.credential_id.strip():
            raise PartnerApiGatewayError("credential_id is required")
        if not self.endpoint.strip():
            raise PartnerApiGatewayError("endpoint is required")
        if not self.country_code.strip():
            raise PartnerApiGatewayError("country_code is required")
        if not self.actor_id.strip():
            raise PartnerApiGatewayError("actor_id is required")


@dataclass(frozen=True)
class PartnerAuthorizationDecision:
    request_id: str
    route_name: str
    endpoint: str
    partner_id: str
    authorized_country_code: str
    granted_scopes: tuple[str, ...]
    audit_event_id: str
    data_check_id: str
    metadata: dict[str, object]

    def __post_init__(self) -> None:
        if not self.request_id.strip():
            raise PartnerApiGatewayError("request_id is required")
        if not self.route_name.strip():
            raise PartnerApiGatewayError("route_name is required")
        if not self.endpoint.strip():
            raise PartnerApiGatewayError("endpoint is required")
        if not self.partner_id.strip():
            raise PartnerApiGatewayError("partner_id is required")
        if not self.authorized_country_code.strip():
            raise PartnerApiGatewayError("authorized_country_code is required")
        if not self.granted_scopes:
            raise PartnerApiGatewayError("granted_scopes must not be empty")
        if not self.audit_event_id.strip():
            raise PartnerApiGatewayError("audit_event_id is required")
        if not self.data_check_id.strip():
            raise PartnerApiGatewayError("data_check_id is required")

    def as_payload(self) -> dict[str, object]:
        return {
            "request_id": self.request_id,
            "route_name": self.route_name,
            "endpoint": self.endpoint,
            "partner_id": self.partner_id,
            "authorized_country_code": self.authorized_country_code,
            "granted_scopes": list(self.granted_scopes),
            "audit_event_id": self.audit_event_id,
            "data_check_id": self.data_check_id,
            "metadata": dict(self.metadata),
        }


DEFAULT_PARTNER_API_ROUTES: tuple[PartnerApiRoute, ...] = (
    PartnerApiRoute(
        route_name="enterprise.analytics.mart.read",
        endpoint="/partner/v1/enterprise/analytics/mart",
        required_scopes=(PartnerScope.ANALYTICS_MART_READ,),
        data_domain="enterprise_analytics",
        journey_id="EP-005",
    ),
    PartnerApiRoute(
        route_name="compliance.audit.events.read",
        endpoint="/partner/v1/compliance/audit-events",
        required_scopes=(PartnerScope.AUDIT_EVENTS_READ,),
        data_domain="audit_events",
        journey_id="EP-005",
    ),
)


class PartnerApiGateway:
    """Issues scoped credentials and authorizes partner API routes."""

    def __init__(
        self,
        *,
        contract_registry: ToolContractRegistry | None = None,
        routes: tuple[PartnerApiRoute, ...] = DEFAULT_PARTNER_API_ROUTES,
        clock=None,
    ) -> None:
        self._contract_registry = contract_registry or ToolContractRegistry()
        self._routes = {route.endpoint: route for route in routes}
        self._clock = clock or (lambda: datetime.now(timezone.utc))
        self._credentials: dict[str, PartnerApiCredential] = {}
        self._idempotency_index: dict[str, tuple[tuple[object, ...], PartnerAuthorizationDecision]] = {}
        self._audit_records: tuple[dict[str, object], ...] = ()
        self._credential_id_factory = _default_id_factory("cred")
        self._audit_id_factory = _default_id_factory("aevt")
        self._register_default_contract()

    @property
    def audit_records(self) -> tuple[dict[str, object], ...]:
        return self._audit_records

    def issue_credential(
        self,
        *,
        partner_id: str,
        scopes: tuple[PartnerScope, ...],
        allowed_country_codes: tuple[str, ...],
        issued_by: str,
        schema_version: str = "partner-gateway.v1",
        expires_at: str | None = None,
    ) -> PartnerApiCredential:
        issued_at = self._clock().astimezone(timezone.utc).isoformat()
        credential = PartnerApiCredential(
            credential_id=self._credential_id_factory(),
            partner_id=partner_id,
            schema_version=schema_version,
            scopes=scopes,
            allowed_country_codes=tuple(country.upper() for country in allowed_country_codes),
            issued_at=issued_at,
            expires_at=expires_at,
            issued_by=issued_by,
        )
        self._credentials[credential.credential_id] = credential
        return credential

    def revoke_credential(self, credential_id: str) -> None:
        credential = self._get_credential(credential_id)
        self._credentials[credential_id] = PartnerApiCredential(
            credential_id=credential.credential_id,
            partner_id=credential.partner_id,
            schema_version=credential.schema_version,
            scopes=credential.scopes,
            allowed_country_codes=credential.allowed_country_codes,
            issued_at=credential.issued_at,
            expires_at=credential.expires_at,
            issued_by=credential.issued_by,
            status=PartnerCredentialStatus.REVOKED,
        )

    def authorize(self, request: PartnerApiRequest) -> PartnerAuthorizationDecision:
        payload = {
            "request_id": request.request_id,
            "idempotency_key": request.idempotency_key,
            "credential_id": request.credential_id,
            "endpoint": request.endpoint,
            "country_code": request.country_code.upper(),
            "actor_id": request.actor_id,
        }
        self._contract_registry.validate_input(
            tool_name="partner.api_gateway.authorize",
            version=request.schema_version,
            payload=payload,
        )

        fingerprint = (
            request.request_id,
            request.schema_version,
            request.credential_id,
            request.endpoint,
            request.country_code.upper(),
            request.actor_id,
        )
        cached = self._idempotency_index.get(request.idempotency_key)
        if cached is not None:
            cached_fingerprint, decision = cached
            if cached_fingerprint != fingerprint:
                raise PartnerApiGatewayError(
                    "idempotency_key already bound to different gateway request"
                )
            return decision

        route = self._get_route(request.endpoint)
        credential = self._get_credential(request.credential_id)
        self._assert_credential_is_usable(credential)
        country_code = request.country_code.upper()
        resolve_country_policy(country_code)
        if country_code not in credential.allowed_country_codes:
            raise PartnerApiGatewayError("credential does not allow requested country")
        granted_scopes = {scope.value for scope in credential.scopes}
        required_scopes = {scope.value for scope in route.required_scopes}
        if not required_scopes.issubset(granted_scopes):
            raise PartnerApiGatewayError("credential missing required scope for endpoint")

        audit_record = self._append_audit_record(
            actor_id=request.actor_id,
            credential=credential,
            route=route,
            country_code=country_code,
            request_id=request.request_id,
        )
        decision = PartnerAuthorizationDecision(
            request_id=request.request_id,
            route_name=route.route_name,
            endpoint=route.endpoint,
            partner_id=credential.partner_id,
            authorized_country_code=country_code,
            granted_scopes=tuple(sorted(required_scopes)),
            audit_event_id=str(audit_record["event_id"]),
            data_check_id="DI-003",
            metadata={
                "journey": route.journey_id,
                "credential_id": credential.credential_id,
                "data_domain": route.data_domain,
                "scope_count": len(required_scopes),
            },
        )
        self._contract_registry.validate_output(
            tool_name="partner.api_gateway.authorize",
            version=request.schema_version,
            payload=decision.as_payload(),
        )
        self._idempotency_index[request.idempotency_key] = (fingerprint, decision)
        return decision

    def _append_audit_record(
        self,
        *,
        actor_id: str,
        credential: PartnerApiCredential,
        route: PartnerApiRoute,
        country_code: str,
        request_id: str,
    ) -> dict[str, object]:
        previous_hash = (
            str(self._audit_records[-1]["event_hash"]) if self._audit_records else None
        )
        record = {
            "event_id": self._audit_id_factory(),
            "event_type": "partner_api.authorization_granted",
            "actor_id": actor_id,
            "schema_version": credential.schema_version,
            "occurred_at": self._clock().astimezone(timezone.utc).isoformat(),
            "payload": {
                "request_id": request_id,
                "partner_id": credential.partner_id,
                "credential_id": credential.credential_id,
                "route_name": route.route_name,
                "endpoint": route.endpoint,
                "country_code": country_code,
                "granted_scopes": [scope.value for scope in route.required_scopes],
            },
            "metadata": {
                "data_check_id": "DI-003",
                "journey": route.journey_id,
                "issued_by": credential.issued_by,
            },
            "previous_event_hash": previous_hash,
        }
        record["event_hash"] = compute_event_hash(record)
        validate_persisted_audit_record(record)
        self._audit_records = self._audit_records + (record,)
        return record

    def _assert_credential_is_usable(self, credential: PartnerApiCredential) -> None:
        if credential.status != PartnerCredentialStatus.ACTIVE:
            raise PartnerApiGatewayError("credential is not active")
        if credential.expires_at is None:
            return
        expires_at = _parse_timestamp(credential.expires_at)
        if expires_at <= self._clock().astimezone(timezone.utc):
            raise PartnerApiGatewayError("credential has expired")

    def _get_credential(self, credential_id: str) -> PartnerApiCredential:
        try:
            return self._credentials[credential_id]
        except KeyError as exc:
            raise PartnerApiGatewayError("credential_id is not registered") from exc

    def _get_route(self, endpoint: str) -> PartnerApiRoute:
        try:
            return self._routes[endpoint]
        except KeyError as exc:
            raise PartnerApiGatewayError("endpoint is not registered for partner access") from exc

    def _register_default_contract(self) -> None:
        try:
            self._contract_registry.register(
                ToolContract(
                    tool_name="partner.api_gateway.authorize",
                    version="partner-gateway.v1",
                    input_fields=(
                        ContractField("request_id", ContractValueType.STRING),
                        ContractField("idempotency_key", ContractValueType.STRING),
                        ContractField("credential_id", ContractValueType.STRING),
                        ContractField("endpoint", ContractValueType.STRING),
                        ContractField("country_code", ContractValueType.STRING),
                        ContractField("actor_id", ContractValueType.STRING),
                    ),
                    output_fields=(
                        ContractField("request_id", ContractValueType.STRING),
                        ContractField("route_name", ContractValueType.STRING),
                        ContractField("endpoint", ContractValueType.STRING),
                        ContractField("partner_id", ContractValueType.STRING),
                        ContractField("authorized_country_code", ContractValueType.STRING),
                        ContractField("granted_scopes", ContractValueType.ARRAY),
                        ContractField("audit_event_id", ContractValueType.STRING),
                        ContractField("data_check_id", ContractValueType.STRING),
                        ContractField("metadata", ContractValueType.OBJECT),
                    ),
                )
            )
        except ValueError:
            return


def _parse_timestamp(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise PartnerApiGatewayError("timestamp must be valid ISO 8601") from exc
    if parsed.tzinfo is None:
        raise PartnerApiGatewayError("timestamp must include timezone")
    return parsed.astimezone(timezone.utc)


def _default_id_factory(prefix: str):
    sequence = count(1)

    def factory() -> str:
        return f"{prefix}-{next(sequence):06d}"

    return factory
