from sqlalchemy import delete, func, select

from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.audit import AuditEvent, OutboxMessage
from app.db.models.marketplace import Listing, ListingRevision, NegotiationMessage, NegotiationThread


def test_create_listing_vertical_slice(client, session) -> None:
    sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Ama Mensah",
            "email": "ama@example.com",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    assert sign_in.status_code == 200
    access_token = sign_in.json()["access_token"]
    actor_id = sign_in.json()["session"]["actor"]["actor_id"]

    consent = client.post(
        "/api/v1/identity/consent",
        json={
            "policy_version": "2026.04.w1",
            "scope_ids": ["identity.core", "workflow.audit"],
            "captured_at": "2026-04-18T00:00:00+00:00",
        },
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert consent.status_code == 200
    assert consent.json()["consent"]["state"] == "consent_granted"

    schema_version = get_envelope_schema_version()
    payload = {
        "metadata": {
            "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c11",
            "idempotency_key": "idem-v001-ama-1",
            "actor_id": actor_id,
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": schema_version,
            "correlation_id": "corr-v001-1",
            "occurred_at": "2026-04-18T00:10:00+00:00",
            "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
        },
        "command": {
            "name": "market.listings.create",
            "aggregate_ref": "listing",
            "mutation_scope": "marketplace.listings",
            "payload": {
                "title": "Premium cassava harvest",
                "commodity": "Cassava",
                "quantity_tons": 4.2,
                "price_amount": 320,
                "price_currency": "GHS",
                "location": "Tamale, GH",
                "summary": "Bagged cassava stock ready for pickup with moisture proof attached.",
            },
        },
    }
    headers = {"Authorization": f"Bearer {access_token}"}

    first = client.post("/api/v1/workflow/commands", json=payload, headers=headers)
    second = client.post("/api/v1/workflow/commands", json=payload, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["status"] == "accepted"
    assert second.json()["status"] == "replayed"

    listing_id = first.json()["result"]["listing"]["listing_id"]

    listing_collection = client.get("/api/v1/marketplace/listings", headers=headers)
    assert listing_collection.status_code == 200
    assert len(listing_collection.json()["items"]) == 1
    assert listing_collection.json()["items"][0]["listing_id"] == listing_id

    listing_detail = client.get(f"/api/v1/marketplace/listings/{listing_id}", headers=headers)
    assert listing_detail.status_code == 200
    assert listing_detail.json()["title"] == "Premium cassava harvest"

    audit = client.get(
        "/api/v1/audit/events",
        params={
            "request_id": payload["metadata"]["request_id"],
            "idempotency_key": payload["metadata"]["idempotency_key"],
        },
        headers=headers,
    )
    assert audit.status_code == 200
    assert len(audit.json()["items"]) == 2

    assert session.execute(select(func.count()).select_from(Listing)).scalar_one() == 1
    assert session.execute(select(func.count()).select_from(OutboxMessage)).scalar_one() >= 1
    assert session.execute(select(func.count()).select_from(AuditEvent)).scalar_one() >= 2


def test_edit_listing_vertical_slice(client, session) -> None:
    sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Ama Mensah",
            "email": "ama.edit@example.com",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    assert sign_in.status_code == 200
    access_token = sign_in.json()["access_token"]
    actor_id = sign_in.json()["session"]["actor"]["actor_id"]

    consent = client.post(
        "/api/v1/identity/consent",
        json={
            "policy_version": "2026.04.w1",
            "scope_ids": ["identity.core", "workflow.audit"],
            "captured_at": "2026-04-18T00:00:00+00:00",
        },
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert consent.status_code == 200

    schema_version = get_envelope_schema_version()
    create_payload = {
        "metadata": {
            "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c21",
            "idempotency_key": "idem-v001-ama-edit-create",
            "actor_id": actor_id,
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": schema_version,
            "correlation_id": "corr-v001-edit-create",
            "occurred_at": "2026-04-18T00:10:00+00:00",
            "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
        },
        "command": {
            "name": "market.listings.create",
            "aggregate_ref": "listing",
            "mutation_scope": "marketplace.listings",
            "payload": {
                "title": "Premium cassava harvest",
                "commodity": "Cassava",
                "quantity_tons": 4.2,
                "price_amount": 320,
                "price_currency": "GHS",
                "location": "Tamale, GH",
                "summary": "Bagged cassava stock ready for pickup with moisture proof attached.",
            },
        },
    }
    headers = {"Authorization": f"Bearer {access_token}"}
    create_response = client.post("/api/v1/workflow/commands", json=create_payload, headers=headers)
    assert create_response.status_code == 200
    listing_id = create_response.json()["result"]["listing"]["listing_id"]

    update_payload = {
        "metadata": {
            "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c22",
            "idempotency_key": "idem-v001-ama-edit-update",
            "actor_id": actor_id,
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": schema_version,
            "correlation_id": "corr-v001-edit-update",
            "occurred_at": "2026-04-18T00:15:00+00:00",
            "traceability": {"journey_ids": ["RJ-002"], "data_check_ids": ["DI-001"]},
        },
        "command": {
            "name": "market.listings.update",
            "aggregate_ref": listing_id,
            "mutation_scope": "marketplace.listings",
            "payload": {
                "listing_id": listing_id,
                "title": "Premium cassava harvest revised",
                "commodity": "Cassava",
                "quantity_tons": 5.1,
                "price_amount": 355,
                "price_currency": "GHS",
                "location": "Tamale central depot, GH",
                "summary": "Bagged cassava stock revised with verified storage, pickup window, and moisture proof attached.",
            },
        },
    }

    first = client.post("/api/v1/workflow/commands", json=update_payload, headers=headers)
    second = client.post("/api/v1/workflow/commands", json=update_payload, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["status"] == "accepted"
    assert second.json()["status"] == "replayed"
    assert first.json()["result"]["listing"]["title"] == "Premium cassava harvest revised"
    assert first.json()["result"]["listing"]["status"] == "draft"

    listing_detail = client.get(f"/api/v1/marketplace/listings/{listing_id}", headers=headers)
    assert listing_detail.status_code == 200
    assert listing_detail.json()["title"] == "Premium cassava harvest revised"
    assert listing_detail.json()["quantity_tons"] == 5.1
    assert listing_detail.json()["status"] == "draft"

    listing_collection = client.get("/api/v1/marketplace/listings", headers=headers)
    assert listing_collection.status_code == 200
    assert listing_collection.json()["items"][0]["listing_id"] == listing_id
    assert listing_collection.json()["items"][0]["title"] == "Premium cassava harvest revised"

    audit = client.get(
        "/api/v1/audit/events",
        params={
            "request_id": update_payload["metadata"]["request_id"],
            "idempotency_key": update_payload["metadata"]["idempotency_key"],
        },
        headers=headers,
    )
    assert audit.status_code == 200
    assert len(audit.json()["items"]) == 2

    stored_listing = session.execute(select(Listing).where(Listing.listing_id == listing_id)).scalar_one()
    assert stored_listing.title == "Premium cassava harvest revised"
    assert stored_listing.status == "draft"


def test_listing_edit_authorization_is_audited(client, session) -> None:
    owner_sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Owner Farmer",
            "email": "owner@example.com",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    owner_token = owner_sign_in.json()["access_token"]
    owner_actor_id = owner_sign_in.json()["session"]["actor"]["actor_id"]

    attacker_sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Trader Kojo",
            "email": "kojo.edit@example.com",
            "role": "buyer",
            "country_code": "GH",
        },
    )
    attacker_token = attacker_sign_in.json()["access_token"]
    attacker_actor_id = attacker_sign_in.json()["session"]["actor"]["actor_id"]

    for token in [owner_token, attacker_token]:
        consent = client.post(
            "/api/v1/identity/consent",
            json={
                "policy_version": "2026.04.w1",
                "scope_ids": ["identity.core", "workflow.audit"],
                "captured_at": "2026-04-18T00:00:00+00:00",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert consent.status_code == 200

    create_response = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c23",
                "idempotency_key": "idem-v001-owner-create",
                "actor_id": owner_actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": get_envelope_schema_version(),
                "correlation_id": "corr-v001-owner-create",
                "occurred_at": "2026-04-18T00:20:00+00:00",
                "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
            },
            "command": {
                "name": "market.listings.create",
                "aggregate_ref": "listing",
                "mutation_scope": "marketplace.listings",
                "payload": {
                    "title": "Owner maize lot",
                    "commodity": "Maize",
                    "quantity_tons": 3.0,
                    "price_amount": 280,
                    "price_currency": "GHS",
                    "location": "Kumasi, GH",
                    "summary": "Owner maize lot created with weighbridge and pickup evidence attached.",
                },
            },
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    listing_id = create_response.json()["result"]["listing"]["listing_id"]

    update_response = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c24",
                "idempotency_key": "idem-v001-attacker-update",
                "actor_id": attacker_actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": get_envelope_schema_version(),
                "correlation_id": "corr-v001-attacker-update",
                "occurred_at": "2026-04-18T00:25:00+00:00",
                "traceability": {"journey_ids": ["EP-005"], "data_check_ids": ["DI-001"]},
            },
            "command": {
                "name": "market.listings.update",
                "aggregate_ref": listing_id,
                "mutation_scope": "marketplace.listings",
                "payload": {
                    "listing_id": listing_id,
                    "title": "Hijacked maize lot",
                    "commodity": "Maize",
                    "quantity_tons": 3.2,
                    "price_amount": 290,
                    "price_currency": "GHS",
                    "location": "Kumasi, GH",
                    "summary": "Hijacked update attempt should be denied and audited without mutating state.",
                },
            },
        },
        headers={"Authorization": f"Bearer {attacker_token}"},
    )

    assert update_response.status_code == 403
    assert update_response.json()["detail"]["error_code"] == "policy_denied"

    latest_audit = session.execute(
        select(AuditEvent).order_by(AuditEvent.id.desc()).limit(1)
    ).scalar_one()
    assert latest_audit.reason_code == "listing_edit_forbidden"
    stored_listing = session.execute(select(Listing).where(Listing.listing_id == listing_id)).scalar_one()
    assert stored_listing.title == "Owner maize lot"


