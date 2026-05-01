from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.db.repositories.identity import IdentityRepository
from app.db.repositories.marketplace import MarketplaceRepository
from app.db.repositories.platform_boundary import PlatformBoundaryRepository
from tests.conftest import build_settings


def _create_session(
    session,
    *,
    actor_id: str,
    role: str,
    country_code: str = "GH",
) -> tuple[str, str]:
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
    return raw_token, account.actor_id


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _seed_inbound_record(
    session,
    *,
    ingest_suffix: str,
    partner_slug: str,
    name: str,
    city: str,
    commodity_tags: list[str],
    source_tier: str,
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
        country_code="GH",
        scope_ids=["agro_intelligence.read", "agro_intelligence.match"],
        contains_personal_data=False,
        payload={
            "canonical_name": name,
            "entity_type": "organization",
            "operator_kind": "buyer",
            "city": city,
            "commodity_tags": commodity_tags,
        },
        provenance={
            "source_id": f"source-{ingest_suffix}",
            "source_tier": source_tier,
            "collected_at": (datetime.now(tz=UTC) - timedelta(days=2)).isoformat().replace("+00:00", "Z"),
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


def test_marketplace_connector_reads_agro_intelligence_for_listing_and_thread(client, session) -> None:
    operator_token, _operator_actor_id = _create_session(
        session,
        actor_id="actor-coop-gh-market-connector",
        role="cooperative",
    )
    seller_token, seller_actor_id = _create_session(
        session,
        actor_id="actor-farmer-gh-market-connector",
        role="farmer",
    )
    buyer_token, buyer_actor_id = _create_session(
        session,
        actor_id="actor-buyer-gh-market-connector",
        role="buyer",
    )

    _seed_inbound_record(
        session,
        ingest_suffix="seller-org",
        partner_slug="trusted-lane",
        name="Ghana Growers Network",
        city="Tamale",
        commodity_tags=["cassava"],
        source_tier="A",
    )
    _seed_inbound_record(
        session,
        ingest_suffix="buyer-direct",
        partner_slug="buyer-hub",
        name="Tamale Cassava Buyers Ltd",
        city="Tamale",
        commodity_tags=["cassava"],
        source_tier="A",
    )
    _seed_inbound_record(
        session,
        ingest_suffix="buyer-fallback",
        partner_slug="buyer-hub",
        name="Northern Produce Aggregators",
        city="Tamale",
        commodity_tags=["cassava", "maize"],
        source_tier="B",
    )

    resolution_response = client.post(
        "/api/v1/agro-intelligence/workspace/resolution-run",
        headers=_auth_headers(operator_token),
    )
    assert resolution_response.status_code == 200

    marketplace_repository = MarketplaceRepository(session)
    listing = marketplace_repository.create_listing(
        listing_id="listing-market-connector-1",
        actor_id=seller_actor_id,
        country_code="GH",
        title="Cassava trade lane",
        commodity="Cassava",
        quantity_tons=12.5,
        price_amount=540.0,
        price_currency="GHS",
        location="Tamale, Northern Region",
        summary="Bagged cassava lot with pickup readiness for verified buyer matching.",
    )
    marketplace_repository.publish_listing(listing=listing)
    thread = marketplace_repository.create_negotiation_thread(
        thread_id="thread-market-connector-1",
        listing_id=listing.listing_id,
        seller_actor_id=seller_actor_id,
        buyer_actor_id=buyer_actor_id,
        country_code="GH",
        offer_amount=520.0,
        offer_currency="GHS",
        note="Opening offer for the connector lane proof.",
        actor_id=buyer_actor_id,
    )
    session.commit()

    listing_intelligence = client.get(
        f"/api/v1/marketplace/intelligence/listings/{listing.listing_id}",
        headers=_auth_headers(buyer_token),
    )
    assert listing_intelligence.status_code == 200
    listing_body = listing_intelligence.json()
    assert listing_body["listing_id"] == listing.listing_id
    assert listing_body["seller_entity_match"] is not None
    assert listing_body["seller_entity_match"]["canonical_name"] == "Ghana Growers Network"
    assert listing_body["matched_buyer_count"] >= 1
    assert any(
        match["canonical_name"] == "Tamale Cassava Buyers Ltd"
        for match in listing_body["buyer_matches"]
    )

    thread_intelligence = client.get(
        f"/api/v1/marketplace/intelligence/negotiations/{thread.thread_id}",
        headers=_auth_headers(buyer_token),
    )
    assert thread_intelligence.status_code == 200
    thread_body = thread_intelligence.json()
    assert thread_body["thread_id"] == thread.thread_id
    assert thread_body["counterparty_actor_id"] == seller_actor_id
    assert thread_body["counterparty_entity_match"] is not None
    assert thread_body["counterparty_entity_match"]["canonical_name"] == "Ghana Growers Network"
