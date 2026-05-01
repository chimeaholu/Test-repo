from sqlalchemy import select

from app.core.demo import DEMO_EMAIL_DOMAIN, DEMO_OPERATOR_PASSWORD
from app.core.identity_security import build_password_hash
from app.db.models.marketplace import Listing
from app.db.models.platform import IdentityAccount
from app.db.repositories.identity import IdentityRepository
from app.seed_demo_data import reset_demo_data, seed_demo_data


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _create_admin_account(session) -> str:
    repository = IdentityRepository(session)
    account = repository.create_account(
        display_name="Operational Admin",
        email="ops-admin@example.com",
        phone_number="+233200000119",
        country_code="GH",
    )
    repository.ensure_membership(actor_id=account.actor_id, role="admin", country_code="GH")
    repository.set_password_credential(
        actor_id=account.actor_id,
        password_hash=build_password_hash("OpsAdminPassword123!", iterations=600_000),
    )
    session.commit()
    return account.email


def test_demo_seed_pack_reseeds_reserved_synthetic_entities(session) -> None:
    first_counts = seed_demo_data(session)
    session.commit()

    operator = session.execute(
        select(IdentityAccount).where(IdentityAccount.actor_id == "demo:operator:admin")
    ).scalar_one()
    assert operator.email.endswith(f"@{DEMO_EMAIL_DOMAIN}")
    assert operator.display_name.startswith("AGD Demo | ")
    assert first_counts["identity_accounts"] >= 1

    listing = session.execute(
        select(Listing).where(Listing.listing_id == "demo-listing-gh-maize")
    ).scalar_one()
    listing.title = "Mutated title should be reset"
    session.commit()

    deleted = reset_demo_data(session)
    second_counts = seed_demo_data(session)
    session.commit()

    restored = session.execute(
        select(Listing).where(Listing.listing_id == "demo-listing-gh-maize")
    ).scalar_one()
    assert restored.title == "AGD Demo | Premium white maize"
    assert deleted["identity_accounts"] >= 1
    assert second_counts["identity_accounts"] >= 1


def test_demo_operator_switches_personas_and_marks_workspace(client, session) -> None:
    seed_demo_data(session)
    session.commit()

    login_response = client.post(
        "/api/v1/identity/login/password",
        json={
            "identifier": f"operator@{DEMO_EMAIL_DOMAIN}",
            "password": DEMO_OPERATOR_PASSWORD,
            "role": "admin",
            "country_code": "GH",
        },
    )
    assert login_response.status_code == 200
    login_body = login_response.json()
    token = login_body["access_token"]
    assert login_body["session"]["workspace"]["is_demo_tenant"] is True
    assert login_body["session"]["workspace"]["operator_can_switch_personas"] is True

    list_response = client.get("/api/v1/identity/demo/personas", headers=_auth_headers(token))
    assert list_response.status_code == 200
    list_body = list_response.json()
    assert list_body["items"]
    assert list_body["runbook"]

    switch_response = client.post(
        "/api/v1/identity/session/demo/switch",
        headers=_auth_headers(token),
        json={"target_actor_id": "demo:gh:farmer:kwame", "target_role": "farmer"},
    )
    assert switch_response.status_code == 200
    switch_body = switch_response.json()
    assert switch_body["session"]["actor"]["actor_id"] == "demo:gh:farmer:kwame"
    assert switch_body["session"]["workspace"]["is_demo_tenant"] is True
    assert switch_body["session"]["workspace"]["operator_can_switch_personas"] is False

    revoked_response = client.get("/api/v1/identity/session", headers=_auth_headers(token))
    assert revoked_response.status_code == 401


def test_admin_health_segregates_demo_from_operational_truth(client, session) -> None:
    seed_demo_data(session)
    session.commit()

    register_response = client.post(
        "/api/v1/identity/register/password",
        json={
            "display_name": "Operational Farmer",
            "email": "operational-farmer@example.com",
            "phone_number": "+233200000118",
            "password": "OperationalFarmer123!",
            "role": "farmer",
            "country_code": "GH",
        },
    )
    assert register_response.status_code == 200
    farmer_actor_id = register_response.json()["session"]["actor"]["actor_id"]
    session.add(
        Listing(
            listing_id="operational-listing-gh-001",
            actor_id=farmer_actor_id,
            country_code="GH",
            title="Operational Maize Lot",
            commodity="maize",
            quantity_tons=5.0,
            price_amount=400.0,
            price_currency="GHS",
            location="Kumasi",
            summary="Operational truth listing.",
            status="published",
            revision_number=1,
            published_revision_number=1,
            revision_count=1,
        )
    )
    session.commit()

    admin_email = _create_admin_account(session)
    admin_login = client.post(
        "/api/v1/identity/login/password",
        json={
            "identifier": admin_email,
            "password": "OpsAdminPassword123!",
            "role": "admin",
            "country_code": "GH",
        },
    )
    assert admin_login.status_code == 200

    response = client.get("/api/v1/admin/analytics/health", headers=_auth_headers(admin_login.json()["access_token"]))
    assert response.status_code == 200
    body = response.json()
    assert body["active_signals"]["listings"] == 1
    assert body["demo_signals"]["listings"] >= 2
    assert body["segregation_mode"] == "shared_environment_demo_tenant"


def test_wallet_transfer_rejects_demo_cross_boundary(client, session) -> None:
    seed_demo_data(session)
    session.commit()

    response = client.post(
        "/api/v1/identity/register/password",
        json={
            "display_name": "Operational Buyer",
            "email": "operational-buyer@example.com",
            "phone_number": "+233200000117",
            "password": "OperationalBuyer123!",
            "role": "buyer",
            "country_code": "GH",
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    transfer = client.post(
        "/api/v1/wallet/transfers",
        headers=_auth_headers(token),
        json={
            "recipient_actor_id": "demo:gh:farmer:kwame",
            "currency": "GHS",
            "amount": 10.0,
            "note": "Should fail across the demo boundary",
        },
    )
    assert transfer.status_code == 403
    assert transfer.json()["detail"] == "demo_boundary_violation"
