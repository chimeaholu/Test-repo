from __future__ import annotations

from datetime import UTC, datetime, timedelta
from time import perf_counter
from typing import Literal, overload

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import AuthContext, authenticate_request
from app.core.config import Settings
from app.core.demo import (
    DEMO_RUNBOOK,
    demo_persona_definition,
    is_demo_actor_id,
    same_demo_boundary,
)
from app.core.identity_delivery import normalize_phone_number, select_delivery_plan
from app.core.identity_security import (
    build_password_hash,
    hash_verification_code,
    issue_verification_code,
    utcnow,
    verify_code,
    verify_password_hash,
)
from app.db.repositories.identity import IdentityRepository

router = APIRouter(prefix="/api/v1/identity", tags=["identity"])

SelfServiceRole = Literal[
    "farmer",
    "buyer",
    "cooperative",
    "transporter",
    "investor",
    "extension_agent",
]

IdentityRole = Literal[
    "farmer",
    "buyer",
    "cooperative",
    "transporter",
    "investor",
    "extension_agent",
    "advisor",
    "finance",
    "admin",
]

DeliveryChannel = Literal["sms", "email"]


class LegacyBootstrapRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)
    role: SelfServiceRole
    country_code: str = Field(min_length=2, max_length=2)


class PasswordRegistrationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)
    phone_number: str | None = Field(default=None, min_length=8, max_length=32)
    password: str = Field(min_length=10, max_length=128)
    role: SelfServiceRole
    country_code: str = Field(min_length=2, max_length=2)


class PasswordLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    identifier: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=10, max_length=128)
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    role: IdentityRole | None = None


class MagicLinkRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    identifier: str = Field(min_length=5, max_length=255)
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    role: IdentityRole | None = None
    delivery_channel: DeliveryChannel = "sms"


class MagicLinkVerifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    challenge_id: str = Field(min_length=8, max_length=64)
    verification_code: str = Field(min_length=6, max_length=6)


class ConsentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    policy_version: str = Field(min_length=1, max_length=32)
    scope_ids: list[str] = Field(min_length=1)
    captured_at: datetime


class RevokeConsentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(min_length=8, max_length=255)


class PasswordRecoveryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    identifier: str = Field(min_length=5, max_length=255)
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    delivery_channel: DeliveryChannel = "sms"


class PasswordRecoveryConfirmRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    challenge_id: str = Field(min_length=8, max_length=64)
    verification_code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=10, max_length=128)


class RoleSwitchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_role: IdentityRole


class DemoPersonaSwitchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_actor_id: str = Field(min_length=1, max_length=64)
    target_role: IdentityRole


@overload
def _normalize_country_code(country_code: str) -> str: ...


@overload
def _normalize_country_code(country_code: None) -> None: ...


def _normalize_country_code(country_code: str | None) -> str | None:
    return country_code.upper() if country_code is not None else None


def _normalize_identifier(identifier: str, *, country_code: str | None) -> str:
    stripped = identifier.strip()
    if "@" in stripped:
        return stripped.lower()
    if country_code is None:
        return stripped
    return normalize_phone_number(stripped, country_code=country_code)


def _require_auth_context(
    request: Request,
    settings: Settings,
    db_session: Session,
) -> AuthContext:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.session_id is None:
        raise HTTPException(status_code=403, detail="session_context_required")
    return auth_context


def _select_role_or_raise(
    repository: IdentityRepository,
    *,
    actor_id: str,
    country_code: str,
    requested_role: str | None,
) -> str:
    memberships = repository.list_memberships(actor_id=actor_id, country_code=country_code)
    if not memberships:
        raise HTTPException(status_code=403, detail="country_membership_missing")
    if requested_role is not None:
        if not any(membership.role == requested_role for membership in memberships):
            raise HTTPException(status_code=403, detail="role_membership_missing")
        return requested_role
    if len(memberships) > 1:
        raise HTTPException(status_code=409, detail="role_selection_required")
    return memberships[0].role


def _require_demo_operator(
    request: Request,
    settings: Settings,
    db_session: Session,
) -> AuthContext:
    auth_context = _require_auth_context(request, settings, db_session)
    if not auth_context.is_demo_tenant:
        raise HTTPException(status_code=403, detail="demo_tenant_required")
    if not auth_context.demo_operator or auth_context.role != "admin":
        raise HTTPException(status_code=403, detail="demo_operator_scope_required")
    return auth_context


