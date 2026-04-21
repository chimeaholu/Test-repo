from agro_v2.frontend_traceability_routes import FrontendTraceabilityRoutes
from agro_v2.listings import CommodityListing, ListingStatus
from agro_v2.quality_evidence_attachments import (
    EvidenceAttachmentKind,
    QualityEvidenceAttachmentService,
    QualityEvidenceMetadata,
)
from agro_v2.traceability_event_chain import (
    TraceabilityEventChainService,
    TraceabilityEventType,
)


def build_routes():
    chain = TraceabilityEventChainService()
    listing = CommodityListing(
        listing_id="listing-15",
        seller_id="coop-15",
        commodity_code="cocoa",
        quantity_kg=1200,
        price_minor=800000,
        currency="GHS",
        status=ListingStatus.PUBLISHED,
        version=1,
        created_at="2026-04-13T12:00:00Z",
        updated_at="2026-04-13T12:00:00Z",
        metadata={},
    )
    chain.start_chain(
        consignment_id="cons-15",
        listing=listing,
        actor_id="coop-15",
        occurred_at="2026-04-13T12:00:00Z",
        location_code="GH-ASH",
        evidence_reference_ids=("proof-1",),
    )
    chain.append_event(
        consignment_id="cons-15",
        event_type=TraceabilityEventType.DISPATCHED,
        actor_id="coop-15",
        occurred_at="2026-04-13T12:10:00Z",
        location_code="GH-ASH",
        evidence_reference_ids=("proof-2",),
        payload={"truck_id": "trk-15"},
    )
    evidence = QualityEvidenceAttachmentService(chain_service=chain)
    evidence.capture_attachment(
        attachment_id="att-15",
        consignment_id="cons-15",
        event_id="cons-15:2",
        attachment_kind=EvidenceAttachmentKind.IMAGE,
        mime_type="image/jpeg",
        file_name="dispatch.jpg",
        size_bytes=512000,
        preview_url="https://example.com/dispatch.jpg",
        metadata=QualityEvidenceMetadata(
            captured_at="2026-04-13T12:11:00Z",
            captured_by="coop-15",
            source="android_camera",
            checksum_sha256="a" * 64,
        ),
    )
    return FrontendTraceabilityRoutes(chain_service=chain, evidence_service=evidence)


def test_traceability_routes_project_timeline_and_evidence_gallery():
    routes = build_routes()
    surface = routes.build_surface(consignment_id="cons-15")
    audit = routes.audit(surface)

    assert [entry.sequence for entry in surface.entries] == [1, 2]
    assert surface.total_evidence_count == 1
    assert audit.passed is True
