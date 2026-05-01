from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.db.repositories.identity import IdentityRepository
from app.db.repositories.platform_boundary import PlatformBoundaryRepository
from tests.conftest import build_settings


def _create_session(session, *, actor_id: str, role: str, country_code: str = "GH") -> str:
    identity_repository = IdentityRepository(session)
    email = f"{actor_id}@example.com"
    account = identity_repository.get_account_by_email(email)
    if account is None:
        account = identity_repository.create_account(
            display_name=actor_id,
            email=email,
            phone_number=None,
            country_code=country_code,
        )
    identity_repository.ensure_membership(
        actor_id=account.actor_id,
        role=role,
        country_code=country_code,
    )
    settings = build_settings(str(session.get_bind().url))
    raw_token, session_record = identity_repository.issue_session(
        settings=settings,
        actor_id=account.actor_id,
        role=role,
        country_code=country_code,
        issued_via="test_runtime",
    )
    identity_repository.grant_consent(
        actor_id=account.actor_id,
        country_code=country_code,
        policy_version="2026.04",
        scope_ids=["identity.core", "workflow.audit", "agro_intelligence.review"],
        captured_at=datetime.now(tz=UTC),
        session_id=session_record.session_id,
    )
    session.commit()
    return raw_token


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _seed_inbound_record(
    session,
    *,
    ingest_suffix: str,
    partner_slug: str,
    name: str,
    country_code: str = "GH",
    city: str,
    commodity_tags: list[str],
    collected_at: datetime,
    source_tier: str,
    facility_name: str | None = None,
) -> None:
    repository = PlatformBoundaryRepository(session)
    repository.create_inbound_record(
        ingest_id=f"ingest-{ingest_suffix}",
        partner_slug=partner_slug,
        partner_record_id=f"partner-record-{ingest_suffix}",
        adapter_key="agro.partner.directory_v1",
        data_product="agro_intelligence.partner_buyer_directory",
        subject_type="organization_profile",
        subject_ref=f"subject-{ingest_suffix}",
        country_code=country_code,
        scope_ids=["agro_intelligence.read", "agro_intelligence.match"],
        contains_personal_data=False,
        payload={
            "canonical_name": name,
            "entity_type": "organization",
            "operator_kind": "buyer",
            "city": city,
            "commodity_tags": commodity_tags,
            "facility_name": facility_name,
        },
        provenance={
            "source_id": f"source-{ingest_suffix}",
            "source_tier": source_tier,
            "collected_at": collected_at.isoformat().replace("+00:00", "Z"),
            "collection_method": "partner_directory_import",
            "legal_basis": "contractual_partner_feed",
            "checksum": f"checksum-{ingest_suffix}",
        },
        consent_artifact=None,
        status="accepted",
        reason_code=None,
        audit_event_id=None,
    )
    session.commit()


def test_agro_intelligence_resolution_builds_directory_queue_and_graph_views(client, session) -> None:
    admin_token = _create_session(session, actor_id="actor-coop-gh-agi", role="cooperative")
    buyer_token = _create_session(session, actor_id="actor-buyer-gh-agi", role="buyer")

    _seed_inbound_record(
        session,
        ingest_suffix="green-a",
        partner_slug="northstar",
        name="Green Harvest Foods Ltd",
        city="Kumasi",
        commodity_tags=["maize", "sorghum"],
        collected_at=datetime.now(tz=UTC) - timedelta(days=2),
        source_tier="A",
        facility_name="Ejisu Intake Hub",
    )
    _seed_inbound_record(
        session,
        ingest_suffix="green-b",
        partner_slug="fieldbridge",
        name="Green Harvest Foods Limited",
        city="Kumasi",
        commodity_tags=["maize"],
        collected_at=datetime.now(tz=UTC) - timedelta(days=3),
        source_tier="B",
        facility_name="Ejisu Intake Hub",
    )
    _seed_inbound_record(
        session,
        ingest_suffix="north-c",
        partner_slug="fieldbridge",
        name="Northern Aggregators Co",
        city="Tamale",
        commodity_tags=["soy"],
        collected_at=datetime.now(tz=UTC) - timedelta(days=60),
        source_tier="C",
    )

    resolution_response = client.post(
        "/api/v1/agro-intelligence/workspace/resolution-run",
        headers=_auth_headers(admin_token),
    )
    assert resolution_response.status_code == 200
    resolution_body = resolution_response.json()
    assert resolution_body["scanned_records"] == 3
    assert resolution_body["entities_merged"] >= 1
    assert resolution_body["relationships_created"] >= 1

    overview_response = client.get(
        "/api/v1/agro-intelligence/overview",
        headers=_auth_headers(admin_token),
    )
    assert overview_response.status_code == 200
    overview_body = overview_response.json()
    assert overview_body["entity_count"] >= 3
    assert overview_body["buyer_directory_count"] >= 2
    assert overview_body["verification_queue_count"] >= 1

    buyers_response = client.get(
        "/api/v1/agro-intelligence/buyers",
        headers=_auth_headers(buyer_token),
    )
    assert buyers_response.status_code == 200
    buyers_body = buyers_response.json()
    buyer_names = [item["canonical_name"] for item in buyers_body["items"]]
    assert any("Green Harvest Foods" in name for name in buyer_names)
    assert any("Northern Aggregators" in name for name in buyer_names)

    merged_buyer = next(
        item for item in buyers_body["items"] if "Green Harvest Foods" in item["canonical_name"]
    )
    detail_response = client.get(
        f"/api/v1/agro-intelligence/entities/{merged_buyer['entity_id']}",
        headers=_auth_headers(buyer_token),
    )
    assert detail_response.status_code == 200
    detail_body = detail_response.json()
    assert len(detail_body["source_documents"]) == 2
    assert any(
        relationship["other_entity_name"] == "Ejisu Intake Hub"
        for relationship in detail_body["relationships"]
    )
    assert "buyer" in detail_body["operator_tags"]

    queue_response = client.get(
        "/api/v1/agro-intelligence/workspace/queue",
        headers=_auth_headers(admin_token),
    )
    assert queue_response.status_code == 200
    queue_body = queue_response.json()
    northern_item = next(
        item for item in queue_body["items"] if "Northern Aggregators" in item["canonical_name"]
    )
    assert any(reason.startswith("freshness_") or reason == "low_confidence_score" for reason in northern_item["reasons"])

    decision_response = client.post(
        f"/api/v1/agro-intelligence/workspace/queue/{northern_item['entity_id']}/decision",
        json={"action": "reject"},
        headers=_auth_headers(admin_token),
    )
    assert decision_response.status_code == 200
    assert decision_response.json()["entity"]["lifecycle_state"] == "rejected"
    assert any(
        claim["verifier_type"] == "human_operator"
        for claim in decision_response.json()["entity"]["verification_claims"]
    )


def test_agro_intelligence_workspace_queue_requires_operator_scope(client, session) -> None:
    buyer_token = _create_session(session, actor_id="actor-buyer-gh-nonop", role="buyer")

    response = client.get(
        "/api/v1/agro-intelligence/workspace/queue",
        headers=_auth_headers(buyer_token),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "operator_scope_required"
