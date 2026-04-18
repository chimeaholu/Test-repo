import pytest

from agro_v2.mobile_api_profile import (
    MobileApiProfile,
    MobileApiProfileRegistry,
    PaginationPolicy,
    PayloadBudget,
    ResumableOperation,
)
from agro_v2.offline_action_queue import (
    ConflictState,
    OfflineAction,
    OfflineActionQueue,
    OfflineActionQueueError,
    OfflineActionStatus,
    ReplayDisposition,
    ReplayResult,
)


def build_registry() -> MobileApiProfileRegistry:
    registry = MobileApiProfileRegistry()
    registry.register(
        MobileApiProfile(
            version="2026-04-13",
            payload_budgets=(PayloadBudget("market.offers.mutate", max_bytes=240),),
            pagination=PaginationPolicy(default_page_size=20, max_page_size=50),
            resumable_operations=(
                ResumableOperation(
                    operation_name="market.offers.mutate",
                    token_ttl_seconds=900,
                ),
            ),
        )
    )
    return registry


def build_action(**overrides) -> OfflineAction:
    payload = {
        "operation_id": "op-40-1",
        "operation_name": "market.offers.mutate",
        "payload": {"offer_id": "offer-1", "price_minor": 4200},
        "operation_token": "token-40-1",
        "profile_version": "2026-04-13",
        "enqueued_at": "2026-04-13T07:20:00Z",
    }
    payload.update(overrides)
    return OfflineAction(**payload)


def test_enqueue_requires_registered_resumable_operation():
    queue = OfflineActionQueue(profile_registry=build_registry())

    with pytest.raises(
        OfflineActionQueueError,
        match="operation is not resumable in profile",
    ):
        queue.enqueue(build_action(operation_name="market.listings.index"))


def test_enqueue_dedupes_by_operation_id_and_operation_token():
    queue = OfflineActionQueue(profile_registry=build_registry())

    original = queue.enqueue(build_action())
    same_id = queue.enqueue(build_action())
    same_token = queue.enqueue(
        build_action(operation_id="op-40-2"),
    )

    assert same_id is original
    assert same_token is original
    assert queue.pending_actions(now_epoch_ms=0) == [original]


def test_replay_applies_action_and_reconciles_completed_token():
    queue = OfflineActionQueue(profile_registry=build_registry())
    queue.enqueue(build_action())

    [result] = queue.replay_ready(
        now_epoch_ms=0,
        executor=lambda action: ReplayResult(
            disposition=ReplayDisposition.APPLIED,
            result_ref=f"mutation:{action.operation_id}",
        ),
    )
    deduped = queue.enqueue(
        build_action(
            operation_id="op-40-3",
            operation_token="token-40-1",
        )
    )

    assert result.status == OfflineActionStatus.SYNCED
    assert result.result_ref == "mutation:op-40-1"
    assert deduped.status == OfflineActionStatus.SYNCED
    assert deduped.result_ref == "mutation:op-40-1"


def test_retryable_failure_requeues_with_backoff():
    queue = OfflineActionQueue(
        profile_registry=build_registry(),
        retry_schedule_ms=(100, 200),
    )
    queue.enqueue(build_action())

    [failed] = queue.replay_ready(
        now_epoch_ms=500,
        executor=lambda _: ReplayResult(
            disposition=ReplayDisposition.RETRY,
            error_code="network_timeout",
        ),
    )

    assert failed.status == OfflineActionStatus.FAILED_RETRYABLE
    assert failed.replay_attempt_count == 1
    assert failed.available_at_epoch_ms == 600
    assert queue.pending_actions(now_epoch_ms=599) == []
    assert queue.pending_actions(now_epoch_ms=600) == [failed]


def test_retry_budget_exhaustion_becomes_terminal():
    queue = OfflineActionQueue(
        profile_registry=build_registry(),
        retry_schedule_ms=(100,),
    )
    queue.enqueue(build_action())

    queue.replay_ready(
        now_epoch_ms=0,
        executor=lambda _: ReplayResult(
            disposition=ReplayDisposition.RETRY,
            error_code="network_timeout",
        ),
    )
    [terminal] = queue.replay_ready(
        now_epoch_ms=100,
        executor=lambda _: ReplayResult(
            disposition=ReplayDisposition.RETRY,
            error_code="network_timeout",
        ),
    )

    assert terminal.status == OfflineActionStatus.FAILED_TERMINAL
    assert terminal.last_error_code == "network_timeout"


def test_conflict_result_is_preserved_for_future_resolution():
    queue = OfflineActionQueue(profile_registry=build_registry())
    queue.enqueue(build_action())

    [conflicted] = queue.replay_ready(
        now_epoch_ms=0,
        executor=lambda _: ReplayResult(
            disposition=ReplayDisposition.CONFLICT,
            error_code="version_mismatch",
            conflict_state=ConflictState.SERVER_PRECEDENCE,
            conflict_reason="server_version_newer",
        ),
    )

    telemetry = queue.telemetry_record(conflicted)

    assert conflicted.status == OfflineActionStatus.CONFLICTED
    assert conflicted.conflict_state == ConflictState.SERVER_PRECEDENCE
    assert conflicted.conflict_reason == "server_version_newer"
    assert telemetry.queue_depth == 1
    assert telemetry.replay_attempt_count == 1
    assert telemetry.conflict_state == ConflictState.SERVER_PRECEDENCE

