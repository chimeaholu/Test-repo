import pytest

from agro_v2.listings import (
    CreateListingCommand,
    CreateListingPayload,
    ListingApiContract,
    ListingStatus,
    UpdateListingCommand,
    UpdateListingPayload,
)
from agro_v2.quality_evidence_attachments import (
    EvidenceAttachmentKind,
    EvidenceGalleryViewState,
    QualityEvidenceAttachmentError,
    QualityEvidenceAttachmentService,
    QualityEvidenceMetadata,
)
from agro_v2.traceability_event_chain import TraceabilityEventChainService, TraceabilityEventType


def build_published_listing():
    service = ListingApiContract(clock=lambda: "2026-04-13T12:00:00+00:00")
    service.create(
        CreateListingCommand(
            request_id="req-024-1",
            idempotency_key="idem-024-1",
            actor_id="farmer-024",
            payload=CreateListingPayload(
                listing_id="listing-024",
                seller_id="farmer-024",
                commodity_code="cocoa",
                quantity_kg=900,
                price_minor=640_000,
                currency="GHS",
            ),
        )
    )
    return service.update(
        UpdateListingCommand(
            request_id="req-024-2",
            idempotency_key="idem-024-2",
            actor_id="farmer-024",
            listing_id="listing-024",
            payload=UpdateListingPayload(status=ListingStatus.PUBLISHED),
        )
    )


def build_chain() -> TraceabilityEventChainService:
    service = TraceabilityEventChainService()
    listing = build_published_listing()
    service.start_chain(
        consignment_id="consignment-024",
        listing=listing,
        actor_id="ops-024",
        occurred_at="2026-04-13T12:10:00Z",
        location_code="GH-WN",
        evidence_reference_ids=("listing:published",),
    )
    service.append_event(
        consignment_id="consignment-024",
        event_type=TraceabilityEventType.QUALITY_CHECKED,
        actor_id="qa-024",
        occurred_at="2026-04-13T12:20:00Z",
        location_code="GH-WN",
        evidence_reference_ids=("qa:certificate-024",),
        payload={"grade": "AA"},
    )
    return service


def build_metadata(**overrides) -> QualityEvidenceMetadata:
    payload = {
        "captured_at": "2026-04-13T12:21:00Z",
        "captured_by": "qa-024",
        "source": "quality_console",
        "checksum_sha256": "a" * 64,
        "tags": ("grade", "sample"),
    }
    payload.update(overrides)
    return QualityEvidenceMetadata(**payload)


def test_capture_attachment_projects_traceability_gallery():
    chain = build_chain()
    service = QualityEvidenceAttachmentService(chain_service=chain)

    attachment = service.capture_attachment(
        attachment_id="att-024-1",
        consignment_id="consignment-024",
        event_id="consignment-024:2",
        attachment_kind=EvidenceAttachmentKind.CERTIFICATE,
        mime_type="application/pdf",
        file_name="quality-certificate.pdf",
        size_bytes=120_000,
        preview_url="https://evidence.example/quality-certificate.pdf",
        metadata=build_metadata(),
    )
    gallery = service.build_gallery(consignment_id="consignment-024")

    assert attachment.sequence == 2
    assert attachment.data_check_id == "DI-006"
    assert gallery.view_state == EvidenceGalleryViewState.READY
    assert gallery.total_attachments == 1
    assert gallery.visible_events[0].event_id == "consignment-024:2"


def test_capture_attachment_rejects_invalid_mime_type_and_bad_chain_link():
    chain = build_chain()
    service = QualityEvidenceAttachmentService(chain_service=chain)

    with pytest.raises(QualityEvidenceAttachmentError, match="mime_type"):
        service.capture_attachment(
            attachment_id="att-024-2",
            consignment_id="consignment-024",
            event_id="consignment-024:2",
            attachment_kind=EvidenceAttachmentKind.CERTIFICATE,
            mime_type="image/jpeg",
            file_name="bad.jpg",
            size_bytes=10_000,
            preview_url="https://evidence.example/bad.jpg",
            metadata=build_metadata(),
        )

    with pytest.raises(QualityEvidenceAttachmentError, match="does not belong"):
        service.capture_attachment(
            attachment_id="att-024-3",
            consignment_id="consignment-024",
            event_id="missing-event",
            attachment_kind=EvidenceAttachmentKind.IMAGE,
            mime_type="image/png",
            file_name="sample.png",
            size_bytes=10_000,
            preview_url="https://evidence.example/sample.png",
            metadata=build_metadata(),
        )


def test_gallery_surfaces_filtered_empty_state():
    chain = build_chain()
    service = QualityEvidenceAttachmentService(chain_service=chain)
    service.capture_attachment(
        attachment_id="att-024-4",
        consignment_id="consignment-024",
        event_id="consignment-024:2",
        attachment_kind=EvidenceAttachmentKind.LAB_REPORT,
        mime_type="application/pdf",
        file_name="lab-report.pdf",
        size_bytes=90_000,
        preview_url="https://evidence.example/lab-report.pdf",
        metadata=build_metadata(source="lab_partner"),
    )

    filtered = service.build_gallery(
        consignment_id="consignment-024",
        event_type=TraceabilityEventType.RECEIVED.value,
    )

    assert filtered.view_state == EvidenceGalleryViewState.FILTERED_EMPTY
    assert filtered.total_attachments == 0


def test_metadata_requires_sha256_checksum():
    with pytest.raises(QualityEvidenceAttachmentError, match="checksum_sha256"):
        build_metadata(checksum_sha256="bad-checksum")
