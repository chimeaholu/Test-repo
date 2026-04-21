from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.traceability import ConsignmentRecord, TraceabilityEventRecord

TraceMilestone = Literal[
    "harvested",
    "handoff_confirmed",
    "dispatched",
    "in_transit",
    "delivered",
    "exception_logged",
]


class TraceabilityContinuityError(ValueError):
    def __init__(self, reason_code: str, *, details: dict[str, object]) -> None:
        super().__init__(reason_code)
        self.reason_code = reason_code
        self.details = details


class TraceabilityRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_consignment(
        self,
        *,
        actor_id: str,
        country_code: str,
        correlation_id: str,
        partner_reference_id: str | None,
        current_custody_actor_id: str | None,
    ) -> ConsignmentRecord:
        record = ConsignmentRecord(
            consignment_id=f"consignment-{uuid4().hex[:12]}",
            actor_id=actor_id,
            country_code=country_code,
            partner_reference_id=partner_reference_id,
            status="draft",
            current_custody_actor_id=current_custody_actor_id or actor_id,
            correlation_id=correlation_id,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def get_consignment(self, *, consignment_id: str) -> ConsignmentRecord | None:
        return self.session.execute(
            select(ConsignmentRecord).where(ConsignmentRecord.consignment_id == consignment_id)
        ).scalar_one_or_none()

    def get_consignment_for_actor(
        self,
        *,
        consignment_id: str,
        actor_id: str,
        country_code: str,
    ) -> ConsignmentRecord | None:
        return self.session.execute(
            select(ConsignmentRecord).where(
                ConsignmentRecord.consignment_id == consignment_id,
                ConsignmentRecord.country_code == country_code,
                ConsignmentRecord.actor_id == actor_id,
            )
        ).scalar_one_or_none()

    def get_event(self, *, trace_event_id: str) -> TraceabilityEventRecord | None:
        return self.session.execute(
            select(TraceabilityEventRecord).where(
                TraceabilityEventRecord.trace_event_id == trace_event_id
            )
        ).scalar_one_or_none()

    def get_event_by_idempotency(
        self,
        *,
        consignment_id: str,
        idempotency_key: str,
    ) -> TraceabilityEventRecord | None:
        return self.session.execute(
            select(TraceabilityEventRecord).where(
                TraceabilityEventRecord.consignment_id == consignment_id,
                TraceabilityEventRecord.idempotency_key == idempotency_key,
            )
        ).scalar_one_or_none()

    def list_events(self, *, consignment_id: str) -> list[TraceabilityEventRecord]:
        return list(
            self.session.execute(
                select(TraceabilityEventRecord)
                .where(TraceabilityEventRecord.consignment_id == consignment_id)
                .order_by(TraceabilityEventRecord.order_index.asc())
            ).scalars()
        )

    def _last_event(self, *, consignment_id: str) -> TraceabilityEventRecord | None:
        return self.session.execute(
            select(TraceabilityEventRecord)
            .where(TraceabilityEventRecord.consignment_id == consignment_id)
            .order_by(TraceabilityEventRecord.order_index.desc())
            .limit(1)
        ).scalar_one_or_none()

    @staticmethod
    def _status_for_milestone(milestone: str) -> str:
        if milestone in {"handoff_confirmed", "dispatched", "in_transit"}:
            return "in_transit"
        if milestone == "delivered":
            return "delivered"
        if milestone == "exception_logged":
            return "exception"
        return "draft"

    @staticmethod
    def _normalize_occurrence(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)

    def append_event(
        self,
        *,
        consignment: ConsignmentRecord,
        request_id: str,
        idempotency_key: str,
        actor_id: str,
        actor_role: str,
        country_code: str,
        correlation_id: str,
        causation_id: str | None,
        milestone: TraceMilestone,
        event_reference: str,
        previous_event_reference: str | None,
        occurred_at: datetime,
        current_custody_actor_id: str | None,
    ) -> TraceabilityEventRecord:
        existing = self.get_event_by_idempotency(
            consignment_id=consignment.consignment_id,
            idempotency_key=idempotency_key,
        )
        if existing is not None:
            return existing

        normalized_occurred_at = self._normalize_occurrence(occurred_at)
        last_event = self._last_event(consignment_id=consignment.consignment_id)
        if last_event is None:
            if milestone != "harvested":
                raise TraceabilityContinuityError(
                    "traceability_initial_milestone_required",
                    details={"required_milestone": "harvested", "actual_milestone": milestone},
                )
            if previous_event_reference is not None:
                raise TraceabilityContinuityError(
                    "traceability_missing_predecessor",
                    details={"expected_previous_event_reference": None},
                )
            next_order = 1
        else:
            if previous_event_reference != last_event.event_reference:
                raise TraceabilityContinuityError(
                    "traceability_missing_predecessor",
                    details={
                        "expected_previous_event_reference": last_event.event_reference,
                        "actual_previous_event_reference": previous_event_reference,
                    },
                )
            if normalized_occurred_at < self._normalize_occurrence(last_event.occurred_at):
                raise TraceabilityContinuityError(
                    "traceability_out_of_order",
                    details={
                        "last_occurred_at": self._normalize_occurrence(last_event.occurred_at).isoformat(),
                        "incoming_occurred_at": normalized_occurred_at.isoformat(),
                    },
                )
            next_order = last_event.order_index + 1

        event = TraceabilityEventRecord(
            trace_event_id=f"trace-event-{uuid4().hex[:12]}",
            consignment_id=consignment.consignment_id,
            actor_id=actor_id,
            actor_role=actor_role,
            country_code=country_code,
            request_id=request_id,
            idempotency_key=idempotency_key,
            correlation_id=correlation_id,
            causation_id=causation_id,
            milestone=milestone,
            event_reference=event_reference,
            previous_event_reference=previous_event_reference,
            order_index=next_order,
            occurred_at=normalized_occurred_at,
        )
        self.session.add(event)

        consignment.status = self._status_for_milestone(milestone)
        if current_custody_actor_id is not None:
            consignment.current_custody_actor_id = current_custody_actor_id
        elif milestone in {"handoff_confirmed", "dispatched", "in_transit", "delivered"}:
            consignment.current_custody_actor_id = actor_id

        self.session.flush()
        return event
