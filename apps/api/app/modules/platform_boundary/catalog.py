from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.audit import AuditEvent

CATALOG_VERSION = "2026-04-29.eh5"
CATALOG_GENERATED_AT = "2026-04-29T00:00:00+00:00"


@dataclass(frozen=True)
class AdapterBoundaryDefinition:
    adapter_key: str
    delivery_mode: str
    ownership: str
    supports_replay: bool
    max_batch_size: int | None
    status: str
    consent_required: bool
    consent_scope_ids: tuple[str, ...]
    consent_rationale: str

    def as_dict(self) -> dict[str, Any]:
        schema_version = get_envelope_schema_version()
        return {
            "schema_version": schema_version,
            "adapter_key": self.adapter_key,
            "delivery_mode": self.delivery_mode,
            "authentication": "bearer_token",
            "ownership": self.ownership,
            "supports_replay": self.supports_replay,
            "max_batch_size": self.max_batch_size,
            "status": self.status,
            "consent": {
                "schema_version": schema_version,
                "required": self.consent_required,
                "scope_ids": list(self.consent_scope_ids),
                "rationale": self.consent_rationale,
            },
        }


@dataclass(frozen=True)
class EventFamilyDefinition:
    event_family: str
    version: str
    owning_domain: str
    ownership: str
    description: str
    data_classification: str
    contains_personal_data: bool
    adapter_boundaries: tuple[AdapterBoundaryDefinition, ...]

    def as_dict(self) -> dict[str, Any]:
        schema_version = get_envelope_schema_version()
        return {
            "schema_version": schema_version,
            "event_family": self.event_family,
            "version": self.version,
            "owning_domain": self.owning_domain,
            "ownership": self.ownership,
            "description": self.description,
            "data_classification": self.data_classification,
            "contains_personal_data": self.contains_personal_data,
            "adapter_boundaries": [boundary.as_dict() for boundary in self.adapter_boundaries],
        }


EVENT_FAMILY_CATALOG: tuple[EventFamilyDefinition, ...] = (
    EventFamilyDefinition(
        event_family="identity.session.v1",
        version="v1",
        owning_domain="identity",
        ownership="platform-integrations",
        description="Identity session, consent, and account state transitions available to vetted partner consumers.",
        data_classification="identity",
        contains_personal_data=True,
        adapter_boundaries=(
            AdapterBoundaryDefinition(
                adapter_key="partner.identity.pull_v1",
                delivery_mode="api_pull",
                ownership="platform-integrations",
                supports_replay=True,
                max_batch_size=50,
                status="pilot",
                consent_required=True,
                consent_scope_ids=("identity.core", "workflow.audit"),
                consent_rationale="Identity-derived payloads remain scoped to explicit consent coverage.",
            ),
        ),
    ),
    EventFamilyDefinition(
        event_family="marketplace.transaction.v1",
        version="v1",
        owning_domain="marketplace",
        ownership="platform-integrations",
        description="Marketplace listing, negotiation, and transaction state changes for downstream reporting partners.",
        data_classification="marketplace",
        contains_personal_data=False,
        adapter_boundaries=(
            AdapterBoundaryDefinition(
                adapter_key="partner.marketplace.pull_v1",
                delivery_mode="api_pull",
                ownership="platform-integrations",
                supports_replay=True,
                max_batch_size=100,
                status="active",
                consent_required=False,
                consent_scope_ids=(),
                consent_rationale="Payload is operational and aggregate-safe.",
            ),
            AdapterBoundaryDefinition(
                adapter_key="partner.marketplace.webhook_v1",
                delivery_mode="webhook",
                ownership="platform-integrations",
                supports_replay=False,
                max_batch_size=None,
                status="active",
                consent_required=False,
                consent_scope_ids=(),
                consent_rationale="Webhook body is bounded to operational listing and thread state.",
            ),
        ),
    ),
    EventFamilyDefinition(
        event_family="transport.dispatch.v1",
        version="v1",
        owning_domain="transport",
        ownership="platform-integrations",
        description="Dispatch and shipment lifecycle updates for logistics-capacity and reporting partners.",
        data_classification="transport",
        contains_personal_data=False,
        adapter_boundaries=(
            AdapterBoundaryDefinition(
                adapter_key="partner.transport.pull_v1",
                delivery_mode="api_pull",
                ownership="platform-integrations",
                supports_replay=True,
                max_batch_size=100,
                status="active",
                consent_required=False,
                consent_scope_ids=(),
                consent_rationale="Dispatch updates are operational transport state only.",
            ),
            AdapterBoundaryDefinition(
                adapter_key="partner.transport.reporting_v1",
                delivery_mode="reporting",
                ownership="platform-integrations",
                supports_replay=True,
                max_batch_size=500,
                status="pilot",
                consent_required=False,
                consent_scope_ids=(),
                consent_rationale="Reporting export is aggregate and corridor oriented.",
            ),
        ),
    ),
    EventFamilyDefinition(
        event_family="climate.alert.v1",
        version="v1",
        owning_domain="climate",
        ownership="platform-integrations",
        description="Climate alert and degraded-mode signals for external partner alerting and audit trails.",
        data_classification="climate",
        contains_personal_data=False,
        adapter_boundaries=(
            AdapterBoundaryDefinition(
                adapter_key="partner.climate.pull_v1",
                delivery_mode="api_pull",
                ownership="platform-integrations",
                supports_replay=True,
                max_batch_size=100,
                status="active",
                consent_required=False,
                consent_scope_ids=(),
                consent_rationale="Alert payloads remain farm-signal oriented without person enrichment.",
            ),
        ),
    ),
    EventFamilyDefinition(
        event_family="finance.escrow.v1",
        version="v1",
        owning_domain="finance",
        ownership="platform-integrations",
        description="Escrow and settlement boundary events used for partner sandbox confirmation and reporting.",
        data_classification="finance",
        contains_personal_data=False,
        adapter_boundaries=(
            AdapterBoundaryDefinition(
                adapter_key="partner.finance.webhook_v1",
                delivery_mode="webhook",
                ownership="platform-integrations",
                supports_replay=False,
                max_batch_size=None,
                status="pilot",
                consent_required=False,
                consent_scope_ids=(),
                consent_rationale="Escrow partner events are bounded to transaction state and references.",
            ),
        ),
    ),
)

