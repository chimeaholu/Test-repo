"""Append-only audit event writer primitives with hash-chain validation."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
from itertools import count
import json
from json import JSONDecodeError
import os
from pathlib import Path
from typing import Any, Mapping


def _default_event_id_factory():
    sequence = count(1)

    def factory() -> str:
        return f"aevt-{next(sequence):06d}"

    return factory


class AuditEventSchemaError(ValueError):
    """Raised when an audit record fails schema validation."""


class AuditLogIntegrityError(ValueError):
    """Raised when audit log chain integrity is broken."""


@dataclass(frozen=True)
class AuditEvent:
    event_type: str
    actor_id: str
    schema_version: str
    payload: Mapping[str, Any] = field(default_factory=dict)
    metadata: Mapping[str, Any] = field(default_factory=dict)
    event_id: str = ""
    occurred_at: str = ""

    def __post_init__(self) -> None:
        if not self.event_type.strip():
            raise AuditEventSchemaError("event_type is required")
        if not self.actor_id.strip():
            raise AuditEventSchemaError("actor_id is required")
        if not self.schema_version.strip():
            raise AuditEventSchemaError("schema_version is required")
        if not isinstance(self.payload, Mapping):
            raise AuditEventSchemaError("payload must be a mapping")
        if not isinstance(self.metadata, Mapping):
            raise AuditEventSchemaError("metadata must be a mapping")


def compute_event_hash(record: Mapping[str, Any]) -> str:
    canonical_record = {
        key: value for key, value in dict(record).items() if key != "event_hash"
    }
    canonical = json.dumps(
        canonical_record,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )
    return sha256(canonical.encode("utf-8")).hexdigest()


def validate_persisted_audit_record(record: Mapping[str, Any]) -> None:
    required = {
        "actor_id",
        "event_hash",
        "event_id",
        "event_type",
        "metadata",
        "occurred_at",
        "payload",
        "previous_event_hash",
        "schema_version",
    }
    missing = sorted(required.difference(record))
    if missing:
        raise AuditEventSchemaError(f"Missing required field(s): {', '.join(missing)}")
    if record["previous_event_hash"] is not None and (
        not isinstance(record["previous_event_hash"], str)
        or not record["previous_event_hash"].strip()
    ):
        raise AuditEventSchemaError("previous_event_hash must be a non-empty string or null")
    if not isinstance(record["payload"], Mapping):
        raise AuditEventSchemaError("payload must be a mapping")
    if not isinstance(record["metadata"], Mapping):
        raise AuditEventSchemaError("metadata must be a mapping")

    expected_hash = compute_event_hash({k: v for k, v in record.items() if k != "event_hash"})
    if record["event_hash"] != expected_hash:
        raise AuditLogIntegrityError("event hash does not match persisted record content")


class AppendOnlyAuditEventWriter:
    """Write canonical audit records as JSONL with previous-hash chaining."""

    def __init__(self, path: str | Path, *, event_id_factory=None, clock=None) -> None:
        self._path = Path(path)
        self._event_id_factory = event_id_factory or _default_event_id_factory()
        self._clock = clock or (lambda: datetime.now(timezone.utc))

    def append_event(self, event: AuditEvent) -> dict[str, Any]:
        previous_event_hash = self._load_tail_hash()
        record = {
            "event_id": event.event_id or self._event_id_factory(),
            "event_type": event.event_type,
            "actor_id": event.actor_id,
            "schema_version": event.schema_version,
            "occurred_at": event.occurred_at
            or self._clock().astimezone(timezone.utc).isoformat(),
            "payload": dict(event.payload),
            "metadata": dict(event.metadata),
            "previous_event_hash": previous_event_hash,
        }
        record["event_hash"] = compute_event_hash(record)
        validate_persisted_audit_record(record)

        self._path.parent.mkdir(parents=True, exist_ok=True)
        encoded = json.dumps(record, sort_keys=True, separators=(",", ":")).encode("utf-8")
        fd = os.open(self._path, os.O_APPEND | os.O_CREAT | os.O_WRONLY, 0o640)
        try:
            with os.fdopen(fd, "ab", closefd=False) as handle:
                handle.write(encoded + b"\n")
                handle.flush()
                os.fsync(handle.fileno())
        finally:
            os.close(fd)
        return record

    def _load_tail_hash(self) -> str | None:
        if not self._path.exists():
            return None

        lines = self._path.read_text(encoding="utf-8").splitlines()
        if not lines:
            return None

        try:
            tail = json.loads(lines[-1])
        except JSONDecodeError as exc:
            raise AuditLogIntegrityError("audit log tail is not valid JSON") from exc
        validate_persisted_audit_record(tail)
        return tail["event_hash"]
