from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from app.db.models.advisory import AdvisoryRequestRecord, AdvisorySourceDocument, ReviewerDecisionRecord
from app.db.repositories.advisory import AdvisoryRepository, RankedSource
from app.services.commands.errors import CommandRejectedError

AUTO_REVIEWER_ACTOR_ID = "system:reviewer"
AUTO_REVIEWER_ROLE = "admin"
MANUAL_REVIEWER_ROLES = {"admin", "advisor", "compliance"}
POLICY_SENSITIVE_KEYWORDS = {
    "chemical",
    "diagnosis",
    "diagnose",
    "disease",
    "dosage",
    "fungicide",
    "herbicide",
    "insurance",
    "loan",
    "pesticide",
    "spray",
    "toxic",
}


def _string_list(value: object | None) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


@dataclass(slots=True)
class AdvisoryResult:
    advisory_request: AdvisoryRequestRecord
    citations: list[dict[str, object]]
    reviewer_decision: ReviewerDecisionRecord


class AdvisoryRuntime:
    def __init__(self, repository: AdvisoryRepository) -> None:
        self.repository = repository

    def submit_request(
        self,
        *,
        request_id: str,
        actor_id: str,
        country_code: str,
        locale: str,
        channel: str,
        correlation_id: str,
        topic: str,
        question_text: str,
        transcript_entries: list[dict[str, object]],
        policy_context: dict[str, object],
    ) -> AdvisoryResult:
        existing_request = self.repository.get_request_by_request_id(request_id=request_id)
        if existing_request is not None:
            existing_decision = self.repository.latest_reviewer_decision(
                advisory_request_id=existing_request.advisory_request_id
            )
            if existing_decision is None:
                raise CommandRejectedError(
                    status_code=409,
                    error_code="reviewer_decision_missing",
                    reason_code="reviewer_decision_missing",
                    payload={"advisory_request_id": existing_request.advisory_request_id},
                )
            return AdvisoryResult(
                advisory_request=existing_request,
                citations=[
                    self._citation_payload(doc)
                    for doc in self.repository.list_sources(source_ids=existing_request.source_ids)
                ],
                reviewer_decision=existing_decision,
            )

        sensitive_topics = [item.lower() for item in _string_list(policy_context.get("sensitive_topics"))]
        ranked_sources = self.repository.search_vetted_sources(
            country_code=country_code,
            locale=locale,
            topic=topic,
            question_text=question_text,
            sensitive_topics=sensitive_topics,
        )
        citations = [self._citation_payload(item.document) for item in ranked_sources]
        source_ids = [item.document.source_id for item in ranked_sources]
        confidence_score = _confidence_score(ranked_sources)
        confidence_band = _confidence_band(confidence_score)
        policy_sensitive = _is_policy_sensitive(
            topic=topic,
            question_text=question_text,
            sensitive_topics=sensitive_topics,
            sources=[item.document for item in ranked_sources],
        )
        reviewer_outcome, reason_code = _review_outcome(
            confidence_score=confidence_score,
            policy_sensitive=policy_sensitive,
            source_count=len(ranked_sources),
        )
        response_text = _build_response_text(
            topic=topic,
            question_text=question_text,
            sources=[item.document for item in ranked_sources],
            reviewer_outcome=reviewer_outcome,
        )
        advisory_request = self.repository.create_request(
            advisory_request_id=f"advreq-{uuid4().hex[:12]}",
            advisory_conversation_id=f"advconv-{actor_id.replace(':', '-')}",
            request_id=request_id,
            actor_id=actor_id,
            country_code=country_code,
            locale=locale,
            channel=channel,
            topic=topic,
            question_text=question_text,
            response_text=response_text,
            status=_status_for_outcome(reviewer_outcome),
            confidence_band=confidence_band,
            confidence_score=confidence_score,
            grounded=bool(source_ids),
            source_ids=source_ids,
            transcript_entries=_ensure_transcript(transcript_entries, question_text, channel),
            policy_context=policy_context,
            model_name="agrodomain-retrieval-runtime",
            model_version="n4-a1",
            correlation_id=correlation_id,
            delivered_at=datetime.now(tz=UTC) if reviewer_outcome == "approve" else None,
        )
        reviewer_decision = self.repository.create_reviewer_decision(
            decision_id=f"revd-{uuid4().hex[:12]}",
            advisory_request_id=advisory_request.advisory_request_id,
            request_id=request_id,
            actor_id=AUTO_REVIEWER_ACTOR_ID,
            actor_role=AUTO_REVIEWER_ROLE,
            outcome=reviewer_outcome,
            reason_code=reason_code,
            note=_note_for_outcome(reviewer_outcome, confidence_band),
            transcript_link=f"audit://{advisory_request.advisory_request_id}/reviewer/auto",
            policy_context={
                "matched_policy": "advisory.default_delivery",
                "confidence_threshold": 0.75,
                "policy_sensitive": policy_sensitive,
            },
        )
        return AdvisoryResult(
            advisory_request=advisory_request,
            citations=citations,
            reviewer_decision=reviewer_decision,
        )

    def apply_reviewer_decision(
        self,
        *,
        request_id: str,
        advisory_request_id: str,
        actor_id: str,
        actor_role: str | None,
        outcome: str,
        reason_code: str,
        note: str | None,
        transcript_link: str | None,
    ) -> AdvisoryResult:
        if actor_role not in MANUAL_REVIEWER_ROLES:
            raise CommandRejectedError(
                status_code=403,
                error_code="policy_denied",
                reason_code="reviewer_role_forbidden",
                payload={"actor_role": actor_role},
            )
        advisory_request = self.repository.get_request(advisory_request_id=advisory_request_id)
        if advisory_request is None:
            raise CommandRejectedError(
                status_code=404,
                error_code="advisory_request_not_found",
                reason_code="advisory_request_not_found",
                payload={"advisory_request_id": advisory_request_id},
            )
        if not advisory_request.source_ids and outcome == "approve":
            raise CommandRejectedError(
                status_code=422,
                error_code="uncited_grounding_forbidden",
                reason_code="uncited_grounding_forbidden",
                payload={"advisory_request_id": advisory_request_id},
            )
        reviewer_decision = self.repository.create_reviewer_decision(
            decision_id=f"revd-{uuid4().hex[:12]}",
            advisory_request_id=advisory_request_id,
            request_id=request_id,
            actor_id=actor_id,
            actor_role=actor_role,
            outcome=outcome,
            reason_code=reason_code,
            note=note,
            transcript_link=transcript_link,
            policy_context={
                "matched_policy": "advisory.manual_review",
                "confidence_threshold": 0.75,
                "policy_sensitive": _policy_sensitive_from_context(advisory_request.policy_context),
            },
        )
        updated = self.repository.update_request_status(
            advisory_request=advisory_request,
            status=_status_for_outcome(outcome),
            delivered_at=datetime.now(tz=UTC) if outcome == "approve" else None,
            response_text=(
                f"{advisory_request.response_text}\n\nReviewer note: {note}"
                if outcome == "revise" and note
                else None
            ),
        )
        return AdvisoryResult(
            advisory_request=updated,
            citations=[
                self._citation_payload(doc)
                for doc in self.repository.list_sources(source_ids=updated.source_ids)
            ],
            reviewer_decision=reviewer_decision,
        )

    @staticmethod
    def _citation_payload(document: AdvisorySourceDocument) -> dict[str, object]:
        return {
            "source_id": document.source_id,
            "title": document.title,
            "source_type": document.source_type,
            "locale": document.locale,
            "country_code": document.country_code,
            "citation_url": document.citation_url,
            "published_at": document.published_at.isoformat().replace("+00:00", "Z"),
            "excerpt": document.summary,
            "method_tag": document.method_tag,
        }