def _token_response(repository: IdentityRepository, *, access_token: str, session_record) -> dict[str, object]:
    return {
        "access_token": access_token,
        "session": repository.build_session_payload(session_record),
    }


def _record_auth_metric(
    request: Request,
    *,
    flow: str,
    outcome: str,
    started_at: float,
) -> None:
    request.app.state.telemetry.record_auth_flow(
        flow=flow,
        outcome=outcome,
        duration_ms=(perf_counter() - started_at) * 1000,
        correlation_id=request.state.correlation_id,
        request_id=request.state.request_id,
        trace_id=request.state.trace_id,
        span_id=request.state.span_id,
    )


def _coerce_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


@router.post("/session")
def reject_legacy_bootstrap(_: LegacyBootstrapRequest) -> dict[str, str]:
    raise HTTPException(status_code=410, detail="legacy_bootstrap_removed")


@router.post("/register/password")
def register_password_account(
    payload: PasswordRegistrationRequest,
    request: Request,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    started_at = perf_counter()
    repository = IdentityRepository(session)
    country_code = _normalize_country_code(payload.country_code)
    phone_number = (
        normalize_phone_number(payload.phone_number, country_code=country_code)
        if payload.phone_number
        else None
    )
    try:
        account = repository.create_account(
            display_name=payload.display_name,
            email=payload.email,
            phone_number=phone_number,
            country_code=country_code,
        )
    except ValueError as exc:
        _record_auth_metric(
            request,
            flow="password_register",
            outcome="account_exists",
            started_at=started_at,
        )
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    repository.ensure_membership(
        actor_id=account.actor_id,
        role=payload.role,
        country_code=country_code,
    )
    repository.set_password_credential(
        actor_id=account.actor_id,
        password_hash=build_password_hash(
            payload.password,
            iterations=settings.auth_password_hash_iterations,
        ),
    )
    access_token, session_record = repository.issue_session(
        settings=settings,
        actor_id=account.actor_id,
        role=payload.role,
        country_code=country_code,
        issued_via="password_register",
    )
    session.commit()
    _record_auth_metric(
        request,
        flow="password_register",
        outcome="accepted",
        started_at=started_at,
    )
    return _token_response(repository, access_token=access_token, session_record=session_record)


@router.post("/login/password")
def login_with_password(
    payload: PasswordLoginRequest,
    request: Request,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    started_at = perf_counter()
    repository = IdentityRepository(session)
    country_code = _normalize_country_code(payload.country_code)
    account = repository.resolve_account(
        _normalize_identifier(payload.identifier, country_code=country_code)
    )
    if account is None:
        _record_auth_metric(
            request,
            flow="password_login",
            outcome="invalid_credentials",
            started_at=started_at,
        )
        raise HTTPException(status_code=401, detail="invalid_credentials")

    credential = repository.get_password_credential(account.actor_id)
    if credential is None:
        _record_auth_metric(
            request,
            flow="password_login",
            outcome="password_login_not_enabled",
            started_at=started_at,
        )
        raise HTTPException(status_code=403, detail="password_login_not_enabled")
    if credential.locked_until is not None and credential.locked_until > utcnow():
        _record_auth_metric(
            request,
            flow="password_login",
            outcome="password_login_locked",
            started_at=started_at,
        )
        raise HTTPException(status_code=423, detail="password_login_locked")
    if not verify_password_hash(payload.password, credential.password_hash):
        repository.register_failed_password_attempt(account.actor_id)
        session.commit()
        _record_auth_metric(
            request,
            flow="password_login",
            outcome="invalid_credentials",
            started_at=started_at,
        )
        raise HTTPException(status_code=401, detail="invalid_credentials")

    repository.clear_failed_password_attempts(account.actor_id)
    active_country_code = country_code or account.home_country_code
    role = _select_role_or_raise(
        repository,
        actor_id=account.actor_id,
        country_code=active_country_code,
        requested_role=payload.role,
    )
    access_token, session_record = repository.issue_session(
        settings=settings,
        actor_id=account.actor_id,
        role=role,
        country_code=active_country_code,
        issued_via="password_login",
    )
    session.commit()
    _record_auth_metric(
        request,
        flow="password_login",
        outcome="accepted",
        started_at=started_at,
    )
    return _token_response(repository, access_token=access_token, session_record=session_record)


@router.post("/login/magic-link/request")
def request_magic_link(
    payload: MagicLinkRequest,
    request: Request,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    started_at = perf_counter()
    repository = IdentityRepository(session)
    country_code = _normalize_country_code(payload.country_code)
    account = repository.resolve_account(
        _normalize_identifier(payload.identifier, country_code=country_code)
    )
    if account is None:
        _record_auth_metric(
            request,
            flow="magic_link_request",
            outcome="identity_account_not_found",
            started_at=started_at,
        )
        raise HTTPException(status_code=404, detail="identity_account_not_found")

    active_country_code = country_code or account.home_country_code
    role = _select_role_or_raise(
        repository,
        actor_id=account.actor_id,
        country_code=active_country_code,
        requested_role=payload.role,
    )
    try:
        delivery_plan = select_delivery_plan(
            settings=settings,
            country_code=active_country_code,
            channel=payload.delivery_channel,
            email=account.email,
            phone_number=account.phone_number,
        )
    except ValueError as exc:
        _record_auth_metric(
            request,
            flow="magic_link_request",
            outcome="delivery_unavailable",
            started_at=started_at,
        )
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    preview_code = issue_verification_code()
    challenge = repository.create_magic_link_challenge(
        actor_id=account.actor_id,
        purpose="magic_link_login",
        delivery_channel=delivery_plan.channel,
        delivery_target=delivery_plan.target,
        country_code=active_country_code,
        requested_role=role,
        verifier_hash=hash_verification_code(preview_code),
        provider=delivery_plan.provider,
        expires_at=utcnow() + timedelta(minutes=settings.auth_magic_link_ttl_minutes),
    )
    session.commit()
    _record_auth_metric(
        request,
        flow="magic_link_request",
        outcome="accepted",
        started_at=started_at,
    )
    return {
        "challenge_id": challenge.challenge_id,
        "delivery_channel": delivery_plan.channel,
        "provider": delivery_plan.provider,
        "fallback_provider": delivery_plan.fallback_provider,
        "masked_target": delivery_plan.masked_target,
        "expires_at": challenge.expires_at.isoformat(),
        "preview_code": preview_code if settings.auth_preview_codes_enabled() else None,
    }


@router.post("/login/magic-link/verify")
def verify_magic_link(
    payload: MagicLinkVerifyRequest,
    request: Request,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    started_at = perf_counter()
    repository = IdentityRepository(session)
    challenge = repository.get_magic_link_challenge(payload.challenge_id, purpose="magic_link_login")
    if challenge is None:
        _record_auth_metric(
            request,
            flow="magic_link_verify",
            outcome="magic_link_not_found",
            started_at=started_at,
        )
        raise HTTPException(status_code=404, detail="magic_link_not_found")
    if challenge.consumed_at is not None:
        _record_auth_metric(
            request,
            flow="magic_link_verify",
            outcome="magic_link_consumed",
            started_at=started_at,
        )
        raise HTTPException(status_code=409, detail="magic_link_consumed")
    if _coerce_utc(challenge.expires_at) <= utcnow():
        _record_auth_metric(
            request,
            flow="magic_link_verify",
            outcome="magic_link_expired",
            started_at=started_at,
        )
        raise HTTPException(status_code=410, detail="magic_link_expired")
    if not verify_code(payload.verification_code, challenge.verifier_hash):
        _record_auth_metric(
            request,
            flow="magic_link_verify",
            outcome="magic_link_invalid",
            started_at=started_at,
        )
        raise HTTPException(status_code=401, detail="magic_link_invalid")

    repository.mark_challenge_consumed(challenge)
    access_token, session_record = repository.issue_session(
        settings=settings,
        actor_id=challenge.actor_id,
        role=challenge.requested_role or _select_role_or_raise(
            repository,
            actor_id=challenge.actor_id,
            country_code=challenge.country_code,
            requested_role=None,
        ),
        country_code=challenge.country_code,
        issued_via="magic_link",
    )
    session.commit()
    _record_auth_metric(
        request,
        flow="magic_link_verify",
        outcome="accepted",
        started_at=started_at,
    )
    return _token_response(repository, access_token=access_token, session_record=session_record)


@router.get("/session")
def get_session_state(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth_context(request, settings, db_session)
    session_id = auth_context.session_id
    assert session_id is not None
    repository = IdentityRepository(db_session)
    session_record = repository.get_session_by_session_id(session_id)
    if session_record is None or session_record.revoked_at is not None:
        raise HTTPException(status_code=404, detail="session_not_found")
    if _coerce_utc(session_record.expires_at) <= utcnow():
        repository.revoke_session(session_id=session_record.session_id, reason="expired")
        db_session.commit()
        raise HTTPException(status_code=401, detail="session_expired")
    return repository.build_session_payload(session_record)


@router.post("/session/refresh")
def refresh_session(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth_context(request, settings, db_session)
    session_id = auth_context.session_id
    assert session_id is not None
    repository = IdentityRepository(db_session)
    try:
        access_token, session_record = repository.refresh_session(
            settings=settings,
            session_id=session_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    db_session.commit()
    return _token_response(repository, access_token=access_token, session_record=session_record)


@router.post("/session/logout")
def logout_session(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, str]:
    auth_context = _require_auth_context(request, settings, db_session)
    session_id = auth_context.session_id
    assert session_id is not None
    repository = IdentityRepository(db_session)
    repository.revoke_session(session_id=session_id, reason="logout")
    db_session.commit()
    return {"status": "logged_out"}


@router.post("/session/roles/switch")
def switch_session_role(
    payload: RoleSwitchRequest,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth_context(request, settings, db_session)
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")
    session_id = auth_context.session_id
    assert session_id is not None
    repository = IdentityRepository(db_session)
    role = _select_role_or_raise(
        repository,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code,
        requested_role=payload.target_role,
    )
    access_token, session_record = repository.issue_session(
        settings=settings,
        actor_id=auth_context.actor_subject,
        role=role,
        country_code=auth_context.country_code,
        issued_via="role_switch",
    )
    repository.revoke_session(session_id=session_id, reason="role_switched")
    db_session.commit()
    return _token_response(repository, access_token=access_token, session_record=session_record)


@router.get("/demo/personas")
def list_demo_personas(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    _require_demo_operator(request, settings, db_session)
    repository = IdentityRepository(db_session)
    items: list[dict[str, object]] = []
    for match in repository.search_sessions(query="demo:", country_code="GH", limit=50) + repository.search_sessions(
        query="demo:", country_code="NG", limit=50
    ):
        if not is_demo_actor_id(match.actor_id):
            continue
        persona = demo_persona_definition(match.actor_id)
        items.append(
            {
                "actor_id": match.actor_id,
                "display_name": match.display_name,
                "email": match.email,
                "role": match.role,
                "country_code": match.country_code,
                "organization_name": match.organization_name,
                "scenario_key": persona["scenario_key"] if persona else "demo-runtime",
                "scenario_label": persona["scenario_label"] if persona else "Shared demo runtime",
                "scenario_summary": persona["scenario_summary"] if persona else "Synthetic demo persona.",
                "operator": bool(persona["operator"]) if persona else False,
            }
        )
    items.sort(key=lambda item: (str(item["country_code"]), str(item["role"]), str(item["display_name"])))
    return {"items": items, "runbook": DEMO_RUNBOOK}


@router.post("/session/demo/switch")
def switch_demo_persona(
    payload: DemoPersonaSwitchRequest,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_demo_operator(request, settings, db_session)
    if not same_demo_boundary(auth_context.actor_subject, payload.target_actor_id):
        raise HTTPException(status_code=403, detail="demo_boundary_violation")
    session_id = auth_context.session_id
    assert session_id is not None

    repository = IdentityRepository(db_session)
    account = repository.get_account_by_actor(payload.target_actor_id)
    if account is None or not is_demo_actor_id(account.actor_id):
        raise HTTPException(status_code=404, detail="demo_persona_not_found")

    role = _select_role_or_raise(
        repository,
        actor_id=account.actor_id,
        country_code=account.home_country_code,
        requested_role=payload.target_role,
    )
    access_token, session_record = repository.issue_session(
        settings=settings,
        actor_id=account.actor_id,
        role=role,
        country_code=account.home_country_code,
        issued_via="demo_persona_switch",
    )
    repository.revoke_session(session_id=session_id, reason="demo_persona_switched")
    db_session.commit()
    return _token_response(repository, access_token=access_token, session_record=session_record)


@router.get("/actors/search")
def search_actors(
    request: Request,
    q: str = Query(min_length=2, max_length=120),
    limit: int = Query(default=8, ge=1, le=20),
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    if auth_context.country_code is None:
        raise HTTPException(status_code=403, detail="country_scope_missing")

    repository = IdentityRepository(db_session)
    matches = repository.search_sessions(
        query=q,
        country_code=auth_context.country_code,
        exclude_actor_id=auth_context.actor_subject,
        limit=limit,
    )
    matches = [
        item for item in matches if same_demo_boundary(auth_context.actor_subject, item.actor_id)
    ]
    return {
        "items": [
            {
                "actor_id": item.actor_id,
                "display_name": item.display_name,
                "email": item.email,
                "role": item.role,
                "country_code": item.country_code,
                "organization_name": item.organization_name,
            }
            for item in matches
        ]
    }


@router.post("/consent")
def grant_consent(
    payload: ConsentRequest,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth_context(request, settings, db_session)
    repository = IdentityRepository(db_session)
    session_record = repository.grant_consent(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
        policy_version=payload.policy_version,
        scope_ids=payload.scope_ids,
        captured_at=payload.captured_at,
        session_id=auth_context.session_id,
    )
    db_session.commit()
    return repository.build_session_payload(session_record)


@router.post("/consent/revoke")
def revoke_consent(
    payload: RevokeConsentRequest,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = _require_auth_context(request, settings, db_session)
    repository = IdentityRepository(db_session)
    session_record = repository.revoke_consent(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
        session_id=auth_context.session_id,
    )
    db_session.commit()
    return {"reason": payload.reason, "session": repository.build_session_payload(session_record)}


@router.post("/recovery/password/request")
def request_password_recovery(
    payload: PasswordRecoveryRequest,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    repository = IdentityRepository(session)
    country_code = _normalize_country_code(payload.country_code)
    account = repository.resolve_account(
        _normalize_identifier(payload.identifier, country_code=country_code)
    )
    if account is None:
        raise HTTPException(status_code=404, detail="identity_account_not_found")

    active_country_code = country_code or account.home_country_code
    try:
        delivery_plan = select_delivery_plan(
            settings=settings,
            country_code=active_country_code,
            channel=payload.delivery_channel,
            email=account.email,
            phone_number=account.phone_number,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    preview_code = issue_verification_code()
    challenge = repository.create_magic_link_challenge(
        actor_id=account.actor_id,
        purpose="password_recovery",
        delivery_channel=delivery_plan.channel,
        delivery_target=delivery_plan.target,
        country_code=active_country_code,
        requested_role=None,
        verifier_hash=hash_verification_code(preview_code),
        provider=delivery_plan.provider,
        expires_at=utcnow() + timedelta(minutes=settings.auth_password_recovery_ttl_minutes),
    )
    session.commit()
    return {
        "challenge_id": challenge.challenge_id,
        "delivery_channel": delivery_plan.channel,
        "provider": delivery_plan.provider,
        "fallback_provider": delivery_plan.fallback_provider,
        "masked_target": delivery_plan.masked_target,
        "expires_at": challenge.expires_at.isoformat(),
        "preview_code": preview_code if settings.auth_preview_codes_enabled() else None,
    }


@router.post("/recovery/password/confirm")
def confirm_password_recovery(
    payload: PasswordRecoveryConfirmRequest,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    repository = IdentityRepository(session)
    challenge = repository.get_magic_link_challenge(payload.challenge_id, purpose="password_recovery")
    if challenge is None:
        raise HTTPException(status_code=404, detail="password_recovery_not_found")
    if challenge.consumed_at is not None:
        raise HTTPException(status_code=409, detail="password_recovery_consumed")
    if _coerce_utc(challenge.expires_at) <= utcnow():
        raise HTTPException(status_code=410, detail="password_recovery_expired")
    if not verify_code(payload.verification_code, challenge.verifier_hash):
        raise HTTPException(status_code=401, detail="password_recovery_invalid")

    repository.mark_challenge_consumed(challenge)
    repository.set_password_credential(
        actor_id=challenge.actor_id,
        password_hash=build_password_hash(
            payload.new_password,
            iterations=settings.auth_password_hash_iterations,
        ),
    )
    repository.revoke_actor_sessions(actor_id=challenge.actor_id, reason="password_recovered")
    role = _select_role_or_raise(
        repository,
        actor_id=challenge.actor_id,
        country_code=challenge.country_code,
        requested_role=None,
    )
    access_token, session_record = repository.issue_session(
        settings=settings,
        actor_id=challenge.actor_id,
        role=role,
        country_code=challenge.country_code,
        issued_via="password_recovery",
    )
    session.commit()
    return _token_response(repository, access_token=access_token, session_record=session_record)
