from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.core.config import Settings
from app.modules.agro_intelligence.schema import BOUNDARY_ALIGNMENT


class AgroIntelligenceConnectorError(RuntimeError):
    def __init__(self, code: str, detail: str) -> None:
        super().__init__(detail)
        self.code = code
        self.detail = detail


@dataclass(frozen=True, slots=True)
class SourceInventoryItem:
    source_key: str
    title: str
    category: str
    countries: list[str]
    access_model: str
    budget_band_usd: tuple[int, int]
    fits_budget_ceiling: bool
    implementation_status: str
    priority_rank: int
    rationale: str
    source_tier: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "source_key": self.source_key,
            "title": self.title,
            "category": self.category,
            "countries": self.countries,
            "access_model": self.access_model,
            "budget_band_usd": {"low": self.budget_band_usd[0], "high": self.budget_band_usd[1]},
            "fits_budget_ceiling": self.fits_budget_ceiling,
            "implementation_status": self.implementation_status,
            "priority_rank": self.priority_rank,
            "rationale": self.rationale,
            "source_tier": self.source_tier,
        }


@dataclass(frozen=True, slots=True)
class ExternalEntityCandidate:
    external_id: str
    canonical_name: str
    entity_type: str
    country_code: str
    source_key: str
    source_id: str
    source_tier: str
    trust_tier: str
    confidence_score: int
    collected_at: str
    legal_basis: str
    collection_method: str
    source_document_title: str
    source_document_kind: str
    attributes: dict[str, object]


class AgroIntelligenceConnectorProvider(Protocol):
    def source_inventory(self, *, budget_ceiling_usd: int) -> list[SourceInventoryItem]: ...

    def search_opencorporates(
        self,
        *,
        query: str,
        country_code: str,
        limit: int,
    ) -> list[ExternalEntityCandidate]: ...

    def search_overpass(
        self,
        *,
        country_code: str,
        south: float,
        west: float,
        north: float,
        east: float,
        filters: list[tuple[str, str]],
        limit: int,
    ) -> list[ExternalEntityCandidate]: ...


class _UrlJsonFetcher:
    def __init__(self, *, timeout_seconds: int) -> None:
        self.timeout_seconds = timeout_seconds

    def get(self, url: str, headers: dict[str, str] | None = None) -> dict[str, Any]:
        request = Request(url=url, headers=headers or {}, method="GET")
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise AgroIntelligenceConnectorError("provider_http_error", detail or str(exc)) from exc
        except URLError as exc:
            raise AgroIntelligenceConnectorError("provider_network_error", str(exc.reason)) from exc

    def post_form(self, url: str, payload: str, headers: dict[str, str] | None = None) -> dict[str, Any]:
        request_headers = {"Content-Type": "application/x-www-form-urlencoded"}
        if headers:
            request_headers.update(headers)
        request = Request(
            url=url,
            headers=request_headers,
            data=payload.encode("utf-8"),
            method="POST",
        )
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise AgroIntelligenceConnectorError("provider_http_error", detail or str(exc)) from exc
        except URLError as exc:
            raise AgroIntelligenceConnectorError("provider_network_error", str(exc.reason)) from exc


def _utcnow_iso() -> str:
    return datetime.now(tz=UTC).isoformat().replace("+00:00", "Z")


def _country_jurisdiction_code(country_code: str) -> str | None:
    normalized = country_code.upper()
    if normalized == "NG":
        return "ng"
    if normalized == "GH":
        return "gh"
    return None


