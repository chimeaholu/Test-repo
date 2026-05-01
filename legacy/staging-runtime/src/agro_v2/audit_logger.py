"""Immutable audit event logging primitives for compliance-sensitive flows."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from itertools import count
from json import dumps
from types import MappingProxyType
from typing import Any, Callable, Mapping


def _freeze_value(value: Any) -> Any:
    """Recursively freeze nested containers so stored events cannot be mutated."""
    if isinstance(value, Mapping):
        frozen_items = {str(key): _freeze_value(item) for key, item in sorted(value.items())}
        return MappingProxyType(frozen_items)
    if isinstance(value, list):
        return tuple(_freeze_value(item) for item in value)
    if isinstance(value, tuple):
        return tuple(_freeze_value(item) for item in value)
    if isinstance(value, set):
        return tuple(sorted(_freeze_value(item) for item in value))
    return value


def _canonicalize(value: Any) -> Any:
    """Convert frozen values into deterministic JSON-serializable structures."""
    if isinstance(value, Mapping):
        return {key: _canonicalize(item) for key, item in value.items()}
    if isinstance(value, tuple):
        return [_canonicalize(item) for item in value]
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _default_event_id_factory() -> Callable[[], str]:
    sequence = count(1)

    def factory() -> str:
        return f"audit-{next(sequence):06d}"

    return factory


@dataclass(frozen=True)
class AuditEvent:
    """Canonical append-only record for security and compliance events."""

    event_id: str
    event_type: str
    actor_id: str
    request_id: str
    idempotency_key: str
    schema_version: str
    outcome: str
    recorded_at: datetime
    payload: Any
    metadata: Mapping[str, Any]
    previous_event_hash: str | None
    event_hash: str


class ImmutableAuditLogger:
    """Append-only in-memory logger with tamper-evident hash chaining."""

    def __init__(
        self,
        *,
        clock: Callable[[], datetime] | None = None,
        event_id_factory: Callable[[], str] | None = None,
    ) -> None:
        self._clock = clock or (lambda: datetime.now(timezone.utc))
        self._event_id_factory = event_id_factory or _default_event_id_factory()
        self._events: tuple[AuditEvent, ...] = ()

    @property
    def events(self) -> tuple[AuditEvent, ...]:
        return self._events

    @events.setter
    def events(self, _: tuple[AuditEvent, ...]) -> None:
        raise AttributeError("ImmutableAuditLogger.events is read-only")

    def append(
        self,
        *,
        event_type: str,
        actor_id: str,
        request_id: str,
        idempotency_key: str,
        schema_version: str,
        outcome: str,
        payload: Mapping[str, Any] | None = None,
        metadata: Mapping[str, Any] | None = None,
    ) -> AuditEvent:
        frozen_payload = _freeze_value(payload or {})
        frozen_metadata = _freeze_value(metadata or {})
        recorded_at = self._clock().astimezone(timezone.utc)
        previous_event_hash = self._events[-1].event_hash if self._events else None
        event_id = self._event_id_factory()
        event_hash = self._build_event_hash(
            event_id=event_id,
            event_type=event_type,
            actor_id=actor_id,
            request_id=request_id,
            idempotency_key=idempotency_key,
            schema_version=schema_version,
            outcome=outcome,
            recorded_at=recorded_at,
            payload=frozen_payload,
            metadata=frozen_metadata,
            previous_event_hash=previous_event_hash,
        )
        event = AuditEvent(
            event_id=event_id,
            event_type=event_type,
            actor_id=actor_id,
            request_id=request_id,
            idempotency_key=idempotency_key,
            schema_version=schema_version,
            outcome=outcome,
            recorded_at=recorded_at,
            payload=frozen_payload,
            metadata=frozen_metadata,
            previous_event_hash=previous_event_hash,
            event_hash=event_hash,
        )
        self._events = self._events + (event,)
        return event

    @staticmethod
    def _build_event_hash(
        *,
        event_id: str,
        event_type: str,
        actor_id: str,
        request_id: str,
        idempotency_key: str,
        schema_version: str,
        outcome: str,
        recorded_at: datetime,
        payload: Any,
        metadata: Any,
        previous_event_hash: str | None,
    ) -> str:
        canonical = {
            "actor_id": actor_id,
            "event_id": event_id,
            "event_type": event_type,
            "idempotency_key": idempotency_key,
            "metadata": _canonicalize(metadata),
            "outcome": outcome,
            "payload": _canonicalize(payload),
            "previous_event_hash": previous_event_hash,
            "recorded_at": recorded_at.isoformat(),
            "request_id": request_id,
            "schema_version": schema_version,
        }
        digest_input = dumps(canonical, separators=(",", ":"), sort_keys=True)
        return sha256(digest_input.encode("utf-8")).hexdigest()
