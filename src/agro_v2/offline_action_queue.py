"""B-040 Android-compatible offline action queue contract."""

from __future__ import annotations

from dataclasses import dataclass, replace
from enum import Enum
from typing import Callable

from .mobile_api_profile import MobileApiProfileError, MobileApiProfileRegistry


class OfflineActionQueueError(ValueError):
    """Raised when offline action queue inputs violate contract requirements."""


class OfflineActionStatus(str, Enum):
    QUEUED = "queued"
    REPLAYING = "replaying"
    SYNCED = "synced"
    FAILED_RETRYABLE = "failed_retryable"
    FAILED_TERMINAL = "failed_terminal"
    CONFLICTED = "conflicted"


class ReplayDisposition(str, Enum):
    APPLIED = "applied"
    DUPLICATE = "duplicate"
    RETRY = "retry"
    TERMINAL_FAILURE = "terminal_failure"
    CONFLICT = "conflict"


class ConflictState(str, Enum):
    NONE = "none"
    SERVER_PRECEDENCE = "server_precedence"
    CLIENT_RETRY_REQUIRED = "client_retry_required"


@dataclass(frozen=True)
class OfflineAction:
    operation_id: str
    operation_name: str
    payload: dict[str, object]
    operation_token: str
    profile_version: str
    enqueued_at: str
    status: OfflineActionStatus = OfflineActionStatus.QUEUED
    replay_attempt_count: int = 0
    available_at_epoch_ms: int = 0
    idempotency_key: str | None = None
    result_ref: str | None = None
    last_error_code: str | None = None
    conflict_state: ConflictState = ConflictState.NONE
    conflict_reason: str | None = None

    def __post_init__(self) -> None:
        if not self.operation_id.strip():
            raise OfflineActionQueueError("operation_id is required")
        if not self.operation_name.strip():
            raise OfflineActionQueueError("operation_name is required")
        if not self.operation_token.strip():
            raise OfflineActionQueueError("operation_token is required")
        if not self.profile_version.strip():
            raise OfflineActionQueueError("profile_version is required")
        if not self.enqueued_at.strip():
            raise OfflineActionQueueError("enqueued_at is required")


@dataclass(frozen=True)
class ReplayResult:
    disposition: ReplayDisposition
    result_ref: str | None = None
    error_code: str | None = None
    retry_after_ms: int | None = None
    conflict_state: ConflictState = ConflictState.NONE
    conflict_reason: str | None = None


@dataclass(frozen=True)
class QueueTelemetryRecord:
    operation_id: str
    profile_version: str
    queue_depth: int
    replay_attempt_count: int
    status: OfflineActionStatus
    conflict_state: ConflictState