def test_publish_and_buyer_safe_projection_parity(client, session) -> None:
    owner_sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Owner Farmer",
            "email": "owner.publish@example.com",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    buyer_sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Buyer Kojo",
            "email": "buyer.publish@example.com",
            "role": "buyer",
            "country_code": "GH",
        },
    )
    transporter_sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Transporter Yaw",
            "email": "transporter.publish@example.com",
            "role": "transporter",
            "country_code": "GH",
        },
    )
    owner_token = owner_sign_in.json()["access_token"]
    owner_actor_id = owner_sign_in.json()["session"]["actor"]["actor_id"]
    buyer_token = buyer_sign_in.json()["access_token"]
    transporter_token = transporter_sign_in.json()["access_token"]
    buyer_actor_id = buyer_sign_in.json()["session"]["actor"]["actor_id"]

    for token in [owner_token, buyer_token, transporter_token]:
        consent = client.post(
            "/api/v1/identity/consent",
            json={
                "policy_version": "2026.04.w1",
                "scope_ids": ["identity.core", "workflow.audit"],
                "captured_at": "2026-04-18T00:00:00+00:00",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert consent.status_code == 200

    schema_version = get_envelope_schema_version()
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
    transporter_headers = {"Authorization": f"Bearer {transporter_token}"}

    create_response = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c31",
                "idempotency_key": "idem-n2-owner-create",
                "actor_id": owner_actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-n2-owner-create",
                "occurred_at": "2026-04-18T01:00:00+00:00",
                "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
            },
            "command": {
                "name": "market.listings.create",
                "aggregate_ref": "listing",
                "mutation_scope": "marketplace.listings",
                "payload": {
                    "title": "Published cassava lot",
                    "commodity": "Cassava",
                    "quantity_tons": 4.8,
                    "price_amount": 340,
                    "price_currency": "GHS",
                    "location": "Tamale, GH",
                    "summary": "Published cassava lot with warehouse slip and moisture proof attached.",
                },
            },
        },
        headers=owner_headers,
    )
    assert create_response.status_code == 200
    listing_id = create_response.json()["result"]["listing"]["listing_id"]

    buyer_empty = client.get("/api/v1/marketplace/listings", headers=buyer_headers)
    assert buyer_empty.status_code == 200
    assert buyer_empty.json()["items"] == []

    publish_response = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c32",
                "idempotency_key": "idem-n2-owner-publish-1",
                "actor_id": owner_actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-n2-owner-publish-1",
                "occurred_at": "2026-04-18T01:05:00+00:00",
                "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
            },
            "command": {
                "name": "market.listings.publish",
                "aggregate_ref": listing_id,
                "mutation_scope": "marketplace.listings",
                "payload": {"listing_id": listing_id},
            },
        },
        headers=owner_headers,
    )
    assert publish_response.status_code == 200
    assert publish_response.json()["result"]["listing"]["published_revision_number"] == 2
    assert publish_response.json()["result"]["listing"]["revision_count"] == 2

    buyer_collection = client.get("/api/v1/marketplace/listings", headers=buyer_headers)
    transporter_collection = client.get("/api/v1/marketplace/listings", headers=transporter_headers)
    assert buyer_collection.status_code == 200
    assert transporter_collection.status_code == 200
    buyer_listing = buyer_collection.json()["items"][0]
    transporter_listing = transporter_collection.json()["items"][0]
    assert buyer_listing["listing_id"] == listing_id
    assert buyer_listing["title"] == "Published cassava lot"
    assert buyer_listing["view_scope"] == "buyer_safe"
    assert buyer_listing["revision_number"] == 2
    assert buyer_listing["has_unpublished_changes"] is False
    assert transporter_listing["listing_id"] == listing_id
    assert transporter_listing["title"] == "Published cassava lot"
    assert transporter_listing["view_scope"] == "buyer_safe"
    assert transporter_listing["revision_number"] == 2
    assert transporter_listing["has_unpublished_changes"] is False

    update_response = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c33",
                "idempotency_key": "idem-n2-owner-update-1",
                "actor_id": owner_actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-n2-owner-update-1",
                "occurred_at": "2026-04-18T01:10:00+00:00",
                "traceability": {"journey_ids": ["RJ-002"], "data_check_ids": ["DI-001"]},
            },
            "command": {
                "name": "market.listings.update",
                "aggregate_ref": listing_id,
                "mutation_scope": "marketplace.listings",
                "payload": {
                    "listing_id": listing_id,
                    "title": "Published cassava lot revised",
                    "commodity": "Cassava",
                    "quantity_tons": 5.3,
                    "price_amount": 360,
                    "price_currency": "GHS",
                    "location": "Tamale consolidation yard, GH",
                    "summary": "Revised cassava lot with updated pickup window and storage proof attached.",
                },
            },
        },
        headers=owner_headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["result"]["listing"]["status"] == "published"
    assert update_response.json()["result"]["listing"]["has_unpublished_changes"] is True
    assert update_response.json()["result"]["listing"]["revision_count"] == 3

    owner_detail = client.get(f"/api/v1/marketplace/listings/{listing_id}", headers=owner_headers)
    buyer_detail = client.get(f"/api/v1/marketplace/listings/{listing_id}", headers=buyer_headers)
    transporter_detail = client.get(f"/api/v1/marketplace/listings/{listing_id}", headers=transporter_headers)
    assert owner_detail.status_code == 200
    assert buyer_detail.status_code == 200
    assert transporter_detail.status_code == 200
    assert owner_detail.json()["title"] == "Published cassava lot revised"
    assert owner_detail.json()["view_scope"] == "owner"
    assert owner_detail.json()["published_revision_number"] == 2
    assert owner_detail.json()["has_unpublished_changes"] is True
    assert buyer_detail.json()["title"] == "Published cassava lot"
    assert buyer_detail.json()["revision_number"] == 2
    assert buyer_detail.json()["view_scope"] == "buyer_safe"
    assert transporter_detail.json()["title"] == "Published cassava lot"
    assert transporter_detail.json()["revision_number"] == 2
    assert transporter_detail.json()["view_scope"] == "buyer_safe"

    revisions = client.get(
        f"/api/v1/marketplace/listings/{listing_id}/revisions",
        headers=owner_headers,
    )
    assert revisions.status_code == 200
    assert [item["change_type"] for item in revisions.json()["items"]] == [
        "draft_updated",
        "published",
        "created",
    ]

    republish_response = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c34",
                "idempotency_key": "idem-n2-owner-publish-2",
                "actor_id": owner_actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-n2-owner-publish-2",
                "occurred_at": "2026-04-18T01:15:00+00:00",
                "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
            },
            "command": {
                "name": "market.listings.publish",
                "aggregate_ref": listing_id,
                "mutation_scope": "marketplace.listings",
                "payload": {"listing_id": listing_id},
            },
        },
        headers=owner_headers,
    )
    assert republish_response.status_code == 200
    assert republish_response.json()["result"]["listing"]["published_revision_number"] == 4
    assert republish_response.json()["result"]["listing"]["revision_count"] == 4

    refreshed_buyer_detail = client.get(
        f"/api/v1/marketplace/listings/{listing_id}",
        headers=buyer_headers,
    )
    refreshed_transporter_detail = client.get(
        f"/api/v1/marketplace/listings/{listing_id}",
        headers=transporter_headers,
    )
    assert refreshed_buyer_detail.status_code == 200
    assert refreshed_transporter_detail.status_code == 200
    assert refreshed_buyer_detail.json()["title"] == "Published cassava lot revised"
    assert refreshed_buyer_detail.json()["revision_number"] == 4
    assert refreshed_transporter_detail.json()["title"] == "Published cassava lot revised"
    assert refreshed_transporter_detail.json()["revision_number"] == 4

    stored_listing = session.execute(select(Listing).where(Listing.listing_id == listing_id)).scalar_one()
    assert stored_listing.published_revision_number == 4
    assert stored_listing.revision_count == 4
    assert buyer_actor_id != owner_actor_id


