from sqlalchemy import select

from app.db.models.platform import IdentityAccount
from app.db.repositories.identity import IdentityRepository


def _register_payload(email: str) -> dict[str, object]:
    return {
        "display_name": "Ama Mensah",
        "email": email,
        "phone_number": "+233241234567",
        "password": "Harvest2026!",
        "role": "farmer",
        "country_code": "GH",
    }


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_password_register_and_login_issue_real_sessions(client) -> None:
    register_response = client.post(
        "/api/v1/identity/register/password",
        json=_register_payload("ama@example.com"),
    )
    assert register_response.status_code == 200
    register_body = register_response.json()
    register_token = register_body["access_token"]
    assert register_token
    assert register_body["session"]["actor"]["role"] == "farmer"

    session_response = client.get("/api/v1/identity/session", headers=_auth_headers(register_token))
    assert session_response.status_code == 200
    assert session_response.json()["actor"]["email"] == "ama@example.com"

    login_response = client.post(
        "/api/v1/identity/login/password",
        json={
            "identifier": "ama@example.com",
            "password": "Harvest2026!",
        },
    )
    assert login_response.status_code == 200
    login_body = login_response.json()
    assert login_body["access_token"] != register_token
    assert login_body["session"]["available_roles"] == ["farmer"]


def test_magic_link_refresh_and_logout_are_session_bound(client) -> None:
    client.post("/api/v1/identity/register/password", json=_register_payload("kojo@example.com"))

    request_response = client.post(
        "/api/v1/identity/login/magic-link/request",
        json={
            "identifier": "kojo@example.com",
            "delivery_channel": "email",
        },
    )
    assert request_response.status_code == 200
    challenge_body = request_response.json()
    assert challenge_body["provider"] == "smtp"
    assert challenge_body["preview_code"]

    verify_response = client.post(
        "/api/v1/identity/login/magic-link/verify",
        json={
            "challenge_id": challenge_body["challenge_id"],
            "verification_code": challenge_body["preview_code"],
        },
    )
    assert verify_response.status_code == 200
    verify_token = verify_response.json()["access_token"]

    refresh_response = client.post(
        "/api/v1/identity/session/refresh",
        headers=_auth_headers(verify_token),
    )
    assert refresh_response.status_code == 200
    refreshed_token = refresh_response.json()["access_token"]
    assert refreshed_token != verify_token

    stale_response = client.get("/api/v1/identity/session", headers=_auth_headers(verify_token))
    assert stale_response.status_code == 401

    logout_response = client.post(
        "/api/v1/identity/session/logout",
        headers=_auth_headers(refreshed_token),
    )
    assert logout_response.status_code == 200
    assert logout_response.json()["status"] == "logged_out"

    revoked_response = client.get("/api/v1/identity/session", headers=_auth_headers(refreshed_token))
    assert revoked_response.status_code == 401


def test_password_recovery_rotates_credentials_and_revokes_prior_sessions(client) -> None:
    register_response = client.post(
        "/api/v1/identity/register/password",
        json=_register_payload("adwoa@example.com"),
    )
    assert register_response.status_code == 200
    original_token = register_response.json()["access_token"]

    recovery_request = client.post(
        "/api/v1/identity/recovery/password/request",
        json={
            "identifier": "adwoa@example.com",
            "delivery_channel": "email",
        },
    )
    assert recovery_request.status_code == 200
    recovery_body = recovery_request.json()

    recovery_confirm = client.post(
        "/api/v1/identity/recovery/password/confirm",
        json={
            "challenge_id": recovery_body["challenge_id"],
            "verification_code": recovery_body["preview_code"],
            "new_password": "NewHarvest2026!",
        },
    )
    assert recovery_confirm.status_code == 200
    recovery_token = recovery_confirm.json()["access_token"]
    assert recovery_token != original_token

    revoked_original = client.get("/api/v1/identity/session", headers=_auth_headers(original_token))
    assert revoked_original.status_code == 401

    old_password_login = client.post(
        "/api/v1/identity/login/password",
        json={
            "identifier": "adwoa@example.com",
            "password": "Harvest2026!",
        },
    )
    assert old_password_login.status_code == 401

    new_password_login = client.post(
        "/api/v1/identity/login/password",
        json={
            "identifier": "adwoa@example.com",
            "password": "NewHarvest2026!",
        },
    )
    assert new_password_login.status_code == 200


def test_role_switch_requires_country_membership_and_invalidates_prior_session(client, session) -> None:
    register_response = client.post(
        "/api/v1/identity/register/password",
        json=_register_payload("yawo@example.com"),
    )
    assert register_response.status_code == 200
    original_token = register_response.json()["access_token"]

    account = session.execute(
        select(IdentityAccount).where(IdentityAccount.email == "yawo@example.com")
    ).scalar_one()
    repository = IdentityRepository(session)
    repository.ensure_membership(actor_id=account.actor_id, role="buyer", country_code="GH")
    repository.ensure_membership(actor_id=account.actor_id, role="investor", country_code="NG")
    session.commit()

    switch_response = client.post(
        "/api/v1/identity/session/roles/switch",
        json={"target_role": "buyer"},
        headers=_auth_headers(original_token),
    )
    assert switch_response.status_code == 200
    switch_body = switch_response.json()
    assert switch_body["session"]["actor"]["role"] == "buyer"
    assert set(switch_body["session"]["available_roles"]) == {"farmer", "buyer"}

    original_session = client.get("/api/v1/identity/session", headers=_auth_headers(original_token))
    assert original_session.status_code == 401

    denied_switch = client.post(
        "/api/v1/identity/session/roles/switch",
        json={"target_role": "investor"},
        headers=_auth_headers(switch_body["access_token"]),
    )
    assert denied_switch.status_code == 403
