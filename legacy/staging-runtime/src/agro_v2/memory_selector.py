"""B-034 selective memory recall and stale-memory revalidation signals."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import re

from .memory_service import (
    FreshnessState,
    MemoryFreshness,
    MemoryRecord,
    MemoryServiceError,
    MemoryType,
    TypedMemoryService,
)


class MemorySelectorError(ValueError):
    """Raised when memory selector inputs are invalid."""


@dataclass(frozen=True)
class SelectedMemory:
    record: MemoryRecord
    freshness: MemoryFreshness
    ranking_score: float
    matched_terms: tuple[str, ...]
    requires_revalidation: bool


@dataclass(frozen=True)
class MemorySelectionRequest:
    query: str
    limit: int = 5
    minimum_confidence: float = 0.0
    allowed_types: tuple[MemoryType, ...] | None = None
    namespace_prefix: str | None = None

    def __post_init__(self) -> None:
        if not self.query.strip():
            raise MemorySelectorError("query is required")
        if self.limit <= 0:
            raise MemorySelectorError("limit must be positive")
        if not 0 <= self.minimum_confidence <= 1:
            raise MemorySelectorError("minimum_confidence must be between 0 and 1")
        if self.namespace_prefix is not None and not self.namespace_prefix.strip():
            raise MemorySelectorError("namespace_prefix must not be blank")


@dataclass(frozen=True)
class MemorySelectionOutcome:
    selected: tuple[SelectedMemory, ...]
    requires_revalidation: bool
    stale_memory_ids: tuple[str, ...]


class MemorySelector:
    """Ranks typed memories and flags stale items for explicit revalidation."""

    def __init__(self, *, memory_service: TypedMemoryService) -> None:
        self._memory_service = memory_service

    def select(
        self,
        request: MemorySelectionRequest,
        *,
        now: datetime | None = None,
    ) -> MemorySelectionOutcome:
        candidates = []
        for stored in self._memory_service.list(now=now):
            record = stored.record
            if request.allowed_types is not None and record.memory_type not in request.allowed_types:
                continue
            if request.namespace_prefix is not None and not record.namespace.startswith(
                request.namespace_prefix
            ):
                continue
            if record.confidence_score < request.minimum_confidence:
                continue

            matched_terms = _matched_terms(request.query, record)
            if not matched_terms:
                continue

            ranking_score = _ranking_score(
                matched_terms=matched_terms,
                record=record,
                freshness=stored.freshness,
            )
            candidates.append(
                SelectedMemory(
                    record=record,
                    freshness=stored.freshness,
                    ranking_score=ranking_score,
                    matched_terms=matched_terms,
                    requires_revalidation=stored.freshness.state == FreshnessState.STALE,
                )
            )

        ranked = sorted(
            candidates,
            key=lambda item: (
                item.requires_revalidation,
                -item.ranking_score,
                item.record.memory_id,
            ),
        )
        selected = tuple(ranked[: request.limit])
        stale_memory_ids = tuple(
            item.record.memory_id for item in selected if item.requires_revalidation
        )
        return MemorySelectionOutcome(
            selected=selected,
            requires_revalidation=bool(stale_memory_ids),
            stale_memory_ids=stale_memory_ids,
        )


def _matched_terms(query: str, record: MemoryRecord) -> tuple[str, ...]:
    haystack = " ".join(
        [
            record.namespace,
            " ".join(record.tags),
            _flatten_payload(record.payload),
            _flatten_payload(record.metadata),
        ]
    ).lower()
    matched = []
    for token in _tokenize(query):
        if token in haystack and token not in matched:
            matched.append(token)
    return tuple(matched)


def _flatten_payload(payload: object) -> str:
    if isinstance(payload, dict):
        values = []
        for key, value in payload.items():
            values.append(str(key))
            values.append(_flatten_payload(value))
        return " ".join(values)
    if isinstance(payload, (list, tuple, set)):
        return " ".join(_flatten_payload(value) for value in payload)
    return str(payload)


def _tokenize(value: str) -> tuple[str, ...]:
    return tuple(token for token in re.findall(r"[a-z0-9]+", value.lower()) if len(token) > 1)


def _ranking_score(
    *,
    matched_terms: tuple[str, ...],
    record: MemoryRecord,
    freshness: MemoryFreshness,
) -> float:
    type_weight = {
        MemoryType.USER: 0.15,
        MemoryType.FEEDBACK: 0.1,
        MemoryType.PROJECT: 0.2,
        MemoryType.REFERENCE: 0.25,
    }[record.memory_type]
    revalidation_penalty = 0.35 if freshness.state == FreshnessState.STALE else 0.0
    return round(
        len(matched_terms) + record.confidence_score + freshness.score + type_weight - revalidation_penalty,
        4,
    )
