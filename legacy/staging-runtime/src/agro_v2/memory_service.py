"""B-033 typed memory service with freshness metadata."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


def _require_utc(value: datetime, *, label: str) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise MemoryServiceError(f"{label} must be timezone-aware")
    return value.astimezone(timezone.utc)


def _hours_between(*, newer: datetime, older: datetime) -> float:
    return max((newer - older).total_seconds(), 0.0) / 3600


class MemoryType(str, Enum):
    USER = "user"
    FEEDBACK = "feedback"
    PROJECT = "project"
    REFERENCE = "reference"


class FreshnessState(str, Enum):
    FRESH = "fresh"
    AGING = "aging"
    STALE = "stale"


class MemoryServiceError(ValueError):
    """Raised when typed memory inputs violate taxonomy or freshness rules."""


@dataclass(frozen=True)
class FreshnessThreshold:
    fresh_after_hours: int
    stale_after_hours: int

    def __post_init__(self) -> None:
        if self.fresh_after_hours < 0:
            raise MemoryServiceError("fresh_after_hours must be zero or greater")
        if self.stale_after_hours <= self.fresh_after_hours:
            raise MemoryServiceError("stale_after_hours must be greater than fresh_after_hours")


@dataclass(frozen=True)
class MemoryFreshness:
    state: FreshnessState
    score: float
    age_hours: float
    evaluated_at: datetime
    anchor_at: datetime
    stale: bool


@dataclass(frozen=True)
class MemoryRecord:
    memory_id: str
    memory_type: MemoryType
    namespace: str
    payload: dict[str, object]
    created_at: datetime
    confidence_score: float = 1.0
    source_updated_at: datetime | None = None
    last_verified_at: datetime | None = None
    tags: tuple[str, ...] = ()
    metadata: dict[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.memory_id.strip():
            raise MemoryServiceError("memory_id is required")
        if not self.namespace.strip():
            raise MemoryServiceError("namespace is required")
        if not self.payload:
            raise MemoryServiceError("payload is required")
        if not 0 <= self.confidence_score <= 1:
            raise MemoryServiceError("confidence_score must be between 0 and 1")

        created_at = _require_utc(self.created_at, label="created_at")
        object.__setattr__(self, "created_at", created_at)

        if self.source_updated_at is not None:
            source_updated_at = _require_utc(self.source_updated_at, label="source_updated_at")
            if source_updated_at < created_at:
                raise MemoryServiceError("source_updated_at cannot be earlier than created_at")
            object.__setattr__(self, "source_updated_at", source_updated_at)

        if self.last_verified_at is not None:
            last_verified_at = _require_utc(self.last_verified_at, label="last_verified_at")
            if last_verified_at < created_at:
                raise MemoryServiceError("last_verified_at cannot be earlier than created_at")
            object.__setattr__(self, "last_verified_at", last_verified_at)

        normalized_tags = tuple(tag.strip() for tag in self.tags if tag.strip())
        if len(normalized_tags) != len(set(normalized_tags)):
            raise MemoryServiceError("tags must be unique")
        object.__setattr__(self, "tags", normalized_tags)

        object.__setattr__(self, "payload", deepcopy(self.payload))
        object.__setattr__(self, "metadata", deepcopy(self.metadata))


@dataclass(frozen=True)
class StoredMemoryRecord:
    record: MemoryRecord
    freshness: MemoryFreshness


DEFAULT_FRESHNESS_THRESHOLDS: dict[MemoryType, FreshnessThreshold] = {
    MemoryType.USER: FreshnessThreshold(fresh_after_hours=168, stale_after_hours=720),
    MemoryType.FEEDBACK: FreshnessThreshold(fresh_after_hours=72, stale_after_hours=336),
    MemoryType.PROJECT: FreshnessThreshold(fresh_after_hours=48, stale_after_hours=168),
    MemoryType.REFERENCE: FreshnessThreshold(fresh_after_hours=24, stale_after_hours=96),
}


class TypedMemoryService:
    """Stores typed memories and computes persisted freshness metadata."""

    def __init__(
        self,
        *,
        thresholds: dict[MemoryType, FreshnessThreshold] | None = None,
    ) -> None:
        self._thresholds = deepcopy(thresholds) if thresholds is not None else DEFAULT_FRESHNESS_THRESHOLDS
        missing = set(MemoryType).difference(self._thresholds)
        if missing:
            raise MemoryServiceError(f"missing freshness thresholds: {sorted(item.value for item in missing)}")
        self._records: dict[str, StoredMemoryRecord] = {}

    def upsert(
        self,
        record: MemoryRecord,
        *,
        now: datetime | None = None,
    ) -> StoredMemoryRecord:
        freshness = self.assess(record, now=now)
        stored = StoredMemoryRecord(record=record, freshness=freshness)
        self._records[record.memory_id] = stored
        return self.get(record.memory_id, now=now)

    def get(
        self,
        memory_id: str,
        *,
        now: datetime | None = None,
    ) -> StoredMemoryRecord:
        try:
            stored = self._records[memory_id]
        except KeyError as exc:
            raise KeyError(f"Unknown memory_id: {memory_id}") from exc
        freshness = self.assess(stored.record, now=now)
        return StoredMemoryRecord(
            record=stored.record,
            freshness=freshness,
        )

    def list(
        self,
        *,
        memory_type: MemoryType | None = None,
        now: datetime | None = None,
    ) -> list[StoredMemoryRecord]:
        items = []
        for stored in self._records.values():
            if memory_type is not None and stored.record.memory_type != memory_type:
                continue
            items.append(self.get(stored.record.memory_id, now=now))
        return items

    def assess(
        self,
        record: MemoryRecord,
        *,
        now: datetime | None = None,
    ) -> MemoryFreshness:
        evaluated_at = _require_utc(now or datetime.now(timezone.utc), label="now")
        anchor_at = max(
            value
            for value in (
                record.created_at,
                record.source_updated_at,
                record.last_verified_at,
            )
            if value is not None
        )
        age_hours = _hours_between(newer=evaluated_at, older=anchor_at)
        threshold = self._thresholds[record.memory_type]
        state = _freshness_state(age_hours=age_hours, threshold=threshold)
        return MemoryFreshness(
            state=state,
            score=_freshness_score(age_hours=age_hours, threshold=threshold),
            age_hours=age_hours,
            evaluated_at=evaluated_at,
            anchor_at=anchor_at,
            stale=state == FreshnessState.STALE,
        )


def _freshness_state(*, age_hours: float, threshold: FreshnessThreshold) -> FreshnessState:
    if age_hours <= threshold.fresh_after_hours:
        return FreshnessState.FRESH
    if age_hours < threshold.stale_after_hours:
        return FreshnessState.AGING
    return FreshnessState.STALE


def _freshness_score(*, age_hours: float, threshold: FreshnessThreshold) -> float:
    if age_hours <= threshold.fresh_after_hours:
        return 1.0
    if age_hours >= threshold.stale_after_hours:
        return 0.0

    freshness_window = threshold.stale_after_hours - threshold.fresh_after_hours
    decay = (age_hours - threshold.fresh_after_hours) / freshness_window
    return round(max(0.0, 1.0 - decay), 4)
