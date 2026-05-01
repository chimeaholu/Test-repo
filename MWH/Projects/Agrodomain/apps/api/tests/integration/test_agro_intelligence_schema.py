from datetime import UTC, datetime

import pytest
from sqlalchemy.exc import IntegrityError

from app.db.models.agro_intelligence import (
    AgroIntelligenceConsentArtifact,
    AgroIntelligenceEntity,
)
from app.modules.agro_intelligence.schema import build_schema_readiness_packet


def test_agro_intelligence_person_entities_require_consent_artifacts(session) -> None:
    session.add(
        AgroIntelligenceEntity(
            entity_id="entity-person-missing-consent",
            entity_type="person_actor",
            canonical_name="Ama Mensah",
            country_code="GH",
            trust_tier="silver",
            lifecycle_state="pending_verification",
            source_tier="A",
            confidence_score=74,
            boundary_subject_type="person_profile",
            provenance=[{"source_id": "crm-001"}],
            attribute_payload={"commodity_focus": "maize"},
        )
    )

    with pytest.raises(IntegrityError):
        session.commit()

    session.rollback()

    session.add(
        AgroIntelligenceConsentArtifact(
            consent_artifact_id="consent-entity-001",
            subject_ref="actor-gh-001",
            country_code="GH",
            status="granted",
            policy_version="2026.04.w1",
            scope_ids=["identity.core", "workflow.audit"],
            captured_at=datetime(2026, 4, 28, tzinfo=UTC),
            legal_basis="contractual_partner_feed",
            boundary_ingest_id="ingest-001",
            partner_slug="insights-hub",
        )
    )
    session.add(
        AgroIntelligenceEntity(
            entity_id="entity-person-with-consent",
            entity_type="person_actor",
            canonical_name="Ama Mensah",
            country_code="GH",
            trust_tier="silver",
            lifecycle_state="pending_verification",
            source_tier="A",
            confidence_score=74,
            boundary_subject_type="person_profile",
            latest_boundary_ingest_id="ingest-001",
            latest_partner_slug="insights-hub",
            latest_adapter_key="partner.ingestion.v1",
            consent_artifact_id="consent-entity-001",
            provenance=[{"source_id": "crm-001"}],
            attribute_payload={"commodity_focus": "maize"},
        )
    )
    session.commit()


def test_agro_intelligence_schema_readiness_packet_keeps_licensed_connectors_gated() -> None:
    packet = build_schema_readiness_packet()

    assert packet["budget_gate"]["approval_required"] is True
    assert packet["budget_gate"]["approval_received"] is True
    assert packet["connector_lane"]["eb035_alignment_review_complete"] is True
    assert packet["connector_lane"]["licensed_connector_work_permitted"] is True
    assert packet["budget_gate"]["recommended_year_one_budget_band_usd"] == {
        "low": 60000,
        "high": 60000,
    }
    assert any(
        item["subject_type"] == "person_profile"
        and item["requires_consent_artifact"] is True
        for item in packet["boundary_alignment"]
    )