def test_unpublish_removes_listing_from_buyer_discovery(client, session) -> None:
    owner_sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Owner Unpublish",
            "email": "owner.unpublish@example.com",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    buyer_sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Buyer Unpublish",
            "email": "buyer.unpublish@example.com",
            "role": "buyer",
            "country_code": "GH",
        },
    )
    transporter_sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Transporter Unpublish",
            "email": "transporter.unpublish@example.com",
            "role": "transporter",
            "country_code": "GH",
        },
    )
    owner_token = owner_sign_in.json()["access_token"]
    owner_actor_id = owner_sign_in.json()["session"]["actor"]["actor_id"]
    buyer_token = buyer_sign_in.json()["access_token"]
    transporter_token = transporter_sign_in.json()["access_token"]
    for token in [owner_token, buyer_token, transporter_token]:
        consent = client.post(
            "/api/v1/identity/consent",
            json={
                "policy_version": "2026.04.w1",
                "scope_ids": ["identity.core", "workflow.audit"],
                "captured_at": "2026-04-18T00:00:00+00:00",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert consent.status_code == 200

    schema_version = get_envelope_schema_version()
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
    transporter_headers = {"Authorization": f"Bearer {transporter_token}"}
    create_response = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c35",
                "idempotency_key": "idem-n2-unpublish-create",
                "actor_id": owner_actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-n2-unpublish-create",
                "occurred_at": "2026-04-18T01:20:00+00:00",
                "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
            },
            "command": {
                "name": "market.listings.create",
                "aggregate_ref": "listing",
                "mutation_scope": "marketplace.listings",
                "payload": {
                    "title": "Transient maize lot",
                    "commodity": "Maize",
                    "quantity_tons": 3.9,
                    "price_amount": 300,
                    "price_currency": "GHS",
                    "location": "Kumasi, GH",
                    "summary": "Transient maize lot created for publish and unpublish parity coverage.",
                },
            },
        },
        headers=owner_headers,
    )
    listing_id = create_response.json()["result"]["listing"]["listing_id"]

    for request_id, idem_key, command_name in [
        ("b24c1f30-8422-49f9-a87d-3d097e7b7c36", "idem-n2-unpublish-publish", "market.listings.publish"),
        ("b24c1f30-8422-49f9-a87d-3d097e7b7c37", "idem-n2-unpublish-final", "market.listings.unpublish"),
    ]:
        response = client.post(
            "/api/v1/workflow/commands",
            json={
                "metadata": {
                    "request_id": request_id,
                    "idempotency_key": idem_key,
                    "actor_id": owner_actor_id,
                    "country_code": "GH",
                    "channel": "pwa",
                    "schema_version": schema_version,
                    "correlation_id": idem_key,
                    "occurred_at": "2026-04-18T01:25:00+00:00",
                    "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
                },
                "command": {
                    "name": command_name,
                    "aggregate_ref": listing_id,
                    "mutation_scope": "marketplace.listings",
                    "payload": {"listing_id": listing_id},
                },
            },
            headers=owner_headers,
        )
        assert response.status_code == 200

    buyer_collection = client.get("/api/v1/marketplace/listings", headers=buyer_headers)
    buyer_detail = client.get(f"/api/v1/marketplace/listings/{listing_id}", headers=buyer_headers)
    transporter_collection = client.get("/api/v1/marketplace/listings", headers=transporter_headers)
    transporter_detail = client.get(f"/api/v1/marketplace/listings/{listing_id}", headers=transporter_headers)
    owner_detail = client.get(f"/api/v1/marketplace/listings/{listing_id}", headers=owner_headers)

    assert buyer_collection.status_code == 200
    assert buyer_collection.json()["items"] == []
    assert buyer_detail.status_code == 404
    assert transporter_collection.status_code == 200
    assert transporter_collection.json()["items"] == []
    assert transporter_detail.status_code == 404
    assert owner_detail.status_code == 200
    assert owner_detail.json()["status"] == "draft"
    assert owner_detail.json()["published_revision_number"] is None
    assert owner_detail.json()["revision_count"] == 3


