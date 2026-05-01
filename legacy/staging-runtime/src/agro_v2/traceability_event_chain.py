"""B-023 immutable consignment traceability event chain service."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .audit_events import compute_event_hash
from .listings import CommodityListing, ListingStatus


class TraceabilityEventChainError(ValueError):
    """Raised when chain continuity or lifecycle rules are broken."""


class TraceabilityEventType(str, Enum):
    LISTED = "listed"
    QUALITY_CHECKED = "quality_checked"
    DISPATCHED = "dispatched"
    RECEIVED = "received"


@dataclass(frozen=True)
class TraceabilityChainEvent:
    event_id: str
    consignment_id: str
    listing_id: str
    sequence: int
    event_type: TraceabilityEventType
    actor_id: str
    occurred_at: str
    location_code: str
    evidence_reference_ids: tuple[str, ...]
    payload: dict[str, object]
    previous_event_hash: str | None
    event_hash: str
    data_check_id: str

    def __post_init__(self) -> None:
        if not self.event_id.strip():
            raise TraceabilityEventChainError("event_id is required")
        if not self.consignment_id.strip():
            raise TraceabilityEventChainError("consignment_id is required")
        if not self.listing_id.strip():
            raise TraceabilityEventChainError("listing_id is required")
        if self.sequence <= 0:
            raise TraceabilityEventChainError("sequence must be > 0")
        if not self.actor_id.strip():
            raise TraceabilityEventChainError("actor_id is required")
        if not self.occurred_at.strip():
            raise TraceabilityEventChainError("occurred_at is required")
        if not self.location_code.strip():
            raise TraceabilityEventChainError("location_code is required")
        if not self.evidence_reference_ids:
            raise TraceabilityEventChainError("evidence_reference_ids must not be empty")
        if not self.event_hash.strip():
            raise TraceabilityEventChainError("event_hash is required")
        if not self.data_check_id.strip():
            raise TraceabilityEventChainError("data_check_id is required")

    def canonical_payload(self) -> dict[str, object]:
        return {
            "event_id": self.event_id,
            "consignment_id": self.consignment_id,
            "listing_id": self.listing_id,
            "sequence": self.sequence,
            "event_type": self.event_type.value,
            "actor_id": self.actor_id,
            "occurred_at": self.occurred_at,
            "location_code": self.location_code,
            "evidence_reference_ids": list(self.evidence_reference_ids),
            "payload": dict(self.payload),
            "previous_event_hash": self.previous_event_hash,
            "data_check_id": self.data_check_id,
        }


class TraceabilityEventChainService:
    """Maintains immutable per-consignment event chains for custody traceability."""

    def __init__(self) -> None:
        self._chains: dict[str, list[TraceabilityChainEvent]] = {}

    def start_chain(
        self,
        *,
        consignment_id: str,
        listing: CommodityListing,
        actor_id: str,
        occurred_at: str,
        location_code: str,
        evidence_reference_ids: tuple[str, ...],
    ) -> TraceabilityChainEvent:
        if listing.status != ListingStatus.PUBLISHED:
            raise TraceabilityEventChainError("listing must be published before traceability begins")
        if consignment_id in self._chains:
            raise TraceabilityEventChainError("consignment_id already exists")
        event = self._build_event(
            consignment_id=consignment_id,
            listing_id=listing.listing_id,
            sequence=1,
            event_type=TraceabilityEventType.LISTED,
            actor_id=actor_id,
            occurred_at=occurred_at,
            location_code=location_code,
            evidence_reference_ids=evidence_reference_ids,
            payload={"commodity_code": listing.commodity_code, "quantity_kg": listing.quantity_kg},
            previous_event_hash=None,
        )
        self._chains[consignment_id] = [event]
        return event

    def append_event(
        self,
        *,
        consignment_id: str,
        event_type: TraceabilityEventType,
        actor_id: str,
        occurred_at: str,
        location_code: str,
        evidence_reference_ids: tuple[str, ...],
        payload: dict[str, object] | None = None,
    ) -> TraceabilityChainEvent:
        chain = self._get_chain(consignment_id)
        previous = chain[-1]
        if event_type not in _ALLOWED_TRANSITIONS[previous.event_type]:
            raise TraceabilityEventChainError(
                f"invalid traceability transition: {previous.event_type.value} -> {event_type.value}"
            )
        event = self._build_event(
            consignment_id=consignment_id,
            listing_id=previous.listing_id,
            sequence=previous.sequence + 1,
            event_type=event_type,
            actor_id=actor_id,
            occurred_at=occurred_at,
            location_code=location_code,
            evidence_reference_ids=evidence_reference_ids,
            payload=payload or {},
            previous_event_hash=previous.event_hash,
        )
        chain.append(event)
        return event

    def read_chain(self, consignment_id: str) -> tuple[TraceabilityChainEvent, ...]:
        return tuple(self._get_chain(consignment_id))

    def assert_chain_continuity(self, consignment_id: str) -> None:
        chain = self._get_chain(consignment_id)
        if chain[0].event_type != TraceabilityEventType.LISTED:
            raise TraceabilityEventChainError("chain must start with listed event")

        previous_hash = None
        previous_sequence = 0
        for event in chain:
            if event.previous_event_hash != previous_hash:
                raise TraceabilityEventChainError("previous_event_hash continuity mismatch")
            if event.sequence != previous_sequence + 1:
                raise TraceabilityEventChainError("sequence continuity mismatch")
            expected_hash = compute_event_hash(event.canonical_payload())
            if event.event_hash != expected_hash:
                raise TraceabilityEventChainError("event_hash continuity mismatch")
            previous_hash = event.event_hash
            previous_sequence = event.sequence

    def _build_event(
        self,
        *,
        consignment_id: str,
        listing_id: str,
        sequence: int,
        event_type: TraceabilityEventType,
        actor_id: str,
        occurred_at: str,
        location_code: str,
        evidence_reference_ids: tuple[str, ...],
        payload: dict[str, object],
        previous_event_hash: str | None,
    ) -> TraceabilityChainEvent:
        event_id = f"{consignment_id}:{sequence}"
        record = {
            "event_id": event_id,
            "consignment_id": consignment_id,
            "listing_id": listing_id,
            "sequence": sequence,
            "event_type": event_type.value,
            "actor_id": actor_id,
            "occurred_at": occurred_at,
            "location_code": location_code,
            "evidence_reference_ids": list(evidence_reference_ids),
            "payload": dict(payload),
            "previous_event_hash": previous_event_hash,
            "data_check_id": "DI-006",
        }
        return TraceabilityChainEvent(
            event_id=event_id,
            consignment_id=consignment_id,
            listing_id=listing_id,
            sequence=sequence,
            event_type=event_type,
            actor_id=actor_id,
            occurred_at=occurred_at,
            location_code=location_code,
            evidence_reference_ids=evidence_reference_ids,
            payload=dict(payload),
            previous_event_hash=previous_event_hash,
            event_hash=compute_event_hash(record),
            data_check_id="DI-006",
        )

    def _get_chain(self, consignment_id: str) -> list[TraceabilityChainEvent]:
        try:
            return self._chains[consignment_id]
        except KeyError as exc:
            raise TraceabilityEventChainError(f"unknown consignment_id: {consignment_id}") from exc


_ALLOWED_TRANSITIONS = {
    TraceabilityEventType.LISTED: {
        TraceabilityEventType.QUALITY_CHECKED,
        TraceabilityEventType.DISPATCHED,
    },
    TraceabilityEventType.QUALITY_CHECKED: {TraceabilityEventType.DISPATCHED},
    TraceabilityEventType.DISPATCHED: {TraceabilityEventType.RECEIVED},
    TraceabilityEventType.RECEIVED: set(),
}
