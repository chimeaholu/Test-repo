from sqlalchemy import select

from app.db.models.audit import AuditEvent, OutboxMessage
from app.db.models.integrations import PartnerBoundaryDelivery, PartnerInboundRecord


def _partner_headers() -> dict[str, str]:
    return {"Authorization": "Bearer partner-test-token"}


def test_platform_boundary_catalog_outbound_and_webhook_surfaces_are_partner_auth_audited(
    client, session
) -> None:
    session.add(
        AuditEvent(
            request_id="req-platform-boundary-1",
            actor_id="actor-farmer-gh-ama",
            event_type="command.accepted",
            command_name="marketplace.listings.publish",
            status="accepted",
            reason_code=None,
            schema_version="2026-04-29.eh5",
            idempotency_key="idem-platform-boundary-1",
            correlation_id="corr-platform-boundary-1",
            payload={"listing_id": "listing-eh5-001", "country_code": "GH"},
        )
    )
    session.commit()

    catalog_response = client.get("/api/v1/platform-boundary/events/catalog", headers=_partner_headers())
    outbound_response = client.get("/api/v1/platform-boundary/outbound/events", headers=_partner_headers())
    webhook_response = client.post(
        "/api/v1/platform-boundary/outbound/webhooks",
        headers=_partner_headers(),
        json={
            "event_family": "marketplace.transaction.v1",
            "aggregate_id": "listing-eh5-001",
            "delivery_target": "https://example.com/webhooks/agro",
            "reason": "Partner requested outbound notification coverage.",
        },
    )

    assert catalog_response.status_code == 200
    assert catalog_response.json()["catalog_version"] == "2026-04-29.eh5"
    assert any(
        item["event_family"] == "marketplace.transaction.v1"
        for item in catalog_response.json()["items"]
    )

    assert outbound_response.status_code == 200
    assert outbound_response.json()["partner_slug"] == "insights-hub"
    assert any(
        item["event_family"] == "marketplace.transaction.v1"
        and item["aggregate_id"] == "listing-eh5-001"
        for item in outbound_response.json()["items"]
    )

    assert webhook_response.status_code == 200
    assert webhook_response.json()["status"] == "queued"
    assert webhook_response.json()["delivery_mode"] == "webhook"

    deliveries = session.execute(select(PartnerBoundaryDelivery)).scalars().all()
    assert len(deliveries) == 1
    assert deliveries[0].event_family == "marketplace.transaction.v1"

    outbox = session.execute(
        select(OutboxMessage).where(OutboxMessage.event_type == "partner.webhook.queued")
    ).scalars().all()
    assert len(outbox) == 1

    partner_events = session.execute(
        select(AuditEvent)
        .where(AuditEvent.actor_id == "partner:insights-hub")
        .order_by(AuditEvent.id.asc())
    ).scalars().all()
    assert [event.event_type for event in partner_events] == [
        "platform_boundary.catalog.read",
        "platform_boundary.outbound.read",
        "platform_boundary.webhook.queued",
    ]


def test_platform_boundary_inbound_ingestion_enforces_consent_and_reports_counts(client, session) -> None:
    rejected_response = client.post(
        "/api/v1/platform-boundary/inbound/records",
        headers=_partner_headers(),
        json={
            "partner_record_id": "partner-record-rejected",
            "adapter_key": "partner.ingestion.v1",
            "data_product": "identity.profile_patch",
            "subject_type": "person_profile",
            "subject_ref": "actor-gh-001",
            "country_code": "GH",
            "scope_ids": ["identity.core"],
            "contains_personal_data": True,
            "occurred_at": "2026-04-29T00:00:00Z",
            "provenance": {
                "source_id": "crm-rejected",
                "collected_at": "2026-04-29T00:00:00Z",
                "collection_method": "secure_file_drop",
                "legal_basis": "contractual_partner_feed",
            },
            "payload": {"email": "ama@example.com"},
        },
    )
    accepted_response = client.post(
        "/api/v1/platform-boundary/inbound/records",
        headers=_partner_headers(),
        json={
            "partner_record_id": "partner-record-accepted",
            "adapter_key": "partner.ingestion.v1",
            "data_product": "identity.profile_patch",
            "subject_type": "person_profile",
            "subject_ref": "actor-gh-002",
            "country_code": "GH",
            "scope_ids": ["identity.core", "workflow.audit"],
            "contains_personal_data": True,
            "occurred_at": "2026-04-29T00:00:00Z",
            "provenance": {
                "source_id": "crm-accepted",
                "collected_at": "2026-04-29T00:00:00Z",
                "collection_method": "secure_file_drop",
                "legal_basis": "contractual_partner_feed",
                "checksum": "sha256:accepted",
            },
            "consent_artifact": {
                "policy_version": "2026.04.w1",
                "country_code": "GH",
                "status": "granted",
                "scope_ids": ["identity.core", "workflow.audit"],
                "subject_ref": "actor-gh-002",
                "captured_at": "2026-04-28T00:00:00Z",
            },
            "payload": {"email": "akosua@example.com"},
        },
    )
    summary_response = client.get("/api/v1/platform-boundary/reporting/summary", headers=_partner_headers())

    assert rejected_response.status_code == 422
    assert rejected_response.json()["detail"]["status"] == "rejected"
    assert rejected_response.json()["detail"]["reason_code"] == "missing_consent_artifact"
    assert rejected_response.json()["detail"]["consent_status"] == "missing"

    assert accepted_response.status_code == 200
    assert accepted_response.json()["status"] == "accepted"
    assert accepted_response.json()["consent_status"] == "verified"

    assert summary_response.status_code == 200
    assert summary_response.json()["inbound_ingestion"] == {"accepted": 1, "rejected": 1}

    records = session.execute(
        select(PartnerInboundRecord).order_by(PartnerInboundRecord.id.asc())
    ).scalars().all()
    assert len(records) == 2
    assert [record.status for record in records] == ["rejected", "accepted"]

    accepted_outbox = session.execute(
        select(OutboxMessage).where(OutboxMessage.event_type == "partner.ingestion.accepted")
    ).scalars().all()
    assert len(accepted_outbox) == 1

    ingestion_audit_events = session.execute(
        select(AuditEvent)
        .where(AuditEvent.actor_id == "partner:insights-hub")
        .where(AuditEvent.event_type.like("platform_boundary.ingestion.%"))
        .order_by(AuditEvent.id.asc())
    ).scalars().all()
    assert [event.event_type for event in ingestion_audit_events] == [
        "platform_boundary.ingestion.rejected",
        "platform_boundary.ingestion.accepted",
    ]