def test_buyer_routes_survive_missing_published_revision_after_publish(client, session) -> None:
    seller_sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Seller Publish Fallback",
            "email": "seller.publish.fallback@example.com",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    buyer_sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Buyer Publish Fallback",
            "email": "buyer.publish.fallback@example.com",
            "role": "buyer",
            "country_code": "GH",
        },
    )
    seller_headers = {"Authorization": f"Bearer {seller_sign_in.json()['access_token']}"}
    buyer_headers = {"Authorization": f"Bearer {buyer_sign_in.json()['access_token']}"}
    seller_actor_id = seller_sign_in.json()["session"]["actor"]["actor_id"]
    buyer_actor_id = buyer_sign_in.json()["session"]["actor"]["actor_id"]

    for headers in (seller_headers, buyer_headers):
        consent = client.post(
            "/api/v1/identity/consent",
            json={
                "policy_version": "2026.04.w1",
                "scope_ids": ["identity.core", "workflow.audit"],
                "captured_at": "2026-04-18T00:00:00+00:00",
            },
            headers=headers,
        )
        assert consent.status_code == 200

    schema_version = get_envelope_schema_version()
    create_listing = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "r4-fallback-create",
                "idempotency_key": "idem-r4-fallback-create",
                "actor_id": seller_actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-r4-fallback-create",
                "occurred_at": "2026-04-24T00:10:00+00:00",
                "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
            },
            "command": {
                "name": "market.listings.create",
                "aggregate_ref": "listing",
                "mutation_scope": "marketplace.listings",
                "payload": {
                    "title": "Fallback sesame lot",
                    "commodity": "Sesame",
                    "quantity_tons": 3.4,
                    "price_amount": 610,
                    "price_currency": "GHS",
                    "location": "Wa, GH",
                    "summary": "Fallback sesame lot with warehouse receipt and quality note attached.",
                },
            },
        },
        headers=seller_headers,
    )
    assert create_listing.status_code == 200
    listing_id = create_listing.json()["result"]["listing"]["listing_id"]

    publish_listing = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "r4-fallback-publish",
                "idempotency_key": "idem-r4-fallback-publish",
                "actor_id": seller_actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-r4-fallback-publish",
                "occurred_at": "2026-04-24T00:20:00+00:00",
                "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
            },
            "command": {
                "name": "market.listings.publish",
                "aggregate_ref": listing_id,
                "mutation_scope": "marketplace.listings",
                "payload": {"listing_id": listing_id},
            },
        },
        headers=seller_headers,
    )
    assert publish_listing.status_code == 200

    session.execute(
        delete(ListingRevision).where(
            ListingRevision.listing_id == listing_id,
            ListingRevision.revision_number == 2,
        )
    )
    session.commit()

    buyer_collection = client.get("/api/v1/marketplace/listings", headers=buyer_headers)
    buyer_detail = client.get(f"/api/v1/marketplace/listings/{listing_id}", headers=buyer_headers)

    assert buyer_collection.status_code == 200
    assert buyer_detail.status_code == 200
    assert buyer_collection.json()["items"][0]["listing_id"] == listing_id
    assert buyer_collection.json()["items"][0]["title"] == "Fallback sesame lot"
    assert buyer_collection.json()["items"][0]["revision_number"] == 2
    assert buyer_detail.json()["listing_id"] == listing_id
    assert buyer_detail.json()["view_scope"] == "buyer_safe"

    create_thread = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "r4-fallback-thread-create",
                "idempotency_key": "idem-r4-fallback-thread-create",
                "actor_id": buyer_actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-r4-fallback-thread-create",
                "occurred_at": "2026-04-24T00:25:00+00:00",
                "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
            },
            "command": {
                "name": "market.negotiations.create",
                "aggregate_ref": listing_id,
                "mutation_scope": "marketplace.negotiations",
                "payload": {
                    "listing_id": listing_id,
                    "offer_amount": 590,
                    "offer_currency": "GHS",
                    "note": "Buyer fallback offer",
                },
            },
        },
        headers=buyer_headers,
    )

    assert create_thread.status_code == 200
    assert create_thread.json()["result"]["thread"]["listing_id"] == listing_id


