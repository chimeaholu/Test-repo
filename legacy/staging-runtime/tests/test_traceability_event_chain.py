import pytest

from agro_v2.listings import (
    CreateListingCommand,
    CreateListingPayload,
    ListingApiContract,
    ListingStatus,
    UpdateListingCommand,
    UpdateListingPayload,
)
from agro_v2.traceability_event_chain import (
    TraceabilityChainEvent,
    TraceabilityEventChainError,
    TraceabilityEventChainService,
    TraceabilityEventType,
)


def build_published_listing():
    service = ListingApiContract(clock=lambda: "2026-04-13T12:00:00+00:00")
    service.create(
        CreateListingCommand(
            request_id="req-023-1",
            idempotency_key="idem-023-1",
            actor_id="farmer-023",
            payload=CreateListingPayload(
                listing_id="listing-023",
                seller_id="farmer-023",
                commodity_code="maize",
                quantity_kg=1200,
                price_minor=500_000,
                currency="GHS",
            ),
        )
    )
    return service.update(
        UpdateListingCommand(
            request_id="req-023-2",
            idempotency_key="idem-023-2",
            actor_id="farmer-023",
            listing_id="listing-023",
            payload=UpdateListingPayload(status=ListingStatus.PUBLISHED),
        )
    )


def test_traceability_chain_preserves_continuity_from_listing_to_receipt():
    service = TraceabilityEventChainService()
    listing = build_published_listing()

    listed = service.start_chain(
        consignment_id="consignment-023",
        listing=listing,
        actor_id="ops-023",
        occurred_at="2026-04-13T12:05:00Z",
        location_code="GH-ASH",
        evidence_reference_ids=("listing:published",),
    )
    quality = service.append_event(
        consignment_id="consignment-023",
        event_type=TraceabilityEventType.QUALITY_CHECKED,
        actor_id="qa-023",
        occurred_at="2026-04-13T12:10:00Z",
        location_code="GH-ASH",
        evidence_reference_ids=("qa:certificate-023",),
        payload={"grade": "A"},
    )
    dispatch = service.append_event(
        consignment_id="consignment-023",
        event_type=TraceabilityEventType.DISPATCHED,
        actor_id="logistics-023",
        occurred_at="2026-04-13T12:20:00Z",
        location_code="GH-TML",
        evidence_reference_ids=("manifest:023",),
        payload={"vehicle_id": "truck-23"},
    )
    receipt = service.append_event(
        consignment_id="consignment-023",
        event_type=TraceabilityEventType.RECEIVED,
        actor_id="buyer-023",
        occurred_at="2026-04-13T13:00:00Z",
        location_code="GH-ACC",
        evidence_reference_ids=("pod:023",),
        payload={"warehouse_id": "wh-23"},
    )

    service.assert_chain_continuity("consignment-023")

    assert listed.sequence == 1
    assert quality.previous_event_hash == listed.event_hash
    assert dispatch.previous_event_hash == quality.event_hash
    assert receipt.previous_event_hash == dispatch.event_hash
    assert receipt.data_check_id == "DI-006"


def test_traceability_rejects_invalid_transition_and_unpublished_listing():
    service = TraceabilityEventChainService()
    listing_service = ListingApiContract(clock=lambda: "2026-04-13T12:00:00+00:00")
    draft_listing = listing_service.create(
        CreateListingCommand(
            request_id="req-023-3",
            idempotency_key="idem-023-3",
            actor_id="farmer-023",
            payload=CreateListingPayload(
                listing_id="listing-023-draft",
                seller_id="farmer-023",
                commodity_code="maize",
                quantity_kg=1200,
                price_minor=500_000,
                currency="GHS",
            ),
        )
    )

    with pytest.raises(TraceabilityEventChainError, match="published"):
        service.start_chain(
            consignment_id="consignment-023-draft",
            listing=draft_listing,
            actor_id="ops-023",
            occurred_at="2026-04-13T12:05:00Z",
            location_code="GH-ASH",
            evidence_reference_ids=("listing:draft",),
        )

    listing = build_published_listing()
    service.start_chain(
        consignment_id="consignment-023-2",
        listing=listing,
        actor_id="ops-023",
        occurred_at="2026-04-13T12:05:00Z",
        location_code="GH-ASH",
        evidence_reference_ids=("listing:published",),
    )
    with pytest.raises(TraceabilityEventChainError, match="invalid traceability transition"):
        service.append_event(
            consignment_id="consignment-023-2",
            event_type=TraceabilityEventType.RECEIVED,
            actor_id="buyer-023",
            occurred_at="2026-04-13T12:06:00Z",
            location_code="GH-ACC",
            evidence_reference_ids=("pod:023",),
        )


def test_traceability_detects_hash_tampering():
    service = TraceabilityEventChainService()
    listing = build_published_listing()
    service.start_chain(
        consignment_id="consignment-023-3",
        listing=listing,
        actor_id="ops-023",
        occurred_at="2026-04-13T12:05:00Z",
        location_code="GH-ASH",
        evidence_reference_ids=("listing:published",),
    )
    service.append_event(
        consignment_id="consignment-023-3",
        event_type=TraceabilityEventType.DISPATCHED,
        actor_id="logistics-023",
        occurred_at="2026-04-13T12:20:00Z",
        location_code="GH-TML",
        evidence_reference_ids=("manifest:023",),
    )

    tampered = TraceabilityChainEvent(
        event_id="consignment-023-3:2",
        consignment_id="consignment-023-3",
        listing_id="listing-023",
        sequence=2,
        event_type=TraceabilityEventType.DISPATCHED,
        actor_id="logistics-023",
        occurred_at="2026-04-13T12:20:00Z",
        location_code="GH-TML",
        evidence_reference_ids=("manifest:023",),
        payload={"tampered": True},
        previous_event_hash=service.read_chain("consignment-023-3")[0].event_hash,
        event_hash="bad-hash",
        data_check_id="DI-006",
    )
    service._chains["consignment-023-3"][1] = tampered

    with pytest.raises(TraceabilityEventChainError, match="event_hash continuity mismatch"):
        service.assert_chain_continuity("consignment-023-3")
