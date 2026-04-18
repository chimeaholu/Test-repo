"""B-025 enterprise analytics data mart projection contracts."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from hashlib import sha256
import json

from .advisory_retrieval import CitationMetadata
from .climate_risk_ingestion import ClimateRiskSignal
from .country_pack import resolve_country_policy
from .listings import CommodityListing, ListingStatus
from .traceability_event_chain import TraceabilityChainEvent


class EnterpriseAnalyticsDataMartError(ValueError):
    """Raised when analytics projections break anonymization or contract rules."""


@dataclass(frozen=True)
class EnterpriseAnalyticsSourceBundle:
    country_code: str
    listing: CommodityListing
    climate_signals: tuple[ClimateRiskSignal, ...]
    traceability_events: tuple[TraceabilityChainEvent, ...]
    citations: tuple[CitationMetadata, ...]

    def __post_init__(self) -> None:
        if not self.country_code.strip():
            raise EnterpriseAnalyticsDataMartError("country_code is required")
        if not self.climate_signals:
            raise EnterpriseAnalyticsDataMartError("climate_signals must not be empty")
        if not self.traceability_events:
            raise EnterpriseAnalyticsDataMartError("traceability_events must not be empty")
        if not self.citations:
            raise EnterpriseAnalyticsDataMartError("citations must not be empty")


@dataclass(frozen=True)
class EnterpriseAnalyticsMartRow:
    schema_version: str
    anonymized_subject_key: str
    country_code: str
    region: str
    commodity_code: str
    listing_status: str
    quantity_band: str
    price_band: str
    climate_signal_count: int
    high_risk_signal_count: int
    traceability_event_count: int
    custody_stage: str
    citation_count: int
    citation_source_ids: tuple[str, ...]
    metric_value: dict[str, int | float | str]
    data_check_id: str

    def as_payload(self) -> dict[str, object]:
        return asdict(self)


class EnterpriseAnalyticsDataMartContract:
    """Projects operational activity into anonymized enterprise-safe mart rows."""

    def __init__(
        self,
        *,
        schema_version: str = "enterprise-analytics.v1",
        anonymization_salt: str = "agrodomain-analytics-v1",
    ) -> None:
        if not schema_version.strip():
            raise EnterpriseAnalyticsDataMartError("schema_version is required")
        if not anonymization_salt.strip():
            raise EnterpriseAnalyticsDataMartError("anonymization_salt is required")
        self._schema_version = schema_version
        self._salt = anonymization_salt

    def project_bundle(self, bundle: EnterpriseAnalyticsSourceBundle) -> EnterpriseAnalyticsMartRow:
        if bundle.listing.status != ListingStatus.PUBLISHED:
            raise EnterpriseAnalyticsDataMartError("listing must be published before analytics export")

        country = resolve_country_policy(bundle.country_code)
        for signal in bundle.climate_signals:
            if signal.country_code != country.country_code:
                raise EnterpriseAnalyticsDataMartError("climate signal country_code mismatch")
        consignment_id = bundle.traceability_events[0].consignment_id
        if any(event.consignment_id != consignment_id for event in bundle.traceability_events):
            raise EnterpriseAnalyticsDataMartError("traceability_events must belong to one consignment")

        subject_key = self._anonymize(
            bundle.listing.seller_id,
            bundle.listing.listing_id,
            consignment_id,
        )
        high_risk_count = sum(signal.risk_hint != "normal" for signal in bundle.climate_signals)
        latest_event = max(bundle.traceability_events, key=lambda event: event.sequence)

        row = EnterpriseAnalyticsMartRow(
            schema_version=self._schema_version,
            anonymized_subject_key=subject_key,
            country_code=country.country_code,
            region=country.region,
            commodity_code=bundle.listing.commodity_code,
            listing_status=bundle.listing.status.value,
            quantity_band=_quantity_band(bundle.listing.quantity_kg),
            price_band=_price_band(bundle.listing.price_minor),
            climate_signal_count=len(bundle.climate_signals),
            high_risk_signal_count=high_risk_count,
            traceability_event_count=len(bundle.traceability_events),
            custody_stage=latest_event.event_type.value,
            citation_count=len(bundle.citations),
            citation_source_ids=tuple(citation.source_id for citation in bundle.citations),
            metric_value={
                "published_quantity_kg": bundle.listing.quantity_kg,
                "published_price_minor": bundle.listing.price_minor,
                "high_risk_signal_ratio": round(high_risk_count / len(bundle.climate_signals), 4),
                "evidence_attachment_refs": sum(
                    len(event.evidence_reference_ids) for event in bundle.traceability_events
                ),
            },
            data_check_id="DI-003",
        )
        self._assert_no_raw_identifier_leak(
            row=row,
            raw_identifiers=(
                bundle.listing.listing_id,
                bundle.listing.seller_id,
                consignment_id,
            )
            + tuple(signal.farm_id for signal in bundle.climate_signals),
        )
        return row

    def _anonymize(self, *parts: str) -> str:
        raw = "::".join(part.strip() for part in parts)
        digest = sha256(f"{self._salt}::{raw}".encode("utf-8")).hexdigest()
        return digest[:16]

    def _assert_no_raw_identifier_leak(
        self,
        *,
        row: EnterpriseAnalyticsMartRow,
        raw_identifiers: tuple[str, ...],
    ) -> None:
        serialized = json.dumps(row.as_payload(), sort_keys=True)
        for identifier in raw_identifiers:
            if identifier and identifier in serialized:
                raise EnterpriseAnalyticsDataMartError("raw identifier leaked into analytics mart row")


def _quantity_band(quantity_kg: int) -> str:
    if quantity_kg < 500:
        return "small"
    if quantity_kg < 2_000:
        return "medium"
    return "large"


def _price_band(price_minor: int) -> str:
    if price_minor < 250_000:
        return "entry"
    if price_minor < 1_000_000:
        return "growth"
    return "premium"
