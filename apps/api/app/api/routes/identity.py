from __future__ import annotations

from datetime import datetime
from re import sub
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import authenticate_request
from app.core.config import Settings
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


class SignInRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)
    role: SelfServiceRole
    country_code: str = Field(min_length=2, max_length=2)


class ConsentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    policy_version: str = Field(min_length=1, max_length=32)
    scope_ids: list[str] = Field(min_length=1)
    captured_at: datetime


class RevokeConsentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(min_length=8, max_length=255)


def _actor_id(role: str, country_code: str, email: str) -> str:
    local_part = email.split("@", 1)[0].lower()
    normalized = sub(r"[^a-z0-9]+", "-", local_part).strip("-") or "user"
    return f"actor-{role[:16]}-{country_code.lower()}-{normalized[:24]}"


@router.post("/session")
def sign_in(
    payload: SignInRequest,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    if not settings.insecure_demo_auth_enabled():
        raise HTTPException(
            status_code=403,
            detail="demo_auth_disabled",
        )
    repository = IdentityRepository(session)
    actor_id = _actor_id(payload.role, payload.country_code.upper(), payload.email)
    repository.ensure_membership(
        actor_id=actor_id,
        role=payload.role,
        country_code=payload.country_code.upper(),
    )
    session_record = repository.create_or_rotate_session(
        actor_id=actor_id,
        display_name=payload.display_name,
        email=payload.email,
        role=payload.role,
        country_code=payload.country_code.upper(),
    )
    session.commit()
    return {
        "access_token": session_record.session_token,
        "session": repository.build_session_payload(session_record),
    }


@router.get("/session")
def get_session_state(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    repository = IdentityRepository(db_session)
    session_record = repository.get_session_by_actor(auth_context.actor_subject)
    if session_record is None:
        raise HTTPException(status_code=404, detail="session_not_found")
    return repository.build_session_payload(session_record)


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
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    repository = IdentityRepository(db_session)
    session_record = repository.grant_consent(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
        policy_version=payload.policy_version,
        scope_ids=payload.scope_ids,
        captured_at=payload.captured_at,
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
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    repository = IdentityRepository(db_session)
    session_record = repository.revoke_consent(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    db_session.commit()
    return {"reason": payload.reason, "session": repository.build_session_payload(session_record)}
