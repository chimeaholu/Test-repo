from datetime import datetime, timedelta, timezone

import pytest

from agro_v2.memory_selector import (
    MemorySelectionRequest,
    MemorySelector,
    MemorySelectorError,
)
from agro_v2.memory_service import MemoryRecord, MemoryType, TypedMemoryService


def test_selection_request_validates_input():
    with pytest.raises(MemorySelectorError):
        MemorySelectionRequest(query=" ", limit=1)

    with pytest.raises(MemorySelectorError):
        MemorySelectionRequest(query="maize", limit=0)


def test_selector_ranks_top_k_by_match_freshness_and_confidence():
    service = TypedMemoryService()
    selector = MemorySelector(memory_service=service)
    created_at = datetime(2026, 4, 13, 0, 0, tzinfo=timezone.utc)

    service.upsert(
        MemoryRecord(
            memory_id="ref-1",
            memory_type=MemoryType.REFERENCE,
            namespace="advisory:maize",
            payload={"summary": "maize rust prevention guide"},
            created_at=created_at,
            confidence_score=0.95,
            tags=("maize", "rust"),
        ),
        now=created_at + timedelta(hours=2),
    )
    service.upsert(
        MemoryRecord(
            memory_id="proj-1",
            memory_type=MemoryType.PROJECT,
            namespace="project:maize-pilot",
            payload={"summary": "maize rollout lessons"},
            created_at=created_at,
            confidence_score=0.8,
            tags=("maize",),
        ),
        now=created_at + timedelta(hours=2),
    )
    service.upsert(
        MemoryRecord(
            memory_id="user-1",
            memory_type=MemoryType.USER,
            namespace="farmer:123",
            payload={"crop_preference": "cassava"},
            created_at=created_at,
            confidence_score=1.0,
        ),
        now=created_at + timedelta(hours=2),
    )

    outcome = selector.select(
        MemorySelectionRequest(query="maize rust guide", limit=2),
        now=created_at + timedelta(hours=2),
    )

    assert [item.record.memory_id for item in outcome.selected] == ["ref-1", "proj-1"]
    assert outcome.requires_revalidation is False
    assert outcome.stale_memory_ids == ()


def test_selector_filters_by_type_namespace_and_confidence():
    service = TypedMemoryService()
    selector = MemorySelector(memory_service=service)
    created_at = datetime(2026, 4, 13, 0, 0, tzinfo=timezone.utc)

    service.upsert(
        MemoryRecord(
            memory_id="ref-1",
            memory_type=MemoryType.REFERENCE,
            namespace="advisory:maize",
            payload={"summary": "maize advisory"},
            created_at=created_at,
            confidence_score=0.9,
        ),
        now=created_at,
    )
    service.upsert(
        MemoryRecord(
            memory_id="feedback-1",
            memory_type=MemoryType.FEEDBACK,
            namespace="ticket:maize",
            payload={"summary": "maize complaint"},
            created_at=created_at,
            confidence_score=0.4,
        ),
        now=created_at,
    )

    outcome = selector.select(
        MemorySelectionRequest(
            query="maize advisory",
            allowed_types=(MemoryType.REFERENCE,),
            namespace_prefix="advisory:",
            minimum_confidence=0.8,
        ),
        now=created_at,
    )

    assert [item.record.memory_id for item in outcome.selected] == ["ref-1"]


def test_selector_marks_stale_recalled_memory_for_revalidation():
    service = TypedMemoryService()
    selector = MemorySelector(memory_service=service)
    created_at = datetime(2026, 4, 1, 0, 0, tzinfo=timezone.utc)

    service.upsert(
        MemoryRecord(
            memory_id="ref-stale",
            memory_type=MemoryType.REFERENCE,
            namespace="advisory:maize",
            payload={"summary": "maize treatment bulletin"},
            created_at=created_at,
            confidence_score=0.95,
        ),
        now=created_at,
    )

    outcome = selector.select(
        MemorySelectionRequest(query="maize treatment", limit=1),
        now=created_at + timedelta(days=8),
    )

    assert [item.record.memory_id for item in outcome.selected] == ["ref-stale"]
    assert outcome.requires_revalidation is True
    assert outcome.stale_memory_ids == ("ref-stale",)
    assert outcome.selected[0].requires_revalidation is True


def test_selector_returns_empty_when_no_terms_match():
    service = TypedMemoryService()
    selector = MemorySelector(memory_service=service)
    created_at = datetime(2026, 4, 13, 0, 0, tzinfo=timezone.utc)
    service.upsert(
        MemoryRecord(
            memory_id="proj-1",
            memory_type=MemoryType.PROJECT,
            namespace="project:yam",
            payload={"summary": "yam transport"},
            created_at=created_at,
        ),
        now=created_at,
    )

    outcome = selector.select(
        MemorySelectionRequest(query="maize advisory", limit=3),
        now=created_at,
    )

    assert outcome.selected == ()
    assert outcome.requires_revalidation is False