class BudgetAwareAgroIntelligenceConnectorProvider:
    def __init__(
        self,
        *,
        opencorporates_base_url: str,
        opencorporates_api_token: str | None,
        overpass_base_url: str,
        timeout_seconds: int,
        fetcher: _UrlJsonFetcher | None = None,
    ) -> None:
        self.opencorporates_base_url = opencorporates_base_url.rstrip("/")
        self.opencorporates_api_token = opencorporates_api_token
        self.overpass_base_url = overpass_base_url.rstrip("/")
        self.fetcher = fetcher or _UrlJsonFetcher(timeout_seconds=timeout_seconds)

    def source_inventory(self, *, budget_ceiling_usd: int) -> list[SourceInventoryItem]:
        def _item(
            *,
            source_key: str,
            title: str,
            category: str,
            countries: list[str],
            access_model: str,
            budget_band_usd: tuple[int, int],
            implementation_status: str,
            priority_rank: int,
            rationale: str,
            source_tier: str,
        ) -> SourceInventoryItem:
            return SourceInventoryItem(
                source_key=source_key,
                title=title,
                category=category,
                countries=countries,
                access_model=access_model,
                budget_band_usd=budget_band_usd,
                fits_budget_ceiling=budget_band_usd[1] <= budget_ceiling_usd,
                implementation_status=implementation_status,
                priority_rank=priority_rank,
                rationale=rationale,
                source_tier=source_tier,
            )

        return [
            _item(
                source_key="partner_directory_import",
                title="Buyer and processor partner directory import",
                category="partner_feed",
                countries=["NG", "GH"],
                access_model="owned_partner_upload",
                budget_band_usd=(0, 5000),
                implementation_status="implemented",
                priority_rank=1,
                rationale="Cheapest route to buyer/processor-first coverage with direct provenance and contract-scoped data use.",
                source_tier="A",
            ),
            _item(
                source_key="opencorporates_search",
                title="OpenCorporates company search",
                category="company_registry_aggregator",
                countries=["NG", "GH"],
                access_model="free_low_limit_or_lean_paid",
                budget_band_usd=(0, 12000),
                implementation_status="implemented",
                priority_rank=2,
                rationale="Budget-fit firmography path for buyers, processors, traders, and transport firms before higher-cost registry extraction.",
                source_tier="A",
            ),
            _item(
                source_key="overpass_facility_search",
                title="OpenStreetMap Overpass facility search",
                category="geospatial_public",
                countries=["NG", "GH"],
                access_model="open_public",
                budget_band_usd=(0, 3000),
                implementation_status="implemented",
                priority_rank=3,
                rationale="Low-cost warehouse, market, and facility discovery path for map-linked buyer sourcing context.",
                source_tier="B",
            ),
            _item(
                source_key="registry_extraction_support",
                title="CAC and ORC extraction support",
                category="official_registry",
                countries=["NG", "GH"],
                access_model="operational_and_legal_support",
                budget_band_usd=(8000, 18000),
                implementation_status="planned",
                priority_rank=4,
                rationale="Authoritative registry normalization remains inside the $60k ceiling if kept to lean extraction support.",
                source_tier="A",
            ),
            _item(
                source_key="faostat_context",
                title="FAOSTAT context import",
                category="multilateral_public",
                countries=["NG", "GH"],
                access_model="open_public",
                budget_band_usd=(0, 2000),
                implementation_status="planned",
                priority_rank=5,
                rationale="Useful for coverage priors and commodity context, but lower priority than firmography and facilities for buyer sourcing.",
                source_tier="B",
            ),
            _item(
                source_key="gs1_verified",
                title="GS1 Verified by GS1 pilot",
                category="product_company_verification",
                countries=["NG", "GH"],
                access_model="paid_pilot",
                budget_band_usd=(5000, 20000),
                implementation_status="deferred",
                priority_rank=6,
                rationale="Useful but deferred until buyer directory conversion justifies extra packaged-goods verification spend.",
                source_tier="B",
            ),
        ]

    def search_opencorporates(
        self,
        *,
        query: str,
        country_code: str,
        limit: int,
    ) -> list[ExternalEntityCandidate]:
        jurisdiction_code = _country_jurisdiction_code(country_code)
        params: dict[str, str | int] = {"q": query, "per_page": limit}
        if jurisdiction_code:
            params["jurisdiction_code"] = jurisdiction_code
        if self.opencorporates_api_token:
            params["api_token"] = self.opencorporates_api_token
        payload = self.fetcher.get(
            f"{self.opencorporates_base_url}/v0.4/companies/search?{urlencode(params)}"
        )
        results = payload.get("results")
        companies = results.get("companies") if isinstance(results, dict) else None
        if not isinstance(companies, list):
            raise AgroIntelligenceConnectorError(
                "provider_invalid_payload",
                "OpenCorporates response did not include results.companies.",
            )
        collected_at = _utcnow_iso()
        candidates: list[ExternalEntityCandidate] = []
        for item in companies[:limit]:
            company = item.get("company") if isinstance(item, dict) else None
            if not isinstance(company, dict):
                continue
            company_number = str(company.get("company_number") or company.get("native_company_number") or "").strip()
            oc_country = str(company.get("jurisdiction_code") or jurisdiction_code or country_code).upper()
            source_id = f"opencorporates:{company.get('jurisdiction_code') or jurisdiction_code or country_code}:{company_number or company.get('name')}"
            candidates.append(
                ExternalEntityCandidate(
                    external_id=company_number or str(company.get("name") or source_id),
                    canonical_name=str(company.get("name") or "Unnamed company"),
                    entity_type="organization",
                    country_code=country_code.upper(),
                    source_key="opencorporates_search",
                    source_id=source_id,
                    source_tier="A",
                    trust_tier="silver",
                    confidence_score=78,
                    collected_at=collected_at,
                    legal_basis="public_company_registry_aggregator",
                    collection_method="api_search",
                    source_document_title=f"OpenCorporates company result {company.get('name') or company_number}",
                    source_document_kind="registry_record",
                    attributes={
                        "company_number": company_number,
                        "current_status": company.get("current_status"),
                        "jurisdiction_code": company.get("jurisdiction_code"),
                        "incorporation_date": company.get("incorporation_date"),
                        "registered_address_in_full": company.get("registered_address_in_full"),
                        "source_country_hint": oc_country,
                    },
                )
            )
        return candidates

    def search_overpass(
        self,
        *,
        country_code: str,
        south: float,
        west: float,
        north: float,
        east: float,
        filters: list[tuple[str, str]],
        limit: int,
    ) -> list[ExternalEntityCandidate]:
        if not filters:
            raise AgroIntelligenceConnectorError("invalid_request", "At least one Overpass filter is required.")
        filter_block = "".join(
            f'nwr["{key}"="{value}"]({south},{west},{north},{east});' for key, value in filters
        )
        query = f"[out:json][timeout:25];({filter_block});out center {limit};"
        payload = self.fetcher.post_form(
            f"{self.overpass_base_url}/api/interpreter",
            urlencode({"data": query}),
        )
        elements = payload.get("elements")
        if not isinstance(elements, list):
            raise AgroIntelligenceConnectorError(
                "provider_invalid_payload",
                "Overpass response did not include elements.",
            )
        collected_at = _utcnow_iso()
        candidates: list[ExternalEntityCandidate] = []
        for item in elements[:limit]:
            if not isinstance(item, dict):
                continue
            tags = item.get("tags")
            if not isinstance(tags, dict):
                tags = {}
            element_id = str(item.get("id") or "")
            lat = item.get("lat")
            lon = item.get("lon")
            center = item.get("center")
            if isinstance(center, dict):
                lat = center.get("lat", lat)
                lon = center.get("lon", lon)
            name = str(tags.get("name") or f"OSM facility {element_id}")
            candidates.append(
                ExternalEntityCandidate(
                    external_id=element_id,
                    canonical_name=name,
                    entity_type="facility" if tags.get("building") != "marketplace" else "market_location",
                    country_code=country_code.upper(),
                    source_key="overpass_facility_search",
                    source_id=f"osm:{element_id}",
                    source_tier="B",
                    trust_tier="bronze",
                    confidence_score=62,
                    collected_at=collected_at,
                    legal_basis="open_database_license",
                    collection_method="overpass_query",
                    source_document_title=f"Overpass place result {name}",
                    source_document_kind="geospatial_layer",
                    attributes={
                        "osm_type": item.get("type"),
                        "latitude": lat,
                        "longitude": lon,
                        "tags": tags,
                    },
                )
            )
        return candidates


