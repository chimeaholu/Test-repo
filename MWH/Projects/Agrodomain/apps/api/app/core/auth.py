from dataclasses import dataclass
from datetime import UTC, datetime
from time import perf_counter

from fastapi import Request
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.demo import is_demo_actor_id, is_demo_operator_actor_id
from app.core.identity_security import hash_access_token, utcnow
from app.db.repositories.identity import IdentityRepository


@dataclass(frozen=True)
class AuthContext:
    actor_subject: str
    token: str | None
    session_id: str | None = None
    country_code: str | None = None
    consent_granted: bool = False
    role: str | None = None
    is_demo_tenant: bool = False
    demo_operator: bool = False


def _coerce_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def authenticate_request(
    request: Request, settings: Settings, session: Session | None = None
) -> AuthContext | None:
    started_at = perf_counter()
    telemetry = getattr(request.app.state, "telemetry", None)
    flow = "anonymous"
    outcome = "missing_bearer"
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        auth_context = None
    else:
        token = authorization.removeprefix("Bearer ").strip()
        actor_subject = settings.api_tokens.get(token)
        if actor_subject:
            flow = "api_token"
            outcome = "authenticated"
            if session is None:
                auth_context = AuthContext(actor_subject=actor_subject, token=token)
            else:
                identity_repository = IdentityRepository(session)
                session_record = identity_repository.get_session_by_actor(actor_subject)
                if session_record is None:
                    auth_context = AuthContext(actor_subject=actor_subject, token=token)
                else:
                    auth_context = AuthContext(
                        actor_subject=actor_subject,
                        token=token,
                        session_id=session_record.session_id,
                        country_code=session_record.country_code,
                        consent_granted=session_record.consent_state == "consent_granted",
                        role=session_record.role,
                        is_demo_tenant=is_demo_actor_id(session_record.actor_id),
                        demo_operator=is_demo_operator_actor_id(session_record.actor_id),
                    )
        elif session is None:
            flow = "bearer_token"
            outcome = "invalid_token"
            auth_context = None
        else:
            flow = "session_token"
            identity_repository = IdentityRepository(session)
            session_record = identity_repository.get_session_by_token_hash(hash_access_token(token))
            if session_record is None:
                outcome = "invalid_token"
                auth_context = None
            elif session_record.revoked_at is not None or _coerce_utc(session_record.expires_at) <= utcnow():
                outcome = "expired_or_revoked"
                auth_context = None
            else:
                outcome = "authenticated"
                auth_context = AuthContext(
                    actor_subject=session_record.actor_id,
                    token=token,
                    session_id=session_record.session_id,
                    country_code=session_record.country_code,
                    consent_granted=session_record.consent_state == "consent_granted",
                    role=session_record.role,
                    is_demo_tenant=is_demo_actor_id(session_record.actor_id),
                    demo_operator=is_demo_operator_actor_id(session_record.actor_id),
                )
    if telemetry is not None:
        telemetry.record_auth_flow(
            flow=flow,
            outcome=outcome,
            duration_ms=(perf_counter() - started_at) * 1000,
            correlation_id=getattr(request.state, "correlation_id", None),
            request_id=getattr(request.state, "request_id", None),
            trace_id=getattr(request.state, "trace_id", None),
            span_id=getattr(request.state, "span_id", None),
        )
    return auth_context