def test_duplicate_publish_and_unpublish_transitions_are_rejected(client, session) -> None:
    sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Owner Publish Guard",
            "email": "owner.publish.guard@example.com",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    access_token = sign_in.json()["access_token"]
    actor_id = sign_in.json()["session"]["actor"]["actor_id"]
    headers = {"Authorization": f"Bearer {access_token}"}

    consent = client.post(
        "/api/v1/identity/consent",
        json={
            "policy_version": "2026.04.w1",
            "scope_ids": ["identity.core", "workflow.audit"],
            "captured_at": "2026-04-18T00:00:00+00:00",
        },
        headers=headers,
    )
    assert consent.status_code == 200

    schema_version = get_envelope_schema_version()
    create_response = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c38",
                "idempotency_key": "idem-n2-publish-guard-create",
                "actor_id": actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-n2-publish-guard-create",
                "occurred_at": "2026-04-18T01:30:00+00:00",
                "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
            },
            "command": {
                "name": "market.listings.create",
                "aggregate_ref": "listing",
                "mutation_scope": "marketplace.listings",
                "payload": {
                    "title": "Publish guard listing",
                    "commodity": "Cassava",
                    "quantity_tons": 4.0,
                    "price_amount": 310,
                    "price_currency": "GHS",
                    "location": "Tamale, GH",
                    "summary": "Publish guard listing created to prove duplicate transitions are rejected.",
                },
            },
        },
        headers=headers,
    )
    listing_id = create_response.json()["result"]["listing"]["listing_id"]

    publish_payload = {
        "metadata": {
            "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c39",
            "idempotency_key": "idem-n2-publish-guard-first",
            "actor_id": actor_id,
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": schema_version,
            "correlation_id": "corr-n2-publish-guard-first",
            "occurred_at": "2026-04-18T01:31:00+00:00",
            "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
        },
        "command": {
            "name": "market.listings.publish",
            "aggregate_ref": listing_id,
            "mutation_scope": "marketplace.listings",
            "payload": {"listing_id": listing_id},
        },
    }
    first_publish = client.post("/api/v1/workflow/commands", json=publish_payload, headers=headers)
    second_publish = client.post(
        "/api/v1/workflow/commands",
        json={
            **publish_payload,
            "metadata": {
                **publish_payload["metadata"],
                "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c40",
                "idempotency_key": "idem-n2-publish-guard-second",
                "correlation_id": "corr-n2-publish-guard-second",
            },
        },
        headers=headers,
    )

    assert first_publish.status_code == 200
    assert second_publish.status_code == 409
    assert second_publish.json()["detail"]["error_code"] == "listing_already_published"

    unpublish_payload = {
        "metadata": {
            "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c41",
            "idempotency_key": "idem-n2-unpublish-guard-first",
            "actor_id": actor_id,
            "country_code": "GH",
            "channel": "pwa",
            "schema_version": schema_version,
            "correlation_id": "corr-n2-unpublish-guard-first",
            "occurred_at": "2026-04-18T01:32:00+00:00",
            "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
        },
        "command": {
            "name": "market.listings.unpublish",
            "aggregate_ref": listing_id,
            "mutation_scope": "marketplace.listings",
            "payload": {"listing_id": listing_id},
        },
    }
    first_unpublish = client.post("/api/v1/workflow/commands", json=unpublish_payload, headers=headers)
    second_unpublish = client.post(
        "/api/v1/workflow/commands",
        json={
            **unpublish_payload,
            "metadata": {
                **unpublish_payload["metadata"],
                "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c42",
                "idempotency_key": "idem-n2-unpublish-guard-second",
                "correlation_id": "corr-n2-unpublish-guard-second",
            },
        },
        headers=headers,
    )

    assert first_unpublish.status_code == 200
    assert second_unpublish.status_code == 409
    assert second_unpublish.json()["detail"]["error_code"] == "listing_already_unpublished"


