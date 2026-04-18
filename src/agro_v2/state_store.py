"""Canonical cross-channel workflow state with idempotent command handling."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from hashlib import sha256
import json


def _freeze_payload(value: object) -> str:
    """Create a deterministic fingerprint for idempotency comparisons."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


def _deep_merge_state(
    base: dict[str, object],
    incoming: dict[str, object],
) -> dict[str, object]:
    """Merge nested workflow state without dropping existing canonical branches."""
    merged = deepcopy(base)
    for key, value in incoming.items():
        existing = merged.get(key)
        if isinstance(existing, dict) and isinstance(value, dict):
            merged[key] = _deep_merge_state(existing, value)
            continue
        merged[key] = deepcopy(value)
    return merged


@dataclass(frozen=True)
class WorkflowCommand:
    workflow_id: str
    channel: str
    idempotency_key: str
    event_type: str
    state_delta: dict[str, object]
    metadata: dict[str, object] = field(default_factory=dict)

    def fingerprint(self) -> str:
        payload = {
            "workflow_id": self.workflow_id,
            "channel": self.channel,
            "event_type": self.event_type,
            "state_delta": self.state_delta,
            "metadata": self.metadata,
        }
        return sha256(_freeze_payload(payload).encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class WorkflowTransition:
    workflow_id: str
    sequence: int
    channel: str
    event_type: str
    idempotency_key: str
    state: dict[str, object]
    metadata: dict[str, object]


@dataclass(frozen=True)
class WorkflowSnapshot:
    workflow_id: str
    version: int
    active_channel: str
    last_event_type: str
    last_idempotency_key: str
    state: dict[str, object]


@dataclass(frozen=True)
class CommandResult:
    applied: bool
    snapshot: WorkflowSnapshot
    transition: WorkflowTransition


class IdempotencyConflictError(ValueError):
    """Raised when an idempotency token is reused for a different command."""


class CanonicalStateStore:
    """In-memory canonical store for cross-channel workflow coordination."""

    def __init__(self) -> None:
        self._snapshots: dict[str, WorkflowSnapshot] = {}
        self._transitions: dict[str, list[WorkflowTransition]] = {}
        self._idempotency_index: dict[str, dict[str, tuple[str, WorkflowTransition]]] = {}

    def apply(self, command: WorkflowCommand) -> CommandResult:
        workflow_tokens = self._idempotency_index.setdefault(command.workflow_id, {})
        fingerprint = command.fingerprint()
        prior = workflow_tokens.get(command.idempotency_key)

        if prior is not None:
            prior_fingerprint, prior_transition = prior
            if prior_fingerprint != fingerprint:
                raise IdempotencyConflictError(
                    "Idempotency key already used for a different command"
                )
            return CommandResult(
                applied=False,
                snapshot=self.snapshot(command.workflow_id),
                transition=prior_transition,
            )

        previous_snapshot = self._snapshots.get(command.workflow_id)
        previous_state: dict[str, object] = (
            deepcopy(previous_snapshot.state) if previous_snapshot is not None else {}
        )
        next_state = _deep_merge_state(previous_state, command.state_delta)

        sequence = 1 if previous_snapshot is None else previous_snapshot.version + 1
        transition = WorkflowTransition(
            workflow_id=command.workflow_id,
            sequence=sequence,
            channel=command.channel,
            event_type=command.event_type,
            idempotency_key=command.idempotency_key,
            state=deepcopy(next_state),
            metadata=deepcopy(command.metadata),
        )
        snapshot = WorkflowSnapshot(
            workflow_id=command.workflow_id,
            version=sequence,
            active_channel=command.channel,
            last_event_type=command.event_type,
            last_idempotency_key=command.idempotency_key,
            state=deepcopy(next_state),
        )

        self._transitions.setdefault(command.workflow_id, []).append(transition)
        workflow_tokens[command.idempotency_key] = (fingerprint, transition)
        self._snapshots[command.workflow_id] = snapshot

        return CommandResult(applied=True, snapshot=snapshot, transition=transition)

    def snapshot(self, workflow_id: str) -> WorkflowSnapshot:
        if workflow_id not in self._snapshots:
            raise KeyError(f"Unknown workflow: {workflow_id}")
        snapshot = self._snapshots[workflow_id]
        return WorkflowSnapshot(
            workflow_id=snapshot.workflow_id,
            version=snapshot.version,
            active_channel=snapshot.active_channel,
            last_event_type=snapshot.last_event_type,
            last_idempotency_key=snapshot.last_idempotency_key,
            state=deepcopy(snapshot.state),
        )

    def replay(self, workflow_id: str) -> list[WorkflowTransition]:
        transitions = self._transitions.get(workflow_id, [])
        return [
            WorkflowTransition(
                workflow_id=item.workflow_id,
                sequence=item.sequence,
                channel=item.channel,
                event_type=item.event_type,
                idempotency_key=item.idempotency_key,
                state=deepcopy(item.state),
                metadata=deepcopy(item.metadata),
            )
            for item in transitions
        ]
