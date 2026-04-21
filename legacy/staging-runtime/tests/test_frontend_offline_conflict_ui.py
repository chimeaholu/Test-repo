from agro_v2.frontend_offline_conflict_ui import FrontendOfflineConflictUi
from agro_v2.mobile_api_profile import (
    MobileApiProfile,
    MobileApiProfileRegistry,
    PaginationPolicy,
    ResumableOperation,
)
from agro_v2.offline_action_queue import (
    ConflictState,
    OfflineAction,
    OfflineActionQueue,
    OfflineActionStatus,
)
from agro_v2.sync_conflict_resolver import (
    SessionParityState,
    SyncConflictRequest,
    SyncConflictResolverPolicy,
    SyncConflictType,
)


def build_conflicted_action():
    profiles = MobileApiProfileRegistry()
    profiles.register(
        MobileApiProfile(
            version="mobile.v1",
            payload_budgets=(),
            pagination=PaginationPolicy(default_page_size=20, max_page_size=50),
            resumable_operations=(ResumableOperation("listing.update", token_ttl_seconds=3600),),
        )
    )
    queue = OfflineActionQueue(profile_registry=profiles)
    action = queue.enqueue(
        OfflineAction(
            operation_id="op-17",
            operation_name="listing.update",
            payload={"listing_id": "listing-17"},
            operation_token="token-17",
            profile_version="mobile.v1",
            enqueued_at="2026-04-13T12:00:00Z",
            status=OfflineActionStatus.CONFLICTED,
            conflict_state=ConflictState.SERVER_PRECEDENCE,
        )
    )
    resolution = SyncConflictResolverPolicy().resolve(
        SyncConflictRequest(
            action=action,
            conflict_type=SyncConflictType.DUPLICATE_COMMIT,
            session_parity=SessionParityState.HEALTHY,
            server_result_ref="server-17",
        )
    )
    return action, resolution


def test_offline_conflict_ui_keeps_outbox_and_conflict_detail_in_sync():
    action, resolution = build_conflicted_action()
    surface = FrontendOfflineConflictUi().build_surface(
        actions=(action,),
        resolutions=(resolution,),
    )
    audit = FrontendOfflineConflictUi().audit(surface)

    assert surface.items[0].detail_route == "/app/offline/conflicts/op-17"
    assert surface.conflict_details[0].resolution_policy == "server_precedence"
    assert audit.passed is True