def test_missing_consent_blocks_listing_create(client, session) -> None:
    sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Kojo Addo",
            "email": "kojo@example.com",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    access_token = sign_in.json()["access_token"]
    actor_id = sign_in.json()["session"]["actor"]["actor_id"]

    response = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c12",
                "idempotency_key": "idem-v001-kojo-1",
                "actor_id": actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": get_envelope_schema_version(),
                "correlation_id": "corr-v001-2",
                "occurred_at": "2026-04-18T00:10:00+00:00",
                "traceability": {"journey_ids": ["EP-007"], "data_check_ids": ["DI-004"]},
            },
            "command": {
                "name": "market.listings.create",
                "aggregate_ref": "listing",
                "mutation_scope": "marketplace.listings",
                "payload": {
                    "title": "Fresh maize lot",
                    "commodity": "Maize",
                    "quantity_tons": 3.1,
                    "price_amount": 280,
                    "price_currency": "GHS",
                    "location": "Kumasi, GH",
                    "summary": "Fresh maize lot ready for pickup with weighbridge receipt available.",
                },
            },
        },
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 403
    assert response.json()["detail"]["error_code"] == "missing_consent"
    latest_audit = session.execute(
        select(AuditEvent).order_by(AuditEvent.id.desc()).limit(1)
    ).scalar_one()
    assert latest_audit.reason_code == "missing_consent"


def test_invalid_listing_edit_payload_is_rejected_with_audit(client, session) -> None:
    sign_in = client.post(
        "/api/v1/identity/session",
        json={
            "display_name": "Ama Validator",
            "email": "ama.validator@example.com",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    access_token = sign_in.json()["access_token"]
    actor_id = sign_in.json()["session"]["actor"]["actor_id"]
    headers = {"Authorization": f"Bearer {access_token}"}

    consent = client.post(
        "/api/v1/identity/consent",
        json={
            "policy_version": "2026.04.w1",
            "scope_ids": ["identity.core", "workflow.audit"],
            "captured_at": "2026-04-18T00:00:00+00:00",
        },
        headers=headers,
    )
    assert consent.status_code == 200

    create_response = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c25",
                "idempotency_key": "idem-v001-validator-create",
                "actor_id": actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": get_envelope_schema_version(),
                "correlation_id": "corr-v001-validator-create",
                "occurred_at": "2026-04-18T00:20:00+00:00",
                "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
            },
            "command": {
                "name": "market.listings.create",
                "aggregate_ref": "listing",
                "mutation_scope": "marketplace.listings",
                "payload": {
                    "title": "Validated maize lot",
                    "commodity": "Maize",
                    "quantity_tons": 3.0,
                    "price_amount": 280,
                    "price_currency": "GHS",
                    "location": "Kumasi, GH",
                    "summary": "Validated maize lot created with weighbridge and pickup evidence attached.",
                },
            },
        },
        headers=headers,
    )
    listing_id = create_response.json()["result"]["listing"]["listing_id"]

    response = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "b24c1f30-8422-49f9-a87d-3d097e7b7c26",
                "idempotency_key": "idem-v001-validator-update",
                "actor_id": actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": get_envelope_schema_version(),
                "correlation_id": "corr-v001-validator-update",
                "occurred_at": "2026-04-18T00:25:00+00:00",
                "traceability": {"journey_ids": ["RJ-002"], "data_check_ids": ["DI-001"]},
            },
            "command": {
                "name": "market.listings.update",
                "aggregate_ref": listing_id,
                "mutation_scope": "marketplace.listings",
                "payload": {
                    "listing_id": listing_id,
                    "title": "Validated maize lot revised",
                    "commodity": "Maize",
                    "quantity_tons": 3.2,
                    "price_amount": 290,
                    "price_currency": "GHS",
                    "location": "Kumasi, GH",
                    "summary": "short",
                },
            },
        },
        headers=headers,
    )

    assert response.status_code == 422
    assert response.json()["detail"]["error_code"] == "invalid_schema"

    latest_audit = session.execute(
        select(AuditEvent).order_by(AuditEvent.id.desc()).limit(1)
    ).scalar_one()
    assert latest_audit.reason_code == "invalid_payload"
    stored_listing = session.execute(select(Listing).where(Listing.listing_id == listing_id)).scalar_one()
    assert stored_listing.title == "Validated maize lot"


