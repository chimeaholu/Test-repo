from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import WorkflowBase


class AdvisorySourceDocument(WorkflowBase):
    __tablename__ = "advisory_source_documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    locale: Mapped[str] = mapped_column(String(16), nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    summary: Mapped[str] = mapped_column(Text(), nullable=False)
    body_markdown: Mapped[str] = mapped_column(Text(), nullable=False)
    citation_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    method_tag: Mapped[str] = mapped_column(String(64), nullable=False)
    risk_tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    source_metadata: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    priority: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    vetted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AdvisoryRequestRecord(WorkflowBase):
    __tablename__ = "advisory_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    advisory_request_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    advisory_conversation_id: Mapped[str] = mapped_column(String(64), nullable=False)
    request_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    locale: Mapped[str] = mapped_column(String(16), nullable=False)
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    topic: Mapped[str] = mapped_column(String(120), nullable=False)
    question_text: Mapped[str] = mapped_column(Text(), nullable=False)
    response_text: Mapped[str] = mapped_column(Text(), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    confidence_band: Mapped[str] = mapped_column(String(16), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float(), nullable=False)
    grounded: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    source_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    transcript_entries: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False, default=list)
    policy_context: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    model_name: Mapped[str] = mapped_column(String(80), nullable=False)
    model_version: Mapped[str] = mapped_column(String(80), nullable=False)
    correlation_id: Mapped[str] = mapped_column(String(64), nullable=False)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ReviewerDecisionRecord(WorkflowBase):
    __tablename__ = "reviewer_decisions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    decision_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    advisory_request_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("advisory_requests.advisory_request_id"),
        nullable=False,
    )
    request_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(32), nullable=False)
    outcome: Mapped[str] = mapped_column(String(32), nullable=False)
    reason_code: Mapped[str] = mapped_column(String(64), nullable=False)
    note: Mapped[str | None] = mapped_column(Text(), nullable=True)
    transcript_link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    policy_context: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