def build_agro_intelligence_connector_provider(
    settings: Settings,
) -> AgroIntelligenceConnectorProvider:
    return BudgetAwareAgroIntelligenceConnectorProvider(
        opencorporates_base_url=settings.agro_intelligence_opencorporates_base_url,
        opencorporates_api_token=settings.agro_intelligence_opencorporates_api_token,
        overpass_base_url=settings.agro_intelligence_overpass_base_url,
        timeout_seconds=settings.agro_intelligence_request_timeout_seconds,
    )


def build_source_inventory_payload(*, budget_ceiling_usd: int) -> dict[str, object]:
    alignment = [
        {
            "subject_type": item["subject_type"],
            "allowed_entity_types": item["allowed_entity_types"],
            "requires_consent_artifact": item["requires_consent_artifact"],
        }
        for item in BOUNDARY_ALIGNMENT
    ]
    provider = BudgetAwareAgroIntelligenceConnectorProvider(
        opencorporates_base_url="https://api.opencorporates.com",
        opencorporates_api_token=None,
        overpass_base_url="https://overpass-api.de",
        timeout_seconds=12,
    )
    return {
        "budget_ceiling_usd": budget_ceiling_usd,
        "budget_posture": "lean_startup_cap",
        "priority_rule": "buyer_and_processor_acquisition_first",
        "boundary_alignment": alignment,
        "items": [item.as_dict() for item in provider.source_inventory(budget_ceiling_usd=budget_ceiling_usd)],
    }
