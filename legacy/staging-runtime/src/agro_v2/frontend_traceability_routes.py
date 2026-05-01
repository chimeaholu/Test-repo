"""F-015 traceability timeline and evidence gallery route contracts."""

from __future__ import annotations

from dataclasses import dataclass

from .quality_evidence_attachments import EvidenceGallerySnapshot, QualityEvidenceAttachmentService
from .traceability_event_chain import TraceabilityChainEvent, TraceabilityEventChainService


class FrontendTraceabilityRouteError(ValueError):
    """Raised when traceability timeline or evidence gallery routes lose continuity cues."""


@dataclass(frozen=True)
class TraceabilityTimelineEntry:
    event_id: str
    sequence: int
    event_type: str
    location_code: str
    evidence_count: int
    detail_route: str


@dataclass(frozen=True)
class TraceabilityTimelineSurface:
    consignment_id: str
    timeline_route: str
    evidence_route: str
    entries: tuple[TraceabilityTimelineEntry, ...]
    total_evidence_count: int
    gallery_view_state: str


@dataclass(frozen=True)
class TraceabilityRouteAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendTraceabilityRoutes:
    """Projects immutable custody events into review-friendly route surfaces."""

    def __init__(
        self,
        *,
        chain_service: TraceabilityEventChainService,
        evidence_service: QualityEvidenceAttachmentService,
    ) -> None:
        self._chain_service = chain_service
        self._evidence_service = evidence_service

    def build_surface(self, *, consignment_id: str) -> TraceabilityTimelineSurface:
        chain = self._chain_service.read_chain(consignment_id)
        gallery = self._evidence_service.build_gallery(consignment_id=consignment_id)
        evidence_counts = {
            display.event_id: len(display.attachments) for display in gallery.visible_events
        }
        return TraceabilityTimelineSurface(
            consignment_id=consignment_id,
            timeline_route=f"/app/traceability/{consignment_id}",
            evidence_route=f"/app/traceability/{consignment_id}/evidence",
            entries=tuple(self._entry_for(event, evidence_counts) for event in chain),
            total_evidence_count=gallery.total_attachments,
            gallery_view_state=gallery.view_state.value,
        )

    def audit(self, surface: TraceabilityTimelineSurface) -> TraceabilityRouteAudit:
        issues: list[str] = []
        if not surface.entries:
            issues.append("traceability_timeline_empty")
        sequences = tuple(entry.sequence for entry in surface.entries)
        if sequences != tuple(range(1, len(surface.entries) + 1)):
            issues.append("timeline_sequence_gap")
        if not surface.evidence_route.endswith("/evidence"):
            issues.append("evidence_route_missing")
        return TraceabilityRouteAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="FJ-C08",
            ux_data_check_id="F-015",
        )

    @staticmethod
    def _entry_for(
        event: TraceabilityChainEvent,
        evidence_counts: dict[str, int],
    ) -> TraceabilityTimelineEntry:
        return TraceabilityTimelineEntry(
            event_id=event.event_id,
            sequence=event.sequence,
            event_type=event.event_type.value,
            location_code=event.location_code,
            evidence_count=evidence_counts.get(event.event_id, 0),
            detail_route=f"/app/traceability/{event.consignment_id}#{event.event_id}",
        )
