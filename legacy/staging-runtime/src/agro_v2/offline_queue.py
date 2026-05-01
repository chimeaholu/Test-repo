"""Offline queue contract primitives for the PWA shell."""

from __future__ import annotations

from dataclasses import dataclass, replace
from enum import Enum
from typing import Any, Callable


class QueueStatus(str, Enum):
    QUEUED = "queued"
    SYNCING = "syncing"
    SYNCED = "synced"
    FAILED_RETRYABLE = "failed_retryable"
    FAILED_TERMINAL = "failed_terminal"


class ReplayOutcome(str, Enum):
    APPLIED = "applied"
    DUPLICATE = "duplicate"
    RETRY = "retry"
    TERMINAL_FAILURE = "terminal_failure"


class ConnectivityState(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    DEGRADED = "degraded"


class Channel(str, Enum):
    PWA = "pwa"
    WHATSAPP = "whatsapp"
    USSD = "ussd"


@dataclass(frozen=True)
class QueueEntry:
    operation_id: str
    command_name: str
    payload: dict[str, Any]
    idempotency_key: str
    created_at: str
    status: QueueStatus = QueueStatus.QUEUED
    replay_attempt_count: int = 0
    available_at_epoch_ms: int = 0
    last_error_code: str | None = None
    result_ref: str | None = None


@dataclass(frozen=True)
class ReplayDecision:
    outcome: ReplayOutcome
    result_ref: str | None = None
    error_code: str | None = None
    retry_after_ms: int | None = None


@dataclass(frozen=True)
class QueueTelemetry:
    queue_depth: int
    replay_attempt_count: int
    sync_outcome: str
    conflict_type: str | None


@dataclass(frozen=True)
class HandoffPrompt:
    should_prompt: bool
    suggested_channel: Channel | None
    reason: str | None


class OfflineQueue:
    """In-memory placeholder queue that encodes the B-006 contract."""

    def __init__(self, retry_schedule_ms: tuple[int, ...] = (1_000, 5_000, 30_000)):
        self._retry_schedule_ms = retry_schedule_ms
        self._entries: list[QueueEntry] = []
        self._by_operation_id: dict[str, QueueEntry] = {}
        self._completed_idempotency_keys: dict[str, str | None] = {}

    def enqueue(self, entry: QueueEntry) -> QueueEntry:
        if entry.operation_id in self._by_operation_id:
            return self._by_operation_id[entry.operation_id]
        existing_result = self._completed_idempotency_keys.get(entry.idempotency_key)
        if existing_result is not None or entry.idempotency_key in self._completed_idempotency_keys:
            deduped = replace(
                entry,
                status=QueueStatus.SYNCED,
                result_ref=existing_result,
            )
            self._by_operation_id[entry.operation_id] = deduped
            return deduped
        self._entries.append(entry)
        self._by_operation_id[entry.operation_id] = entry
        return entry

    def pending_entries(self, now_epoch_ms: int) -> list[QueueEntry]:
        return [
            entry
            for entry in self._entries
            if entry.status in {QueueStatus.QUEUED, QueueStatus.FAILED_RETRYABLE}
            and entry.available_at_epoch_ms <= now_epoch_ms
        ]

    def replay_ready(
        self,
        now_epoch_ms: int,
        executor: Callable[[QueueEntry], ReplayDecision],
    ) -> list[QueueEntry]:
        replayed: list[QueueEntry] = []
        for entry in list(self.pending_entries(now_epoch_ms)):
            syncing = replace(
                entry,
                status=QueueStatus.SYNCING,
                replay_attempt_count=entry.replay_attempt_count + 1,
            )
            self._replace_entry(syncing)
            decision = executor(syncing)
            resolved = self._resolve_replay(syncing, decision, now_epoch_ms)
            replayed.append(resolved)
        return replayed

    def telemetry(self, entry: QueueEntry) -> QueueTelemetry:
        conflict_type = "duplicate" if entry.result_ref and entry.status == QueueStatus.SYNCED else None
        return QueueTelemetry(
            queue_depth=len(
                [item for item in self._entries if item.status != QueueStatus.SYNCED]
            ),
            replay_attempt_count=entry.replay_attempt_count,
            sync_outcome=entry.status.value,
            conflict_type=conflict_type,
        )

    def connectivity_handoff(self, state: ConnectivityState, queue_depth: int) -> HandoffPrompt:
        if state == ConnectivityState.ONLINE:
            return HandoffPrompt(False, None, None)
        if state == ConnectivityState.OFFLINE:
            return HandoffPrompt(True, Channel.WHATSAPP, "offline_queueing")
        if queue_depth >= 3:
            return HandoffPrompt(True, Channel.USSD, "degraded_network_backlog")
        return HandoffPrompt(True, Channel.WHATSAPP, "degraded_network")

    def _resolve_replay(
        self,
        entry: QueueEntry,
        decision: ReplayDecision,
        now_epoch_ms: int,
    ) -> QueueEntry:
        if decision.outcome in {ReplayOutcome.APPLIED, ReplayOutcome.DUPLICATE}:
            resolved = replace(
                entry,
                status=QueueStatus.SYNCED,
                last_error_code=None,
                result_ref=decision.result_ref,
            )
            self._completed_idempotency_keys[entry.idempotency_key] = decision.result_ref
            self._replace_entry(resolved)
            return resolved

        if decision.outcome == ReplayOutcome.RETRY:
            if entry.replay_attempt_count > len(self._retry_schedule_ms):
                resolved = replace(
                    entry,
                    status=QueueStatus.FAILED_TERMINAL,
                    last_error_code=decision.error_code or "retry_budget_exhausted",
                )
                self._replace_entry(resolved)
                return resolved

            retry_delay_ms = decision.retry_after_ms or self._retry_schedule_ms[
                entry.replay_attempt_count - 1
            ]
            resolved = replace(
                entry,
                status=QueueStatus.FAILED_RETRYABLE,
                last_error_code=decision.error_code,
                available_at_epoch_ms=now_epoch_ms + retry_delay_ms,
            )
            self._replace_entry(resolved)
            return resolved

        resolved = replace(
            entry,
            status=QueueStatus.FAILED_TERMINAL,
            last_error_code=decision.error_code or "terminal_failure",
        )
        self._replace_entry(resolved)
        return resolved

    def _replace_entry(self, replacement: QueueEntry) -> None:
        self._by_operation_id[replacement.operation_id] = replacement
        for index, current in enumerate(self._entries):
            if current.operation_id == replacement.operation_id:
                self._entries[index] = replacement
                return
