import json

import pytest

from agro_v2.advisory_retrieval import CitationMetadata
from agro_v2.climate_risk_ingestion import ClimateRiskSignal, ClimateSourceType
from agro_v2.enterprise_analytics_mart import (
    EnterpriseAnalyticsDataMartContract,
    EnterpriseAnalyticsDataMartError,
    EnterpriseAnalyticsSourceBundle,
)
from agro_v2.listings import (
    CreateListingCommand,
    CreateListingPayload,
    ListingApiContract,
    ListingStatus,
    UpdateListingCommand,
    UpdateListingPayload,
)
from agro_v2.traceability_event_chain import TraceabilityEventChainService, TraceabilityEventType


def build_listing(*, published: bool = True):
    service = ListingApiContract(clock=lambda: "2026-04-13T13:00:00+00:00")
    listing = service.create(
        CreateListingCommand(
            request_id="req-025-1",
            idempotency_key="idem-025-1",
            actor_id="farmer-025",
            payload=CreateListingPayload(
                listing_id="listing-025",
                seller_id="seller-025",
                commodity_code="maize",
                quantity_kg=1250,
                price_minor=520_000,
                currency="GHS",
            ),
        )
    )
    if not published:
        return listing
    return service.update(
        UpdateListingCommand(
            request_id="req-025-2",
            idempotency_key="idem-025-2",
            actor_id="farmer-025",
            listing_id="listing-025",
            payload=UpdateListingPayload(status=ListingStatus.PUBLISHED),
        )
    )


def build_traceability_events():
    chain = TraceabilityEventChainService()
    listing = build_listing()
    listed = chain.start_chain(
        consignment_id="consignment-025",
        listing=listing,
        actor_id="ops-025",
        occurred_at="2026-04-13T13:10:00Z",
        location_code="GH-AH",
        evidence_reference_ids=("listing:published",),
    )
    quality = chain.append_event(
        consignment_id="consignment-025",
        event_type=TraceabilityEventType.QUALITY_CHECKED,
        actor_id="qa-025",
        occurred_at="2026-04-13T13:20:00Z",
        location_code="GH-AH",
        evidence_reference_ids=("qa:certificate-025",),
        payload={"grade": "A"},
    )
    return (listed, quality)


def build_climate_signal(**overrides) -> ClimateRiskSignal:
    payload = {
        "signal_id": "climate:025:1",
        "farm_id": "farm-025",
        "country_code": "GH",
        "region": "west_africa",
        "source_type": ClimateSourceType.WEATHER,
        "normalized_metric": "rainfall_24h_mm",
        "normalized_value": 55.0,
        "normalized_unit": "mm",
        "risk_hint": "heavy_rain",
        "observed_at": "2026-04-13T13:05:00Z",
        "provenance_key": "weather:provider:025:1",
        "reconciliation_key": "GH:farm-025:rainfall_24h_mm:2026-04-13T13:05:00Z",
        "confidence": 0.91,
    }
    payload.update(overrides)
    return ClimateRiskSignal(**payload)


def build_citation(source_id: str) -> CitationMetadata:
    return CitationMetadata(
        citation_id=f"cite-{source_id}",
        source_id=source_id,
        rank=1,
        title="Enterprise crop benchmark",
        publisher="Agrodomain Research",
        url=f"https://example.com/{source_id}",
        published_at="2026-04-01",
        excerpt="Regional intelligence benchmark.",
        relevance_score=1.2,
        retrieved_at="2026-04-13T13:30:00Z",
        render_label=f"[1] {source_id}",
    )


def build_bundle(**overrides) -> EnterpriseAnalyticsSourceBundle:
    payload = {
        "country_code": "GH",
        "listing": build_listing(),
        "climate_signals": (build_climate_signal(),),
        "traceability_events": build_traceability_events(),
        "citations": (build_citation("source-025-1"), build_citation("source-025-2")),
    }
    payload.update(overrides)
    return EnterpriseAnalyticsSourceBundle(**payload)


def test_project_bundle_builds_anonymized_regional_mart_row():
    contract = EnterpriseAnalyticsDataMartContract()

    row = contract.project_bundle(build_bundle())

    assert row.region == "west_africa"
    assert row.country_code == "GH"
    assert row.citation_count == 2
    assert row.high_risk_signal_count == 1
    assert row.custody_stage == "quality_checked"
    assert row.data_check_id == "DI-003"


def test_project_bundle_rejects_unpublished_listing_and_country_mismatch():
    contract = EnterpriseAnalyticsDataMartContract()

    with pytest.raises(EnterpriseAnalyticsDataMartError, match="published"):
        contract.project_bundle(build_bundle(listing=build_listing(published=False)))

    with pytest.raises(EnterpriseAnalyticsDataMartError, match="country_code mismatch"):
        contract.project_bundle(
            build_bundle(
                climate_signals=(build_climate_signal(country_code="NG"),),
            )
        )


def test_projection_stays_stable_and_leaks_no_raw_identifiers():
    contract = EnterpriseAnalyticsDataMartContract(anonymization_salt="stable-salt")
    bundle = build_bundle()

    first = contract.project_bundle(bundle)
    second = contract.project_bundle(bundle)

    assert first.anonymized_subject_key == second.anonymized_subject_key
    serialized = json.dumps(first.as_payload(), sort_keys=True)
    assert "listing-025" not in serialized
    assert "seller-025" not in serialized
    assert "consignment-025" not in serialized
    assert "farm-025" not in serialized