def test_negotiation_runtime_enforces_confirmation_checkpoint_and_thread_parity(client, session) -> None:
    schema_version = get_envelope_schema_version()

    def sign_in_actor(display_name: str, email: str, role: str) -> tuple[str, str]:
        sign_in = client.post(
            "/api/v1/identity/session",
            json={
                "display_name": display_name,
                "email": email,
                "role": role,
                "country_code": "GH",
            },
        )
        assert sign_in.status_code == 200
        token = sign_in.json()["access_token"]
        actor_id = sign_in.json()["session"]["actor"]["actor_id"]
        consent = client.post(
            "/api/v1/identity/consent",
            json={
                "policy_version": "2026.04.w1",
                "scope_ids": ["identity.core", "workflow.audit"],
                "captured_at": "2026-04-18T00:00:00+00:00",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert consent.status_code == 200
        return token, actor_id

    def command_payload(
        *,
        request_id: str,
        idempotency_key: str,
        actor_id: str,
        command_name: str,
        aggregate_ref: str,
        payload: dict[str, object],
        correlation_id: str,
    ) -> dict[str, object]:
        return {
            "metadata": {
                "request_id": request_id,
                "idempotency_key": idempotency_key,
                "actor_id": actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": correlation_id,
                "occurred_at": "2026-04-18T01:00:00+00:00",
                "traceability": {"journey_ids": ["CJ-003"], "data_check_ids": ["DI-002"]},
            },
            "command": {
                "name": command_name,
                "aggregate_ref": aggregate_ref,
                "mutation_scope": "marketplace.negotiations",
                "payload": payload,
            },
        }

    seller_token, seller_actor_id = sign_in_actor("Seller Ama", "seller.ama@example.com", "farmer")
    buyer_token, buyer_actor_id = sign_in_actor("Buyer Kojo", "buyer.kojo@example.com", "buyer")
    outsider_token, outsider_actor_id = sign_in_actor(
        "Buyer Naa", "buyer.naa@example.com", "buyer"
    )

    seller_headers = {"Authorization": f"Bearer {seller_token}"}
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
    outsider_headers = {"Authorization": f"Bearer {outsider_token}"}

    create_listing = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "n2-negotiation-create-listing",
                "idempotency_key": "idem-n2-negotiation-create-listing",
                "actor_id": seller_actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-n2-negotiation-create-listing",
                "occurred_at": "2026-04-18T00:40:00+00:00",
                "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
            },
            "command": {
                "name": "market.listings.create",
                "aggregate_ref": "listing",
                "mutation_scope": "marketplace.listings",
                "payload": {
                    "title": "Negotiation-ready soybean lot",
                    "commodity": "Soybean",
                    "quantity_tons": 8.0,
                    "price_amount": 520,
                    "price_currency": "GHS",
                    "location": "Tamale, GH",
                    "summary": "Soybean lot with quality certificate and pickup schedule attached.",
                },
            },
        },
        headers=seller_headers,
    )
    assert create_listing.status_code == 200
    listing_id = create_listing.json()["result"]["listing"]["listing_id"]

    publish_listing = client.post(
        "/api/v1/workflow/commands",
        json={
            "metadata": {
                "request_id": "n2-negotiation-publish-listing",
                "idempotency_key": "idem-n2-negotiation-publish-listing",
                "actor_id": seller_actor_id,
                "country_code": "GH",
                "channel": "pwa",
                "schema_version": schema_version,
                "correlation_id": "corr-n2-negotiation-publish-listing",
                "occurred_at": "2026-04-18T00:45:00+00:00",
                "traceability": {"journey_ids": ["CJ-002"], "data_check_ids": ["DI-001"]},
            },
            "command": {
                "name": "market.listings.publish",
                "aggregate_ref": listing_id,
                "mutation_scope": "marketplace.listings",
                "payload": {"listing_id": listing_id},
            },
        },
        headers=seller_headers,
    )
    assert publish_listing.status_code == 200

    create_thread_payload = command_payload(
        request_id="n2-negotiation-thread-create",
        idempotency_key="idem-n2-negotiation-thread-create",
        actor_id=buyer_actor_id,
        command_name="market.negotiations.create",
        aggregate_ref=listing_id,
        payload={
            "listing_id": listing_id,
            "offer_amount": 500,
            "offer_currency": "GHS",
            "note": "Initial buyer offer",
        },
        correlation_id="corr-n2-negotiation-thread-create",
    )
    first_create = client.post("/api/v1/workflow/commands", json=create_thread_payload, headers=buyer_headers)
    second_create = client.post("/api/v1/workflow/commands", json=create_thread_payload, headers=buyer_headers)

    assert first_create.status_code == 200
    assert second_create.status_code == 200
    assert first_create.json()["status"] == "accepted"
    assert second_create.json()["status"] == "replayed"

    thread_id = first_create.json()["result"]["thread"]["thread_id"]

    counter_response = client.post(
        "/api/v1/workflow/commands",
        json=command_payload(
            request_id="n2-negotiation-thread-counter",
            idempotency_key="idem-n2-negotiation-thread-counter",
            actor_id=seller_actor_id,
            command_name="market.negotiations.counter",
            aggregate_ref=thread_id,
            payload={
                "thread_id": thread_id,
                "offer_amount": 510,
                "offer_currency": "GHS",
                "note": "Seller counter offer",
            },
            correlation_id="corr-n2-negotiation-thread-counter",
        ),
        headers=seller_headers,
    )
    assert counter_response.status_code == 200
    assert counter_response.json()["result"]["thread"]["status"] == "open"

    confirmation_request = client.post(
        "/api/v1/workflow/commands",
        json=command_payload(
            request_id="n2-negotiation-confirm-request",
            idempotency_key="idem-n2-negotiation-confirm-request",
            actor_id=seller_actor_id,
            command_name="market.negotiations.confirm.request",
            aggregate_ref=thread_id,
            payload={
                "thread_id": thread_id,
                "required_confirmer_actor_id": buyer_actor_id,
                "note": "Need final buyer confirmation",
            },
            correlation_id="corr-n2-negotiation-confirm-request",
        ),
        headers=seller_headers,
    )
    assert confirmation_request.status_code == 200
    assert confirmation_request.json()["result"]["thread"]["status"] == "pending_confirmation"

    outsider_approval = client.post(
        "/api/v1/workflow/commands",
        json=command_payload(
            request_id="n2-negotiation-outsider-approve",
            idempotency_key="idem-n2-negotiation-outsider-approve",
            actor_id=outsider_actor_id,
            command_name="market.negotiations.confirm.approve",
            aggregate_ref=thread_id,
            payload={"thread_id": thread_id, "note": "Unauthorized approval attempt"},
            correlation_id="corr-n2-negotiation-outsider-approve",
        ),
        headers=outsider_headers,
    )
    assert outsider_approval.status_code == 403
    assert outsider_approval.json()["detail"]["error_code"] == "policy_denied"

    buyer_thread_detail = client.get(f"/api/v1/marketplace/negotiations/{thread_id}", headers=buyer_headers)
    seller_thread_detail = client.get(f"/api/v1/marketplace/negotiations/{thread_id}", headers=seller_headers)
    assert buyer_thread_detail.status_code == 200
    assert seller_thread_detail.status_code == 200
    assert buyer_thread_detail.json()["status"] == "pending_confirmation"
    assert seller_thread_detail.json()["status"] == "pending_confirmation"
    assert (
        buyer_thread_detail.json()["confirmation_checkpoint"]["required_confirmer_actor_id"]
        == buyer_actor_id
    )

    outsider_thread_detail = client.get(
        f"/api/v1/marketplace/negotiations/{thread_id}", headers=outsider_headers
    )
    assert outsider_thread_detail.status_code == 404

    buyer_approval = client.post(
        "/api/v1/workflow/commands",
        json=command_payload(
            request_id="n2-negotiation-buyer-approve",
            idempotency_key="idem-n2-negotiation-buyer-approve",
            actor_id=buyer_actor_id,
            command_name="market.negotiations.confirm.approve",
            aggregate_ref=thread_id,
            payload={"thread_id": thread_id, "note": "Buyer confirms final offer"},
            correlation_id="corr-n2-negotiation-buyer-approve",
        ),
        headers=buyer_headers,
    )
    assert buyer_approval.status_code == 200
    assert buyer_approval.json()["result"]["thread"]["status"] == "accepted"

    post_terminal_counter = client.post(
        "/api/v1/workflow/commands",
        json=command_payload(
            request_id="n2-negotiation-post-terminal-counter",
            idempotency_key="idem-n2-negotiation-post-terminal-counter",
            actor_id=seller_actor_id,
            command_name="market.negotiations.counter",
            aggregate_ref=thread_id,
            payload={
                "thread_id": thread_id,
                "offer_amount": 515,
                "offer_currency": "GHS",
                "note": "Attempted terminal mutation",
            },
            correlation_id="corr-n2-negotiation-post-terminal-counter",
        ),
        headers=seller_headers,
    )
    assert post_terminal_counter.status_code == 409
    assert post_terminal_counter.json()["detail"]["error_code"] == "thread_closed"

    seller_threads = client.get("/api/v1/marketplace/negotiations", headers=seller_headers)
    buyer_threads = client.get("/api/v1/marketplace/negotiations", headers=buyer_headers)
    assert seller_threads.status_code == 200
    assert buyer_threads.status_code == 200
    assert seller_threads.json()["items"][0]["thread_id"] == thread_id
    assert buyer_threads.json()["items"][0]["thread_id"] == thread_id
    assert seller_threads.json()["items"][0]["status"] == "accepted"
    assert buyer_threads.json()["items"][0]["status"] == "accepted"

    stored_thread = session.execute(
        select(NegotiationThread).where(NegotiationThread.thread_id == thread_id)
    ).scalar_one()
    assert stored_thread.status == "accepted"
    assert stored_thread.required_confirmer_actor_id is None

    message_count = session.execute(
        select(func.count()).select_from(NegotiationMessage).where(NegotiationMessage.thread_id == thread_id)
    ).scalar_one()
    assert message_count == 4

    replay_audit = client.get(
        "/api/v1/audit/events",
        params={
            "request_id": "n2-negotiation-thread-create",
            "idempotency_key": "idem-n2-negotiation-thread-create",
        },
        headers=buyer_headers,
    )
    assert replay_audit.status_code == 200
    assert len(replay_audit.json()["items"]) == 3

    latest_audit = session.execute(
        select(AuditEvent).order_by(AuditEvent.id.desc()).limit(1)
    ).scalar_one()
    assert latest_audit.reason_code in {"thread_closed", "confirmation_approved"}
    negotiation_outbox_count = session.execute(
        select(func.count())
        .select_from(OutboxMessage)
        .where(OutboxMessage.aggregate_type == "negotiation_thread")
    ).scalar_one()
    assert negotiation_outbox_count >= 4
