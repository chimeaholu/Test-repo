from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.advisory import (
    AdvisoryRequestRecord,
    AdvisorySourceDocument,
    ReviewerDecisionRecord,
)


@dataclass(slots=True)
class RankedSource:
    document: AdvisorySourceDocument
    score: float


class AdvisoryRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def upsert_source_document(
        self,
        *,
        source_id: str,
        country_code: str,
        locale: str,
        source_type: str,
        title: str,
        summary: str,
        body_markdown: str,
        citation_url: str | None,
        method_tag: str,
        risk_tags: list[str],
        source_metadata: dict[str, object],
        priority: int,
        vetted: bool,
        published_at: datetime,
    ) -> AdvisorySourceDocument:
        statement = select(AdvisorySourceDocument).where(
            AdvisorySourceDocument.source_id == source_id
        )
        record = self.session.execute(statement).scalar_one_or_none()
        if record is None:
            record = AdvisorySourceDocument(
                source_id=source_id,
                country_code=country_code,
                locale=locale,
                source_type=source_type,
                title=title,
                summary=summary,
                body_markdown=body_markdown,
                citation_url=citation_url,
                method_tag=method_tag,
                risk_tags=risk_tags,
                source_metadata=source_metadata,
                priority=priority,
                vetted=vetted,
                published_at=published_at,
            )
            self.session.add(record)
        else:
            record.country_code = country_code
            record.locale = locale
            record.source_type = source_type
            record.title = title
            record.summary = summary
            record.body_markdown = body_markdown
            record.citation_url = citation_url
            record.method_tag = method_tag
            record.risk_tags = risk_tags
            record.source_metadata = source_metadata
            record.priority = priority
            record.vetted = vetted
            record.published_at = published_at
        self.session.flush()
        return record

    def search_vetted_sources(
        self,
        *,
        country_code: str,
        locale: str,
        topic: str,
        question_text: str,
        sensitive_topics: Iterable[str],
        limit: int = 3,
    ) -> list[RankedSource]:
        statement = select(AdvisorySourceDocument).where(
            AdvisorySourceDocument.country_code == country_code,
            AdvisorySourceDocument.vetted.is_(True),
        )
        docs = list(self.session.execute(statement).scalars().all())
        tokens = _tokenize(f"{topic} {question_text} {' '.join(sensitive_topics)}")
        ranked: list[RankedSource] = []
        for doc in docs:
            haystack = _tokenize(
                " ".join([doc.title, doc.summary, doc.body_markdown, " ".join(doc.risk_tags)])
            )
            overlap_tokens = tokens & haystack
            overlap = len(overlap_tokens) / len(tokens) if tokens else 0.0
            locale_bonus = 0.1 if doc.locale == locale else 0.0
            score = min(0.99, overlap + locale_bonus + min(doc.priority, 5) * 0.05)
            if len(overlap_tokens) >= 2:
                ranked.append(RankedSource(document=doc, score=score))
        ranked.sort(
            key=lambda item: (item.score, item.document.priority, item.document.published_at),
            reverse=True,
        )
        return ranked[:limit]

    def create_request(
        self,
        *,
        advisory_request_id: str,
        advisory_conversation_id: str,
        request_id: str,
        actor_id: str,
        country_code: str,
        locale: str,
        channel: str,
        topic: str,
        question_text: str,
        response_text: str,
        status: str,
        confidence_band: str,
        confidence_score: float,
        grounded: bool,
        source_ids: list[str],
        transcript_entries: list[dict[str, object]],
        policy_context: dict[str, object],
        model_name: str,
        model_version: str,
        correlation_id: str,
        delivered_at: datetime | None,
    ) -> AdvisoryRequestRecord:
        record = AdvisoryRequestRecord(
            advisory_request_id=advisory_request_id,
            advisory_conversation_id=advisory_conversation_id,
            request_id=request_id,
            actor_id=actor_id,
            country_code=country_code,
            locale=locale,
            channel=channel,
            topic=topic,
            question_text=question_text,
            response_text=response_text,
            status=status,
            confidence_band=confidence_band,
            confidence_score=confidence_score,
            grounded=grounded,
            source_ids=source_ids,
            transcript_entries=transcript_entries,
            policy_context=policy_context,
            model_name=model_name,
            model_version=model_version,
            correlation_id=correlation_id,
            delivered_at=delivered_at,
        )
        self.session.add(record)
        self.session.flush()
        return record

    def get_request(self, *, advisory_request_id: str) -> AdvisoryRequestRecord | None:
        statement = select(AdvisoryRequestRecord).where(
            AdvisoryRequestRecord.advisory_request_id == advisory_request_id
        )
        return self.session.execute(statement).scalar_one_or_none()

    def get_request_by_request_id(self, *, request_id: str) -> AdvisoryRequestRecord | None:
        statement = select(AdvisoryRequestRecord).where(AdvisoryRequestRecord.request_id == request_id)
        return self.session.execute(statement).scalar_one_or_none()

    def list_requests_for_actor(
        self, *, actor_id: str, country_code: str, conversation_id: str | None = None
    ) -> list[AdvisoryRequestRecord]:
        statement = (
            select(AdvisoryRequestRecord)
            .where(
                AdvisoryRequestRecord.actor_id == actor_id,
                AdvisoryRequestRecord.country_code == country_code,
            )
            .order_by(AdvisoryRequestRecord.created_at.desc(), AdvisoryRequestRecord.id.desc())
        )
        if conversation_id:
            statement = statement.where(
                AdvisoryRequestRecord.advisory_conversation_id == conversation_id
            )
        return list(self.session.execute(statement).scalars().all())

    def list_requests(self) -> list[AdvisoryRequestRecord]:
        statement = select(AdvisoryRequestRecord).order_by(
            AdvisoryRequestRecord.created_at.desc(), AdvisoryRequestRecord.id.desc()
        )
        return list(self.session.execute(statement).scalars().all())

    def create_reviewer_decision(
        self,
        *,
        decision_id: str,
        advisory_request_id: str,
        request_id: str,
        actor_id: str,
        actor_role: str,
        outcome: str,
        reason_code: str,
        note: str | None,
        transcript_link: str | None,
        policy_context: dict[str, object],
    ) -> ReviewerDecisionRecord:
        decision = ReviewerDecisionRecord(
            decision_id=decision_id,
            advisory_request_id=advisory_request_id,
            request_id=request_id,
            actor_id=actor_id,
            actor_role=actor_role,
            outcome=outcome,
            reason_code=reason_code,
            note=note,
            transcript_link=transcript_link,
            policy_context=policy_context,
        )
        self.session.add(decision)
        self.session.flush()
        return decision

    def latest_reviewer_decision(
        self, *, advisory_request_id: str
    ) -> ReviewerDecisionRecord | None:
        statement = (
            select(ReviewerDecisionRecord)
            .where(ReviewerDecisionRecord.advisory_request_id == advisory_request_id)
            .order_by(ReviewerDecisionRecord.created_at.desc(), ReviewerDecisionRecord.id.desc())
        )
        return self.session.execute(statement).scalars().first()

    def update_request_status(
        self,
        *,
        advisory_request: AdvisoryRequestRecord,
        status: str,
        delivered_at: datetime | None,
        response_text: str | None = None,
    ) -> AdvisoryRequestRecord:
        advisory_request.status = status
        advisory_request.delivered_at = delivered_at
        if response_text is not None:
            advisory_request.response_text = response_text
        self.session.add(advisory_request)
        self.session.flush()
        return advisory_request

    def list_sources(self, *, source_ids: Iterable[str]) -> list[AdvisorySourceDocument]:
        ids = list(source_ids)
        if not ids:
            return []
        statement = select(AdvisorySourceDocument).where(AdvisorySourceDocument.source_id.in_(ids))
        docs = list(self.session.execute(statement).scalars().all())
        by_id = {doc.source_id: doc for doc in docs}
        return [by_id[source_id] for source_id in ids if source_id in by_id]


def _tokenize(value: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9]+", value.lower()) if len(token) > 2}
