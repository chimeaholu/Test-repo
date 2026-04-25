from datetime import datetime, timedelta, timezone

import pytest

from agro_v2.memory_service import (
    FreshnessState,
    FreshnessThreshold,
    MemoryRecord,
    MemoryServiceError,
    MemoryType,
    TypedMemoryService,
)


def test_memory_record_rejects_unknown_taxonomy_inputs():
    with pytest.raises(MemoryServiceError):
        MemoryRecord(
            memory_id=" ",
            memory_type=MemoryType.USER,
            namespace="farmer:123",
            payload={"preferred_language": "en"},
            created_at=datetime.now(timezone.utc),
        )


def test_memory_record_requires_timezone_aware_dates():
    with pytest.raises(MemoryServiceError):
        MemoryRecord(
            memory_id="mem-1",
            memory_type=MemoryType.USER,
            namespace="farmer:123",
            payload={"preferred_language": "en"},
            created_at=datetime(2026, 4, 13, 6, 0, 0),
        )


def test_memory_record_rejects_invalid_confidence_and_tag_duplicates():
    with pytest.raises(MemoryServiceError):
        MemoryRecord(
            memory_id="mem-1",
            memory_type=MemoryType.FEEDBACK,
            namespace="ticket:42",
            payload={"sentiment": "positive"},
            created_at=datetime.now(timezone.utc),
            confidence_score=1.1,
        )

    with pytest.raises(MemoryServiceError):
        MemoryRecord(
            memory_id="mem-2",
            memory_type=MemoryType.FEEDBACK,
            namespace="ticket:42",
            payload={"sentiment": "positive"},
            created_at=datetime.now(timezone.utc),
            tags=("seasonal", "seasonal"),
        )


def test_upsert_persists_freshness_metadata_with_latest_anchor():
    service = TypedMemoryService()
    created_at = datetime(2026, 4, 10, 12, 0, tzinfo=timezone.utc)
    last_verified_at = created_at + timedelta(hours=23)
    now = created_at + timedelta(hours=50)

    stored = service.upsert(
        MemoryRecord(
            memory_id="mem-1",
            memory_type=MemoryType.REFERENCE,
            namespace="advisory:maize",
            payload={"source_id": "kb-22"},
            created_at=created_at,
            last_verified_at=last_verified_at,
            metadata={"journey": "IDI-004"},
        ),
        now=now,
    )

    assert stored.freshness.anchor_at == last_verified_at
    assert stored.freshness.state == FreshnessState.AGING
    assert stored.freshness.stale is False
    assert stored.freshness.age_hours == 27
    assert stored.freshness.score == pytest.approx(0.9583, rel=1e-4)


def test_assess_marks_memory_stale_after_threshold_and_type_specific_window():
    service = TypedMemoryService(
        thresholds={
            MemoryType.USER: FreshnessThreshold(24, 48),
            MemoryType.FEEDBACK: FreshnessThreshold(12, 24),
            MemoryType.PROJECT: FreshnessThreshold(72, 144),
            MemoryType.REFERENCE: FreshnessThreshold(6, 12),
        }
    )
    created_at = datetime(2026, 4, 12, 0, 0, tzinfo=timezone.utc)

    record = MemoryRecord(
        memory_id="mem-2",
        memory_type=MemoryType.FEEDBACK,
        namespace="ticket:99",
        payload={"summary": "delivery delayed"},
        created_at=created_at,
    )

    freshness = service.assess(record, now=created_at + timedelta(hours=25))

    assert freshness.state == FreshnessState.STALE
    assert freshness.stale is True
    assert freshness.score == 0.0


def test_list_filters_by_memory_type_and_returns_recomputed_freshness():
    service = TypedMemoryService()
    created_at = datetime(2026, 4, 13, 0, 0, tzinfo=timezone.utc)

    service.upsert(
        MemoryRecord(
            memory_id="mem-user",
            memory_type=MemoryType.USER,
            namespace="farmer:123",
            payload={"preferred_channel": "whatsapp"},
            created_at=created_at,
        ),
        now=created_at,
    )
    service.upsert(
        MemoryRecord(
            memory_id="mem-ref",
            memory_type=MemoryType.REFERENCE,
            namespace="advisory:maize",
            payload={"source_id": "kb-22"},
            created_at=created_at,
        ),
        now=created_at,
    )

    filtered = service.list(
        memory_type=MemoryType.REFERENCE,
        now=created_at + timedelta(hours=120),
    )

    assert [item.record.memory_id for item in filtered] == ["mem-ref"]
    assert filtered[0].freshness.state == FreshnessState.STALE


def test_service_requires_thresholds_for_all_memory_types():
    with pytest.raises(MemoryServiceError):
        TypedMemoryService(
            thresholds={
                MemoryType.USER: FreshnessThreshold(24, 48),
            }
        )