def _confidence_score(ranked_sources: list[RankedSource]) -> float:
    if not ranked_sources:
        return 0.2
    top = ranked_sources[0].score
    coverage_bonus = min(0.2, 0.05 * len(ranked_sources))
    return round(min(0.97, 0.35 + top * 0.5 + coverage_bonus), 2)


def _confidence_band(score: float) -> str:
    if score >= 0.8:
        return "high"
    if score >= 0.55:
        return "medium"
    return "low"


def _is_policy_sensitive(
    *,
    topic: str,
    question_text: str,
    sensitive_topics: list[str],
    sources: list[AdvisorySourceDocument],
) -> bool:
    haystack = " ".join([topic, question_text, " ".join(sensitive_topics)]).lower()
    if any(keyword in haystack for keyword in POLICY_SENSITIVE_KEYWORDS):
        return True
    return False


def _review_outcome(*, confidence_score: float, policy_sensitive: bool, source_count: int) -> tuple[str, str]:
    if source_count == 0 or confidence_score < 0.55:
        return "hitl_required", "low_confidence_sources"
    if policy_sensitive:
        return "hitl_required", "policy_sensitive_guidance"
    if confidence_score < 0.75:
        return "revise", "revision_needed_for_clarity"
    return "approve", "grounded_response_ready"


def _status_for_outcome(outcome: str) -> str:
    return {
        "approve": "delivered",
        "revise": "revised",
        "block": "blocked",
        "hitl_required": "hitl_required",
    }[outcome]


def _build_response_text(
    *,
    topic: str,
    question_text: str,
    sources: list[AdvisorySourceDocument],
    reviewer_outcome: str,
) -> str:
    if not sources:
        return (
            "I could not assemble a grounded advisory response from the vetted corpus for this request. "
            "The request has been escalated for human review before any advice is delivered."
        )
    source_summaries = " ".join(source.summary for source in sources[:2])
    if reviewer_outcome == "approve":
        return f"Based on vetted sources for {topic}, {source_summaries}"
    if reviewer_outcome == "revise":
        return (
            f"Preliminary grounded guidance for {topic}: {source_summaries} "
            "A reviewer should tighten the wording before delivery."
        )
    return (
        f"A grounded draft was prepared for the question '{question_text}', but reviewer policy prevents delivery "
        "until a human reviewer completes the escalation."
    )


def _ensure_transcript(
    transcript_entries: list[dict[str, object]], question_text: str, channel: str
) -> list[dict[str, object]]:
    if transcript_entries:
        return transcript_entries
    return [
        {
            "speaker": "user",
            "message": question_text,
            "captured_at": datetime.now(tz=UTC).isoformat().replace("+00:00", "Z"),
            "channel": channel,
        }
    ]


def _note_for_outcome(outcome: str, confidence_band: str) -> str:
    return {
        "approve": f"Auto-approved with {confidence_band} confidence and complete citation coverage.",
        "revise": f"Auto-routed for revision because confidence is {confidence_band}.",
        "block": "Auto-blocked by reviewer policy.",
        "hitl_required": "Auto-escalated because reviewer policy requires human review.",
    }[outcome]


def _policy_sensitive_from_context(policy_context: dict[str, object]) -> bool:
    topics = [item.lower() for item in _string_list(policy_context.get("sensitive_topics"))]
    return any(item in POLICY_SENSITIVE_KEYWORDS for item in topics)