class OfflineActionQueue:
    """Enforces B-040 enqueue/replay/dedupe semantics using the mobile profile seam."""

    def __init__(
        self,
        *,
        profile_registry: MobileApiProfileRegistry,
        retry_schedule_ms: tuple[int, ...] = (1_000, 5_000, 30_000),
    ) -> None:
        self._profiles = profile_registry
        self._retry_schedule_ms = retry_schedule_ms
        self._entries: list[OfflineAction] = []
        self._by_operation_id: dict[str, OfflineAction] = {}
        self._by_operation_token: dict[str, OfflineAction] = {}
        self._completed_tokens: dict[str, str | None] = {}

    def enqueue(self, action: OfflineAction) -> OfflineAction:
        if action.operation_id in self._by_operation_id:
            return self._by_operation_id[action.operation_id]

        self._validate_action(action)
        if action.operation_token in self._completed_tokens:
            deduped = replace(
                action,
                status=OfflineActionStatus.SYNCED,
                result_ref=self._completed_tokens[action.operation_token],
            )
            self._store_replaced(deduped, add_to_entries=False)
            return deduped

        existing = self._by_operation_token.get(action.operation_token)
        if existing is not None:
            return existing

        self._entries.append(action)
        self._by_operation_id[action.operation_id] = action
        self._by_operation_token[action.operation_token] = action
        return action

    def replay_ready(
        self,
        *,
        now_epoch_ms: int,
        executor: Callable[[OfflineAction], ReplayResult],
    ) -> list[OfflineAction]:
        replayed: list[OfflineAction] = []
        for action in list(self.pending_actions(now_epoch_ms=now_epoch_ms)):
            replaying = replace(
                action,
                status=OfflineActionStatus.REPLAYING,
                replay_attempt_count=action.replay_attempt_count + 1,
            )
            self._replace_entry(replaying)
            decision = executor(replaying)
            replayed.append(self._resolve_replay(replaying, decision, now_epoch_ms))
        return replayed

    def pending_actions(self, *, now_epoch_ms: int) -> list[OfflineAction]:
        return [
            action
            for action in self._entries
            if action.status in {OfflineActionStatus.QUEUED, OfflineActionStatus.FAILED_RETRYABLE}
            and action.available_at_epoch_ms <= now_epoch_ms
        ]

    def telemetry_record(self, action: OfflineAction) -> QueueTelemetryRecord:
        return QueueTelemetryRecord(
            operation_id=action.operation_id,
            profile_version=action.profile_version,
            queue_depth=len(
                [
                    item
                    for item in self._entries
                    if item.status
                    in {
                        OfflineActionStatus.QUEUED,
                        OfflineActionStatus.REPLAYING,
                        OfflineActionStatus.FAILED_RETRYABLE,
                        OfflineActionStatus.CONFLICTED,
                    }
                ]
            ),
            replay_attempt_count=action.replay_attempt_count,
            status=action.status,
            conflict_state=action.conflict_state,
        )

    def _validate_action(self, action: OfflineAction) -> None:
        try:
            self._profiles.validate_resumable_mutation(
                version=action.profile_version,
                operation_name=action.operation_name,
                payload=action.payload,
                operation_token=action.operation_token,
                contract_version=action.profile_version,
            )
        except MobileApiProfileError as exc:
            raise OfflineActionQueueError(str(exc)) from exc

    def _resolve_replay(
        self,
        action: OfflineAction,
        decision: ReplayResult,
        now_epoch_ms: int,
    ) -> OfflineAction:
        if decision.disposition in {ReplayDisposition.APPLIED, ReplayDisposition.DUPLICATE}:
            resolved = replace(
                action,
                status=OfflineActionStatus.SYNCED,
                result_ref=decision.result_ref,
                last_error_code=None,
                conflict_state=ConflictState.NONE,
                conflict_reason=None,
            )
            self._completed_tokens[action.operation_token] = decision.result_ref
            self._replace_entry(resolved)
            return resolved

        if decision.disposition == ReplayDisposition.RETRY:
            if action.replay_attempt_count > len(self._retry_schedule_ms):
                terminal = replace(
                    action,
                    status=OfflineActionStatus.FAILED_TERMINAL,
                    last_error_code=decision.error_code or "retry_budget_exhausted",
                )
                self._replace_entry(terminal)
                return terminal

            retry_after_ms = decision.retry_after_ms or self._retry_schedule_ms[
                action.replay_attempt_count - 1
            ]
            retryable = replace(
                action,
                status=OfflineActionStatus.FAILED_RETRYABLE,
                last_error_code=decision.error_code,
                available_at_epoch_ms=now_epoch_ms + retry_after_ms,
            )
            self._replace_entry(retryable)
            return retryable

        if decision.disposition == ReplayDisposition.CONFLICT:
            conflicted = replace(
                action,
                status=OfflineActionStatus.CONFLICTED,
                last_error_code=decision.error_code or "sync_conflict",
                conflict_state=decision.conflict_state,
                conflict_reason=decision.conflict_reason,
            )
            self._replace_entry(conflicted)
            return conflicted

        terminal = replace(
            action,
            status=OfflineActionStatus.FAILED_TERMINAL,
            last_error_code=decision.error_code or "terminal_failure",
        )
        self._replace_entry(terminal)
        return terminal

    def _replace_entry(self, replacement: OfflineAction) -> None:
        self._store_replaced(replacement, add_to_entries=False)
        for index, current in enumerate(self._entries):
            if current.operation_id == replacement.operation_id:
                self._entries[index] = replacement
                return

    def _store_replaced(self, action: OfflineAction, *, add_to_entries: bool) -> None:
        self._by_operation_id[action.operation_id] = action
        self._by_operation_token[action.operation_token] = action
        if add_to_entries:
            self._entries.append(action)

