from agro_v2.frontend_contract_adapters import FrontendMutationDto
from agro_v2.frontend_app_shell import AppRole, UnifiedAppShell
from agro_v2.frontend_home_queues import FrontendHomeQueueBuilder, HomeQueueTask
from agro_v2.frontend_route_services import (
    FrontendRouteDataServices,
    FrontendRouteLoaderRequest,
)
from agro_v2.frontend_state_primitives import build_default_frontend_state_primitives


def test_route_loader_wraps_surface_with_cache_metadata():
    builder = FrontendHomeQueueBuilder(
        state_library=build_default_frontend_state_primitives()
    )
    snapshot = UnifiedAppShell().build_snapshot(
        role=AppRole.FARMER,
        width_px=390,
        pending_count=1,
        notifications_badge_count=0,
    )
    services = FrontendRouteDataServices()

    def load_home(_request):
        return builder.build_surface(
            snapshot=snapshot,
            tasks=(
                HomeQueueTask(
                    task_id="task-23",
                    title="Upload harvest photos",
                    route="/app/traceability/cons-23/evidence/new",
                    status_label="today",
                    priority_rank=1,
                ),
            ),
        )

    services.register_loader(
        route_name="/app/home",
        loader=load_home,
        source_bead_ids=("F-023", "F-006"),
        cache_tags=("home", "queues"),
        revalidate_seconds=45,
    )

    result = services.load(
        FrontendRouteLoaderRequest(route_name="/app/home", role="farmer", params={})
    )

    assert result.loader_name == "load_home"
    assert result.cache_tags == ("home", "queues")
    assert result.envelope.payload["title"] == "Work to finish before you sell"


def test_mutation_service_returns_invalidations_and_offline_queue_status():
    services = FrontendRouteDataServices()

    def publish_listing(mutation: FrontendMutationDto):
        return {
            "result_id": mutation.payload["draft_id"],
            "status": "queued_for_review",
            "detail_route": "/app/listings/listing-23",
        }

    services.register_mutation(
        action="listing.publish",
        route_name="/app/listings/new",
        handler=publish_listing,
        source_bead_ids=("F-023", "F-008"),
        invalidates_routes=("/app/listings", "/app/home"),
    )

    receipt = services.mutate(
        action="listing.publish",
        route_name="/app/listings/new",
        role="farmer",
        payload={"draft_id": "draft-23"},
        idempotency_key="publish-23",
        prefer_offline_queue=True,
    )

    assert receipt.status == "queued"
    assert receipt.invalidated_routes == ("/app/listings", "/app/home")
    assert receipt.envelope.payload["detail_route"] == "/app/listings/listing-23"
