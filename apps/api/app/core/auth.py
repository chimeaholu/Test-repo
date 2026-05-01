from dataclasses import dataclass

from fastapi import Request
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.repositories.identity import IdentityRepository


@dataclass(frozen=True)
class AuthContext:
    actor_subject: str
    token: str
    country_code: str | None = None
    consent_granted: bool = False
    role: str | None = None


def authenticate_request(
    request: Request, settings: Settings, session: Session | None = None
) -> AuthContext | None:
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    actor_subject = settings.api_tokens.get(token)
    if actor_subject:
        if session is None:
            return AuthContext(actor_subject=actor_subject, token=token)
        identity_repository = IdentityRepository(session)
        session_record = identity_repository.get_session_by_actor(actor_subject)
        if session_record is None:
            return AuthContext(actor_subject=actor_subject, token=token)
        return AuthContext(
            actor_subject=actor_subject,
            token=token,
            country_code=session_record.country_code,
            consent_granted=session_record.consent_state == "consent_granted",
            role=session_record.role,
        )

    if session is None:
        return None

    identity_repository = IdentityRepository(session)
    session_record = identity_repository.get_session_by_token(token)
    if session_record is None:
        return None
    return AuthContext(
        actor_subject=session_record.actor_id,
        token=token,
        country_code=session_record.country_code,
        consent_granted=session_record.consent_state == "consent_granted",
        role=session_record.role,
    )
