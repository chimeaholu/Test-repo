from agro_v2.offline_queue import (
    Channel,
    ConnectivityState,
    HandoffPrompt,
    OfflineQueue,
    QueueEntry,
    QueueStatus,
    ReplayDecision,
    ReplayOutcome,
)


def build_entry(operation_id: str, idempotency_key: str) -> QueueEntry:
    return QueueEntry(
        operation_id=operation_id,
        command_name="listing.update_offer",
        payload={"offer_id": "offer-1", "price": 42},
        idempotency_key=idempotency_key,
        created_at="2026-04-13T00:00:00Z",
    )


def test_enqueue_dedupes_same_operation_id():
    queue = OfflineQueue()
    original = queue.enqueue(build_entry("op-1", "idem-1"))
    duplicate = queue.enqueue(build_entry("op-1", "idem-1"))

    assert duplicate is original
    assert len(queue.pending_entries(now_epoch_ms=0)) == 1


def test_replay_marks_applied_entry_as_synced():
    queue = OfflineQueue()
    queue.enqueue(build_entry("op-1", "idem-1"))

    [result] = queue.replay_ready(
        now_epoch_ms=0,
        executor=lambda entry: ReplayDecision(
            outcome=ReplayOutcome.APPLIED,
            result_ref=f"mutation:{entry.operation_id}",
        ),
    )

    assert result.status == QueueStatus.SYNCED
    assert result.result_ref == "mutation:op-1"


def test_replay_duplicate_reconciles_without_second_mutation():
    queue = OfflineQueue()
    queue.enqueue(build_entry("op-1", "idem-1"))

    [first] = queue.replay_ready(
        now_epoch_ms=0,
        executor=lambda _: ReplayDecision(
            outcome=ReplayOutcome.APPLIED,
            result_ref="mutation:op-1",
        ),
    )
    deduped = queue.enqueue(build_entry("op-2", "idem-1"))

    assert first.status == QueueStatus.SYNCED
    assert deduped.status == QueueStatus.SYNCED
    assert deduped.result_ref == "mutation:op-1"
    assert queue.pending_entries(now_epoch_ms=0) == []


def test_retryable_failure_uses_backoff_and_requeues():
    queue = OfflineQueue(retry_schedule_ms=(100, 200, 300))
    queue.enqueue(build_entry("op-1", "idem-1"))

    [failed] = queue.replay_ready(
        now_epoch_ms=1_000,
        executor=lambda _: ReplayDecision(
            outcome=ReplayOutcome.RETRY,
            error_code="network_timeout",
        ),
    )

    assert failed.status == QueueStatus.FAILED_RETRYABLE
    assert failed.replay_attempt_count == 1
    assert failed.available_at_epoch_ms == 1_100
    assert queue.pending_entries(now_epoch_ms=1_099) == []
    assert queue.pending_entries(now_epoch_ms=1_100) == [failed]


def test_retry_budget_exhaustion_becomes_terminal():
    queue = OfflineQueue(retry_schedule_ms=(100,))
    queue.enqueue(build_entry("op-1", "idem-1"))

    queue.replay_ready(
        now_epoch_ms=0,
        executor=lambda _: ReplayDecision(
            outcome=ReplayOutcome.RETRY,
            error_code="network_timeout",
        ),
    )
    [terminal] = queue.replay_ready(
        now_epoch_ms=100,
        executor=lambda _: ReplayDecision(
            outcome=ReplayOutcome.RETRY,
            error_code="network_timeout",
        ),
    )

    assert terminal.status == QueueStatus.FAILED_TERMINAL
    assert terminal.last_error_code == "network_timeout"


def test_terminal_failure_stops_replay():
    queue = OfflineQueue()
    queue.enqueue(build_entry("op-1", "idem-1"))

    [failed] = queue.replay_ready(
        now_epoch_ms=0,
        executor=lambda _: ReplayDecision(
            outcome=ReplayOutcome.TERMINAL_FAILURE,
            error_code="validation_failed",
        ),
    )

    assert failed.status == QueueStatus.FAILED_TERMINAL
    assert queue.pending_entries(now_epoch_ms=10_000) == []


def test_telemetry_reports_queue_depth_attempts_and_duplicate_conflict():
    queue = OfflineQueue()
    queue.enqueue(build_entry("op-1", "idem-1"))
    [result] = queue.replay_ready(
        now_epoch_ms=0,
        executor=lambda _: ReplayDecision(
            outcome=ReplayOutcome.DUPLICATE,
            result_ref="mutation:op-1",
        ),
    )

    telemetry = queue.telemetry(result)

    assert telemetry.queue_depth == 0
    assert telemetry.replay_attempt_count == 1
    assert telemetry.sync_outcome == "synced"
    assert telemetry.conflict_type == "duplicate"


def test_connectivity_handoff_prefers_whatsapp_offline_and_ussd_when_backlogged():
    queue = OfflineQueue()

    offline_prompt = queue.connectivity_handoff(
        ConnectivityState.OFFLINE,
        queue_depth=1,
    )
    degraded_prompt = queue.connectivity_handoff(
        ConnectivityState.DEGRADED,
        queue_depth=3,
    )
    online_prompt = queue.connectivity_handoff(
        ConnectivityState.ONLINE,
        queue_depth=0,
    )

    assert offline_prompt == HandoffPrompt(True, Channel.WHATSAPP, "offline_queueing")
    assert degraded_prompt == HandoffPrompt(
        True,
        Channel.USSD,
        "degraded_network_backlog",
    )
    assert online_prompt == HandoffPrompt(False, None, None)
