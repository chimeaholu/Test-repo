from sqlalchemy import select

from app.core.identity_security import build_password_hash
from app.db.models.agro_intelligence import (
    AgroIntelligenceConsentArtifact,
    AgroIntelligenceEntity,
    AgroIntelligenceSourceDocument,
)
from app.db.models.integrations import PartnerInboundRecord
from app.db.models.platform import IdentityAccount
from app.db.repositories.identity import IdentityRepository
from app.modules.agro_intelligence.connectors import (
    ExternalEntityCandidate,
    SourceInventoryItem,
)


def _create_admin_account(session) -> tuple[str, str]:
    repository = IdentityRepository(session)
    account = repository.create_account(
        display_name="Admin Operator",
        email="admin-agri@example.com",
        phone_number="+233200000333",
        country_code="GH",
    )
    repository.ensure_membership(actor_id=account.actor_id, role="admin", country_code="GH")
    repository.set_password_credential(
        actor_id=account.actor_id,
        password_hash=build_password_hash("AdminPassword123!", iterations=600_000),
    )
    session.commit()
    return account.actor_id, account.email


def _login_admin(client, email: str) -> str:
    response = client.post(
        "/api/v1/identity/login/password",
        json={
            "identifier": email,
            "password": "AdminPassword123!",
            "role": "admin",
            "country_code": "GH",
        },
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


class _FakeAgroIntelligenceProvider:
    def source_inventory(self, *, budget_ceiling_usd: int) -> list[SourceInventoryItem]:
        return [
            SourceInventoryItem(
                source_key="partner_directory_import",
                title="Partner import",
                category="partner_feed",
                countries=["NG", "GH"],
                access_model="owned_partner_upload",
                budget_band_usd=(0, 5000),
                fits_budget_ceiling=True,
                implementation_status="implemented",
                priority_rank=1,
                rationale="Low-cost partner path.",
                source_tier="A",
            )
        ]

    def search_opencorporates(
        self,
        *,
        query: str,
        country_code: str,
        limit: int,
    ) -> list[ExternalEntityCandidate]:
        assert query == "Agri"
        assert country_code == "GH"
        return [
            ExternalEntityCandidate(
                external_id="oc-001",
                canonical_name="Agri Buyer Ltd",
                entity_type="organization",
                country_code="GH",
                source_key="opencorporates_search",
                source_id="opencorporates:gh:oc-001",
                source_tier="A",
                trust_tier="silver",
                confidence_score=78,
                collected_at="2026-04-29T00:00:00Z",
                legal_basis="public_company_registry_aggregator",
                collection_method="api_search",
                source_document_title="OpenCorporates company result Agri Buyer Ltd",
                source_document_kind="registry_record",
                attributes={"company_number": "oc-001"},
            )
        ]

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
        assert country_code == "GH"
        assert filters == [("building", "warehouse")]
        return [
            ExternalEntityCandidate(
                external_id="osm-001",
                canonical_name="Tamale Warehouse",
                entity_type="facility",
                country_code="GH",
                source_key="overpass_facility_search",
                source_id="osm:osm-001",
                source_tier="B",
                trust_tier="bronze",
                confidence_score=62,
                collected_at="2026-04-29T00:00:00Z",
                legal_basis="open_database_license",
                collection_method="overpass_query",
                source_document_title="Overpass place result Tamale Warehouse",
                source_document_kind="geospatial_layer",
                attributes={"latitude": 9.4, "longitude": -0.8},
            )
        ]


def test_agro_intelligence_source_inventory_reflects_60k_ceiling(client, session) -> None:
    _, email = _create_admin_account(session)
    token = _login_admin(client, email)

    response = client.get("/api/v1/agro-intelligence/sources/inventory", headers=_auth_headers(token))

    assert response.status_code == 200
    assert response.json()["budget_ceiling_usd"] == 60000
    assert response.json()["priority_rule"] == "buyer_and_processor_acquisition_first"
    assert any(item["source_key"] == "partner_directory_import" for item in response.json()["items"])


def test_agro_intelligence_partner_directory_import_materializes_entities_and_consent(
    client, session
) -> None:
    _, email = _create_admin_account(session)
    token = _login_admin(client, email)

    response = client.post(
        "/api/v1/agro-intelligence/ingestion/imports/partner-directory",
        headers=_auth_headers(token),
        json={
            "partner_slug": "buyer-hub",
            "records": [
                {
                    "partner_record_id": "buyer-001",
                    "entity_type": "organization",
                    "subject_ref": "buyer-hub:buyer-001",
                    "canonical_name": "Northern Maize Buyers",
                    "country_code": "GH",
                    "scope_ids": ["marketplace.discovery"],
                    "contains_personal_data": False,
                    "roles": ["buyer", "processor"],
                    "commodity_focus": ["maize"],
                    "attributes": {"region": "Northern"},
                },
                {
                    "partner_record_id": "person-001",
                    "entity_type": "person_actor",
                    "subject_ref": "buyer-hub:person-001",
                    "canonical_name": "Ama Mensah",
                    "country_code": "GH",
                    "scope_ids": ["identity.core"],
                    "contains_personal_data": True,
                    "consent_artifact": {
                        "policy_version": "2026.04.w1",
                        "country_code": "GH",
                        "status": "granted",
                        "scope_ids": ["identity.core"],
                        "subject_ref": "buyer-hub:person-001",
                        "captured_at": "2026-04-29T00:00:00Z",
                    },
                    "roles": ["contact"],
                    "commodity_focus": ["maize"],
                    "attributes": {"region": "Northern"},
                },
                {
                    "partner_record_id": "person-002",
                    "entity_type": "person_actor",
                    "subject_ref": "buyer-hub:person-002",
                    "canonical_name": "Kofi Doe",
                    "country_code": "GH",
                    "scope_ids": ["identity.core"],
                    "contains_personal_data": True,
                    "roles": ["contact"],
                    "commodity_focus": ["maize"],
                    "attributes": {"region": "Northern"},
                },
            ],
        },
    )

    assert response.status_code == 200
    assert response.json()["imported_count"] == 3
    assert response.json()["materialized_count"] == 2
    assert response.json()["rejected_count"] == 1

    inbound_records = session.execute(
        select(PartnerInboundRecord).order_by(PartnerInboundRecord.partner_record_id.asc())
    ).scalars().all()
    assert len(inbound_records) == 3
    assert [record.status for record in inbound_records] == ["accepted", "accepted", "rejected"]

    entities = session.execute(
        select(AgroIntelligenceEntity).order_by(AgroIntelligenceEntity.canonical_name.asc())
    ).scalars().all()
    assert [entity.canonical_name for entity in entities] == ["Ama Mensah", "Northern Maize Buyers"]
    assert all(entity.latest_partner_slug == "buyer-hub" for entity in entities)

    consent_artifact = session.execute(select(AgroIntelligenceConsentArtifact)).scalar_one()
    assert consent_artifact.subject_ref == "buyer-hub:person-001"


def test_agro_intelligence_public_connector_routes_materialize_fake_results(client, session) -> None:
    _, email = _create_admin_account(session)
    token = _login_admin(client, email)
    client.app.state.agro_intelligence_provider = _FakeAgroIntelligenceProvider()

    oc_response = client.post(
        "/api/v1/agro-intelligence/connectors/opencorporates/search",
        headers=_auth_headers(token),
        json={"query": "Agri", "country_code": "GH", "limit": 5, "materialize": True},
    )
    overpass_response = client.post(
        "/api/v1/agro-intelligence/connectors/overpass/places",
        headers=_auth_headers(token),
        json={
            "country_code": "GH",
            "south": 9.3,
            "west": -0.9,
            "north": 9.5,
            "east": -0.7,
            "filters": [{"key": "building", "value": "warehouse"}],
            "limit": 5,
            "materialize": True,
        },
    )

    assert oc_response.status_code == 200
    assert oc_response.json()["item_count"] == 1
    assert oc_response.json()["items"][0]["canonical_name"] == "Agri Buyer Ltd"

    assert overpass_response.status_code == 200
    assert overpass_response.json()["item_count"] == 1
    assert overpass_response.json()["items"][0]["canonical_name"] == "Tamale Warehouse"

    entities = session.execute(
        select(AgroIntelligenceEntity).where(
            AgroIntelligenceEntity.canonical_name.in_(["Agri Buyer Ltd", "Tamale Warehouse"])
        )
    ).scalars().all()
    assert len(entities) == 2

    source_documents = session.execute(select(AgroIntelligenceSourceDocument)).scalars().all()
    assert len(source_documents) >= 2


def test_agro_intelligence_routes_require_admin_scope(client, session) -> None:
    response = client.post(
        "/api/v1/identity/register/password",
        json={
            "display_name": "Farmer User",
            "email": "farmer-agri@example.com",
            "phone_number": "+233200000444",
            "password": "FarmerPassword123!",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    actor = session.execute(
        select(IdentityAccount).where(IdentityAccount.email == "farmer-agri@example.com")
    ).scalar_one()

    forbidden_response = client.get(
        "/api/v1/agro-intelligence/sources/inventory",
        headers=_auth_headers(token),
    )

    assert actor.actor_id
    assert forbidden_response.status_code == 403
    assert forbidden_response.json()["detail"] == "missing_operator_scope"
