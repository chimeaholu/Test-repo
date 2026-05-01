from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import CommerceBase


class Listing(CommerceBase):
    __tablename__ = "listings"
    __table_args__ = (
        UniqueConstraint("listing_id", name="uq_listings_listing_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    listing_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    commodity: Mapped[str] = mapped_column(String(64), nullable=False)
    quantity_tons: Mapped[float] = mapped_column(Float(), nullable=False)
    price_amount: Mapped[float] = mapped_column(Float(), nullable=False)
    price_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    location: Mapped[str] = mapped_column(String(120), nullable=False)
    summary: Mapped[str] = mapped_column(Text(), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    revision_number: Mapped[int] = mapped_column(Integer(), nullable=False, default=1)
    published_revision_number: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    revision_count: Mapped[int] = mapped_column(Integer(), nullable=False, default=1)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ListingRevision(CommerceBase):
    __tablename__ = "listing_revisions"
    __table_args__ = (
        UniqueConstraint("listing_id", "revision_number", name="uq_listing_revisions_listing_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    listing_id: Mapped[str] = mapped_column(String(64), nullable=False)
    revision_number: Mapped[int] = mapped_column(Integer(), nullable=False)
    change_type: Mapped[str] = mapped_column(String(32), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    commodity: Mapped[str] = mapped_column(String(64), nullable=False)
    quantity_tons: Mapped[float] = mapped_column(Float(), nullable=False)
    price_amount: Mapped[float] = mapped_column(Float(), nullable=False)
    price_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    location: Mapped[str] = mapped_column(String(120), nullable=False)
    summary: Mapped[str] = mapped_column(Text(), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class NegotiationThread(CommerceBase):
    __tablename__ = "negotiation_threads"
    __table_args__ = (
        UniqueConstraint("thread_id", name="uq_negotiation_threads_thread_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    thread_id: Mapped[str] = mapped_column(String(64), nullable=False)
    listing_id: Mapped[str] = mapped_column(String(64), nullable=False)
    seller_actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    buyer_actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open")
    current_offer_amount: Mapped[float] = mapped_column(Float(), nullable=False)
    current_offer_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    confirmation_requested_by_actor_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    required_confirmer_actor_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    confirmation_requested_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_action_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class NegotiationMessage(CommerceBase):
    __tablename__ = "negotiation_messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    thread_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("negotiation_threads.thread_id"),
        nullable=False,
    )
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    amount: Mapped[float | None] = mapped_column(Float(), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    note: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
