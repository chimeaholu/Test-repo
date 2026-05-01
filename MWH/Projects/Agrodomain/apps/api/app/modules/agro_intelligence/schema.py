from __future__ import annotations

from typing import Any, Final

SCHEMA_VERSION: Final[str] = "2026-04-29.eh5a"

ENTITY_TYPES: Final[tuple[str, ...]] = (
    "person_actor",
    "organization",
    "farm_unit",
    "field_plot",
    "facility",
    "vehicle_or_fleet_actor",
    "commodity_profile",
    "route_or_corridor",
    "market_location",
    "financial_actor",
    "insurance_actor",
)

TRUST_TIERS: Final[tuple[str, ...]] = ("bronze", "silver", "gold")
SOURCE_TIERS: Final[tuple[str, ...]] = ("A", "B", "C")
LIFECYCLE_STATES: Final[tuple[str, ...]] = (
    "ingested",
    "normalized",
    "matched_or_unmatched",
    "scored",
    "pending_verification",
    "verified",
    "rejected",
    "stale",
)

RELATIONSHIP_TYPES: Final[tuple[str, ...]] = (
    "belongs_to",
    "operates",
    "manages",
    "contains",
    "trades",
    "serves",
    "stores_or_processes",
    "asserts",
    "confirms_or_rejects",
)

BOUNDARY_ALIGNMENT: Final[tuple[dict[str, object], ...]] = (
    {
        "subject_type": "organization_profile",
        "allowed_entity_types": [
            "organization",
            "facility",
            "financial_actor",
            "insurance_actor",
        ],
        "allowed_source_tiers": ["A", "B"],
        "requires_consent_artifact": False,
    },
    {
        "subject_type": "person_profile",
        "allowed_entity_types": ["person_actor"],
        "allowed_source_tiers": ["A", "B"],
        "requires_consent_artifact": True,
    },
    {
        "subject_type": "farm_signal",
        "allowed_entity_types": ["farm_unit", "field_plot"],
        "allowed_source_tiers": ["A", "B", "C"],
        "requires_consent_artifact": False,
    },
    {
        "subject_type": "market_signal",
        "allowed_entity_types": [
            "market_location",
            "commodity_profile",
            "route_or_corridor",
        ],
        "allowed_source_tiers": ["A", "B", "C"],
        "requires_consent_artifact": False,
    },
)


def build_schema_readiness_packet() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": "2026-04-29T00:00:00Z",
        "trust_taxonomy": {
            "source_tiers": list(SOURCE_TIERS),
            "trust_tiers": list(TRUST_TIERS),
            "lifecycle_states": list(LIFECYCLE_STATES),
        },
        "boundary_alignment": [
            {
                **item,
                "materialization_path": "partner_inbound_records -> agro_intelligence_entities",
                "provenance_contract": "platform_boundary.inbound_ingestion_request.provenance",
            }
            for item in BOUNDARY_ALIGNMENT
        ],
        "budget_gate": {
            "approval_required": True,
            "approval_received": True,
            "blocking_beads": ["licensed_source_selection"],
            "leading_budget_category": "premium_data_licensing_and_commercial_directory_access",
            "recommended_year_one_budget_band_usd": {"low": 60000, "high": 60000},
        },
        "connector_lane": {
            "eb035_alignment_review_complete": True,
            "licensed_connector_work_permitted": True,
            "gated_until": ["licensed_source_selection"],
        },
    }
