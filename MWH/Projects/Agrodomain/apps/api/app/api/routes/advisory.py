from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import authenticate_request
from app.core.config import Settings
from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.advisory import AdvisoryRequestRecord, ReviewerDecisionRecord
from app.db.repositories.advisory import AdvisoryRepository

router = APIRouter(prefix="/api/v1/advisory", tags=["advisory"])


def _can_read_request(
    *, advisory_request: AdvisoryRequestRecord, actor_id: str, actor_role: str | None
) -> bool:
    return advisory_request.actor_id == actor_id or actor_role in {"admin", "advisor", "compliance"}


def _reviewer_payload(decision: ReviewerDecisionRecord) -> dict[str, object]:
    return {
        "schema_version": get_envelope_schema_version(),
        "advisory_request_id": decision.advisory_request_id,
        "decision_id": decision.decision_id,
        "actor_id": decision.actor_id,
        "actor_role": decision.actor_role,
        "outcome": decision.outcome,
        "reason_code": decision.reason_code,
        "note": decision.note,
        "transcript_link": decision.transcript_link,
        "policy_context": decision.policy_context,
        "created_at": decision.created_at.isoformat(),
    }


def _request_payload(
    advisory_request: AdvisoryRequestRecord,
    reviewer_decision: ReviewerDecisionRecord,
    repository: AdvisoryRepository,
) -> dict[str, object]:
    citations = []
    for doc in repository.list_sources(source_ids=advisory_request.source_ids):
        citations.append(
            {
                "source_id": doc.source_id,
                "title": doc.title,
                "source_type": doc.source_type,
                "locale": doc.locale,
                "country_code": doc.country_code,
                "citation_url": doc.citation_url,
                "published_at": doc.published_at.isoformat(),
                "excerpt": doc.summary,
                "method_tag": doc.method_tag,
            }
        )
    return {
        "schema_version": get_envelope_schema_version(),
        "advisory_request_id": advisory_request.advisory_request_id,
        "advisory_conversation_id": advisory_request.advisory_conversation_id,
        "actor_id": advisory_request.actor_id,
        "country_code": advisory_request.country_code,
        "locale": advisory_request.locale,
        "topic": advisory_request.topic,
        "question_text": advisory_request.question_text,
        "response_text": advisory_request.response_text,
        "status": advisory_request.status,
        "confidence_band": advisory_request.confidence_band,
        "confidence_score": advisory_request.confidence_score,
        "grounded": advisory_request.grounded,
        "citations": citations,
        "transcript_entries": advisory_request.transcript_entries,
        "reviewer_decision": _reviewer_payload(reviewer_decision),
        "source_ids": advisory_request.source_ids,
        "model_name": advisory_request.model_name,
        "model_version": advisory_request.model_version,
        "correlation_id": advisory_request.correlation_id,
        "request_id": advisory_request.request_id,
        "delivered_at": advisory_request.delivered_at.isoformat() if advisory_request.delivered_at else None,
        "created_at": advisory_request.created_at.isoformat(),
    }


def _list_visible_requests(
    *,
    repository: AdvisoryRepository,
    actor_id: str,
    actor_role: str | None,
    country_code: str,
    conversation_id: str | None,
    locale: str | None,
) -> list[AdvisoryRequestRecord]:
    if actor_role in {"admin", "advisor", "compliance"}:
        advisory_requests = repository.list_requests()
    else:
        advisory_requests = repository.list_requests_for_actor(
            actor_id=actor_id,
            country_code=country_code,
            conversation_id=conversation_id,
        )

    visible_requests = advisory_requests
    if conversation_id:
        visible_requests = [
            item for item in visible_requests if item.advisory_conversation_id == conversation_id
        ]
    if locale:
        visible_requests = [item for item in visible_requests if item.locale == locale]
    return visible_requests


def _build_request_collection(
    *,
    repository: AdvisoryRepository,
    actor_id: str,
    actor_role: str | None,
    country_code: str,
    conversation_id: str | None,
    locale: str | None,
) -> dict[str, object]:
    advisory_requests = _list_visible_requests(
        repository=repository,
        actor_id=actor_id,
        actor_role=actor_role,
        country_code=country_code,
        conversation_id=conversation_id,
        locale=locale,
    )
    items = []
    for item in advisory_requests:
        decision = repository.latest_reviewer_decision(advisory_request_id=item.advisory_request_id)
        if decision is None:
            continue
        if not _can_read_request(
            advisory_request=item,
            actor_id=actor_id,
            actor_role=actor_role,
        ):
            continue
        items.append(_request_payload(item, decision, repository))
    return {"schema_version": get_envelope_schema_version(), "items": items}


@router.get("/requests")
def list_advisory_requests(
    request: Request,
    conversation_id: str | None = Query(default=None),
    locale: str | None = Query(default=None),
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    repository = AdvisoryRepository(db_session)
    return _build_request_collection(
        repository=repository,
        actor_id=auth_context.actor_subject,
        actor_role=auth_context.role,
        country_code=auth_context.country_code or "GH",
        conversation_id=conversation_id,
        locale=locale,
    )


@router.get("/conversations")
def list_advisory_conversations(
    request: Request,
    conversation_id: str | None = Query(default=None),
    locale: str | None = Query(default=None),
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    repository = AdvisoryRepository(db_session)
    return _build_request_collection(
        repository=repository,
        actor_id=auth_context.actor_subject,
        actor_role=auth_context.role,
        country_code=auth_context.country_code or "GH",
        conversation_id=conversation_id,
        locale=locale,
    )


@router.get("/requests/{advisory_request_id}")
def get_advisory_request(
    advisory_request_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    repository = AdvisoryRepository(db_session)
    advisory_request = repository.get_request(advisory_request_id=advisory_request_id)
    if advisory_request is None:
        raise HTTPException(status_code=404, detail="advisory_request_not_found")
    if not _can_read_request(
        advisory_request=advisory_request,
        actor_id=auth_context.actor_subject,
        actor_role=auth_context.role,
    ):
        raise HTTPException(status_code=403, detail="forbidden")
    reviewer_decision = repository.latest_reviewer_decision(advisory_request_id=advisory_request_id)
    if reviewer_decision is None:
        raise HTTPException(status_code=404, detail="reviewer_decision_not_found")
    return _request_payload(advisory_request, reviewer_decision, repository)
