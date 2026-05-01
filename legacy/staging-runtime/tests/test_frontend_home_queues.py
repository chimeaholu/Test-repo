from agro_v2.frontend_app_shell import AppRole, UnifiedAppShell
from agro_v2.frontend_home_queues import FrontendHomeQueueBuilder, HomeQueueTask
from agro_v2.frontend_state_primitives import build_default_frontend_state_primitives
from agro_v2.offline_queue import ConnectivityState


def build_builder() -> FrontendHomeQueueBuilder:
    return FrontendHomeQueueBuilder(
        state_library=build_default_frontend_state_primitives()
    )


def test_farmer_home_surface_orders_tasks_and_shows_offline_state():
    shell = UnifiedAppShell()
    snapshot = shell.build_snapshot(
        role=AppRole.FARMER,
        width_px=375,
        pending_count=2,
        notifications_badge_count=0,
        connectivity_state=ConnectivityState.OFFLINE,
    )
    builder = build_builder()

    surface = builder.build_surface(
        snapshot=snapshot,
        tasks=(
            HomeQueueTask(
                task_id="task-2",
                title="Add price proof",
                route="/app/market/listings/list-2/edit",
                status_label="Needs proof",
                priority_rank=2,
                proof_count=1,
            ),
            HomeQueueTask(
                task_id="task-1",
                title="Finish listing details",
                route="/app/market/listings/list-1/create",
                status_label="Draft",
                priority_rank=1,
            ),
        ),
    )
    audit = builder.audit_surface(snapshot=snapshot, surface=surface)

    assert [task.task_id for task in surface.tasks] == ["task-1", "task-2"]
    assert surface.offline_state is not None
    assert surface.offline_state.suggested_channel == "whatsapp"
    assert audit.passed is True


def test_buyer_home_surface_uses_trust_empty_state_when_no_tasks():
    shell = UnifiedAppShell()
    snapshot = shell.build_snapshot(
        role=AppRole.BUYER,
        width_px=375,
        pending_count=1,
        notifications_badge_count=0,
    )
    builder = build_builder()

    surface = builder.build_surface(snapshot=snapshot, tasks=())

    assert surface.queue_badge_count == 0
    assert surface.empty_state is not None
    assert surface.empty_state.wrapper_component == "TrustPanel"
