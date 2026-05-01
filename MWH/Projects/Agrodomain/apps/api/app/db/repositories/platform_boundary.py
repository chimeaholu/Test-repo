from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.integrations import PartnerBoundaryDelivery, PartnerInboundRecord


class PlatformBoundaryRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_delivery(
        self,
        *,
        delivery_id: str,
        partner_slug: str,
        event_family: str,
        aggregate_id: str,
        delivery_mode: str,
        delivery_target: str,
        status: str,
        payload: dict[str, object],
        audit_event_id: int | None,
    ) -> PartnerBoundaryDelivery:
        record = PartnerBoundaryDelivery(
            delivery_id=delivery_id,
            partner_slug=partner_slug,
            event_family=event_family,
            aggregate_id=aggregate_id,
            delivery_mode=delivery_mode,
            delivery_target=delivery_target,
            status=status,
            payload=payload,
            audit_event_id=audit_event_id,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def create_inbound_record(
        self,
        *,
        ingest_id: str,
        partner_slug: str,
        partner_record_id: str,
        adapter_key: str,
        data_product: str,
        subject_type: str,
        subject_ref: str,
        country_code: str,
        scope_ids: list[str],
        contains_personal_data: bool,
        payload: dict[str, object],
        provenance: dict[str, object],
        consent_artifact: dict[str, object] | None,
        status: str,
        reason_code: str | None,
        audit_event_id: int | None,
    ) -> PartnerInboundRecord:
        record = PartnerInboundRecord(
            ingest_id=ingest_id,
            partner_slug=partner_slug,
            partner_record_id=partner_record_id,
            adapter_key=adapter_key,
            data_product=data_product,
            subject_type=subject_type,
            subject_ref=subject_ref,
            country_code=country_code,
            scope_ids=scope_ids,
            contains_personal_data=contains_personal_data,
            payload=payload,
            provenance=provenance,
            consent_artifact=consent_artifact,
            status=status,
            reason_code=reason_code,
            audit_event_id=audit_event_id,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def inbound_status_counts(self, *, partner_slug: str) -> dict[str, int]:
        rows = self.session.execute(
            select(PartnerInboundRecord.status, func.count())
            .where(PartnerInboundRecord.partner_slug == partner_slug)
            .group_by(PartnerInboundRecord.status)
        ).all()
        counts = {"accepted": 0, "rejected": 0}
        for status, count in rows:
            counts[str(status)] = int(count)
        return counts

    def delivery_status_counts(self, *, partner_slug: str) -> dict[str, int]:
        rows = self.session.execute(
            select(PartnerBoundaryDelivery.status, func.count())
            .where(PartnerBoundaryDelivery.partner_slug == partner_slug)
            .group_by(PartnerBoundaryDelivery.status)
        ).all()
        counts = {"queued": 0, "published": 0}
        for status, count in rows:
            counts[str(status)] = int(count)
        return counts