EVENT_FAMILY_INDEX = {item.event_family: item for item in EVENT_FAMILY_CATALOG}


def catalog_payload() -> dict[str, Any]:
    schema_version = get_envelope_schema_version()
    return {
        "schema_version": schema_version,
        "catalog_version": CATALOG_VERSION,
        "generated_at": CATALOG_GENERATED_AT,
        "items": [item.as_dict() for item in EVENT_FAMILY_CATALOG],
    }


def resolve_event_family(event: AuditEvent) -> str | None:
    command_name = (event.command_name or "").lower()
    event_type = event.event_type.lower()
    payload = event.payload if isinstance(event.payload, dict) else {}
    if command_name.startswith("marketplace.") or "listing_id" in payload or "thread_id" in payload:
        return "marketplace.transaction.v1"
    if command_name.startswith("transport.") or "shipment_id" in payload or "load_id" in payload:
        return "transport.dispatch.v1"
    if command_name.startswith("climate.") or "alert_id" in payload or "farm_profile_id" in payload:
        return "climate.alert.v1"
    if command_name.startswith("wallets.") or command_name.startswith("fund.") or "escrow_id" in payload:
        return "finance.escrow.v1"
    if command_name.startswith("identity.") or event_type.startswith("identity.") or "consent" in payload:
        return "identity.session.v1"
    return None


def serialize_outbound_event(*, event: AuditEvent, partner_slug: str) -> dict[str, Any] | None:
    event_family = resolve_event_family(event)
    if event_family is None:
        return None
    schema_version = get_envelope_schema_version()
    payload = event.payload if isinstance(event.payload, dict) else {}
    country_code = payload.get("country_code")
    occurred_at = event.created_at
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=UTC)
    return {
        "schema_version": schema_version,
        "event_id": f"audit-{event.id}",
        "event_family": event_family,
        "partner_slug": partner_slug,
        "aggregate_id": str(payload.get("listing_id") or payload.get("thread_id") or payload.get("shipment_id") or payload.get("escrow_id") or event.id),
        "aggregate_type": "audit_event",
        "event_type": event.event_type,
        "status": event.status,
        "country_code": str(country_code).upper() if isinstance(country_code, str) else None,
        "occurred_at": occurred_at.astimezone(UTC).isoformat(),
        "payload": payload,
    }


def serialize_outbound_events(*, events: Iterable[AuditEvent], partner_slug: str) -> list[dict[str, Any]]:
    serialized: list[dict[str, Any]] = []
    for event in events:
        item = serialize_outbound_event(event=event, partner_slug=partner_slug)
        if item is not None:
            serialized.append(item)
    return serialized


def utcnow_iso() -> str:
    return datetime.now(tz=UTC).isoformat()
