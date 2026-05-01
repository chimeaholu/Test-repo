from agro_v2.frontend_cooperative_ops import FrontendCooperativeOperations
from agro_v2.frontend_home_queues import HomeQueueTask
from agro_v2.frontend_listing_routes import ListingCard
from agro_v2.frontend_traceability_routes import TraceabilityTimelineEntry, TraceabilityTimelineSurface
from agro_v2.listings import ListingStatus


def test_cooperative_ops_surface_composes_member_quality_and_dispatch_views():
    surface = FrontendCooperativeOperations().build_surface(
        queue_tasks=(
            HomeQueueTask(
                task_id="member-19-quality",
                title="Approve grade for cocoa batch",
                route="/app/cooperative/quality?member=member-19",
                status_label="Needs review",
                priority_rank=1,
            ),
        ),
        listing_cards=(
            ListingCard(
                listing_id="listing-19",
                headline="COCOA from coop-19",
                price_label="GHS 7500.00",
                quantity_label="1500 kg",
                detail_route="/app/market/listings/listing-19",
                status=ListingStatus.PUBLISHED,
            ),
        ),
        traceability_surfaces=(
            TraceabilityTimelineSurface(
                consignment_id="cons-19",
                timeline_route="/app/traceability/cons-19",
                evidence_route="/app/traceability/cons-19/evidence",
                entries=(
                    TraceabilityTimelineEntry(
                        event_id="cons-19:1",
                        sequence=1,
                        event_type="listed",
                        location_code="GH-ASH",
                        evidence_count=1,
                        detail_route="/app/traceability/cons-19#cons-19:1",
                    ),
                ),
                total_evidence_count=1,
                gallery_view_state="ready",
            ),
        ),
    )
    audit = FrontendCooperativeOperations().audit(surface)

    assert surface.dispatch_rows[0].latest_stage == "listed"
    assert audit.passed is True
