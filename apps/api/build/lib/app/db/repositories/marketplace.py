from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.marketplace import Listing, ListingRevision, NegotiationMessage, NegotiationThread


@dataclass(slots=True)
class ListingProjection:
    listing_id: str
    actor_id: str
    country_code: str
    title: str
    commodity: str
    quantity_tons: float
    price_amount: float
    price_currency: str
    location: str
    summary: str
    status: str
    revision_number: int
    published_revision_number: int | None
    revision_count: int
    has_unpublished_changes: bool
    view_scope: str
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


@dataclass(slots=True)
class NegotiationCheckpointProjection:
    requested_by_actor_id: str
    required_confirmer_actor_id: str
    requested_at: datetime
    note: str | None


class MarketplaceRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_listing(
        self,
        *,
        listing_id: str,
        actor_id: str,
        country_code: str,
        title: str,
        commodity: str,
        quantity_tons: float,
        price_amount: float,
        price_currency: str,
        location: str,
        summary: str,
    ) -> Listing:
        listing = Listing(
            listing_id=listing_id,
            actor_id=actor_id,
            country_code=country_code,
            title=title,
            commodity=commodity,
            quantity_tons=quantity_tons,
            price_amount=price_amount,
            price_currency=price_currency,
            location=location,
            summary=summary,
            status="draft",
            revision_number=1,
            published_revision_number=None,
            revision_count=1,
        )
        self.session.add(listing)
        self.session.flush()
        self.append_revision(listing=listing, change_type="created", revision_status="draft")
        return listing

    def list_listings(self, *, actor_id: str, country_code: str) -> list[Listing]:
        statement = (
            select(Listing)
            .where(Listing.actor_id == actor_id, Listing.country_code == country_code)
            .order_by(Listing.created_at.desc(), Listing.id.desc())
        )
        return list(self.session.execute(statement).scalars().all())

    def list_published_listings(self, *, country_code: str) -> list[ListingProjection]:
        statement = (
            select(Listing)
            .where(
                Listing.country_code == country_code,
                Listing.status == "published",
                Listing.published_revision_number.is_not(None),
            )
            .order_by(Listing.published_at.desc(), Listing.updated_at.desc(), Listing.id.desc())
        )
        listings = list(self.session.execute(statement).scalars().all())
        return [self.build_buyer_projection(listing=listing) for listing in listings]

    def find_listing(self, *, listing_id: str) -> Listing | None:
        statement = select(Listing).where(Listing.listing_id == listing_id)
        return self.session.execute(statement).scalar_one_or_none()

    def get_listing(self, *, listing_id: str, actor_id: str, country_code: str) -> Listing | None:
        statement = select(Listing).where(
            Listing.listing_id == listing_id,
            Listing.actor_id == actor_id,
            Listing.country_code == country_code,
        )
        return self.session.execute(statement).scalar_one_or_none()

    def get_published_listing(self, *, listing_id: str, country_code: str) -> ListingProjection | None:
        statement = select(Listing).where(
            Listing.listing_id == listing_id,
            Listing.country_code == country_code,
            Listing.status == "published",
            Listing.published_revision_number.is_not(None),
        )
        listing = self.session.execute(statement).scalar_one_or_none()
        if listing is None:
            return None
        return self.build_buyer_projection(listing=listing)

    def update_listing(
        self,
        *,
        listing: Listing,
        title: str,
        commodity: str,
        quantity_tons: float,
        price_amount: float,
        price_currency: str,
        location: str,
        summary: str,
    ) -> Listing:
        listing.title = title
        listing.commodity = commodity
        listing.quantity_tons = quantity_tons
        listing.price_amount = price_amount
        listing.price_currency = price_currency
        listing.location = location
        listing.summary = summary
        listing.revision_number += 1
        listing.revision_count += 1
        self.session.add(listing)
        self.session.flush()
        self.append_revision(listing=listing, change_type="draft_updated", revision_status="draft")
        return listing

    def publish_listing(self, *, listing: Listing) -> Listing:
        if listing.status == "published" and listing.published_revision_number == listing.revision_number:
            return listing
        listing.status = "published"
        listing.revision_number += 1
        listing.revision_count += 1
        listing.published_revision_number = listing.revision_number
        listing.published_at = datetime.now(tz=UTC)
        self.session.add(listing)
        self.session.flush()
        self.append_revision(listing=listing, change_type="published", revision_status="published")
        return listing

    def unpublish_listing(self, *, listing: Listing) -> Listing:
        listing.status = "draft"
        listing.revision_number += 1
        listing.revision_count += 1
        listing.published_revision_number = None
        listing.published_at = None
        self.session.add(listing)
        self.session.flush()
        self.append_revision(listing=listing, change_type="unpublished", revision_status="draft")
        return listing

    def append_revision(
        self,
        *,
        listing: Listing,
        change_type: str,
        revision_status: str,
    ) -> ListingRevision:
        revision = ListingRevision(
            listing_id=listing.listing_id,
            revision_number=listing.revision_number,
            change_type=change_type,
            actor_id=listing.actor_id,
            country_code=listing.country_code,
            status=revision_status,
            title=listing.title,
            commodity=listing.commodity,
            quantity_tons=listing.quantity_tons,
            price_amount=listing.price_amount,
            price_currency=listing.price_currency,
            location=listing.location,
            summary=listing.summary,
        )
        self.session.add(revision)
        self.session.flush()
        return revision

    def list_revisions(self, *, listing_id: str) -> list[ListingRevision]:
        statement = (
            select(ListingRevision)
            .where(ListingRevision.listing_id == listing_id)
            .order_by(ListingRevision.revision_number.desc(), ListingRevision.id.desc())
        )
        return list(self.session.execute(statement).scalars().all())

    def build_owner_projection(self, *, listing: Listing) -> ListingProjection:
        return ListingProjection(
            listing_id=listing.listing_id,
            actor_id=listing.actor_id,
            country_code=listing.country_code,
            title=listing.title,
            commodity=listing.commodity,
            quantity_tons=listing.quantity_tons,
            price_amount=listing.price_amount,
            price_currency=listing.price_currency,
            location=listing.location,
            summary=listing.summary,
            status=listing.status,
            revision_number=listing.revision_number,
            published_revision_number=listing.published_revision_number,
            revision_count=listing.revision_count,
            has_unpublished_changes=listing.published_revision_number != listing.revision_number,
            view_scope="owner",
            published_at=listing.published_at,
            created_at=listing.created_at,
            updated_at=listing.updated_at,
        )

    def build_buyer_projection(self, *, listing: Listing) -> ListingProjection:
        if listing.published_revision_number is None:
            raise ValueError("buyer projection requires a published revision")
        statement = select(ListingRevision).where(
            ListingRevision.listing_id == listing.listing_id,
            ListingRevision.revision_number == listing.published_revision_number,
        )
        revision = self.session.execute(statement).scalar_one()
        return ListingProjection(
            listing_id=listing.listing_id,
            actor_id=listing.actor_id,
            country_code=listing.country_code,
            title=revision.title,
            commodity=revision.commodity,
            quantity_tons=revision.quantity_tons,
            price_amount=revision.price_amount,
            price_currency=revision.price_currency,
            location=revision.location,
            summary=revision.summary,
            status=listing.status,
            revision_number=revision.revision_number,
            published_revision_number=listing.published_revision_number,
            revision_count=listing.revision_count,
            has_unpublished_changes=listing.published_revision_number != listing.revision_number,
            view_scope="buyer_safe",
            published_at=listing.published_at,
            created_at=listing.created_at,
            updated_at=listing.updated_at,
        )

    def create_negotiation_thread(
        self,
        *,
        thread_id: str,
        listing_id: str,
        seller_actor_id: str,
        buyer_actor_id: str,
        country_code: str,
        offer_amount: float,
        offer_currency: str,
        note: str | None,
        actor_id: str,
    ) -> NegotiationThread:
        thread = NegotiationThread(
            thread_id=thread_id,
            listing_id=listing_id,
            seller_actor_id=seller_actor_id,
            buyer_actor_id=buyer_actor_id,
            country_code=country_code,
            status="open",
            current_offer_amount=offer_amount,
            current_offer_currency=offer_currency,
            last_action_at=datetime.now(tz=UTC),
        )
        self.session.add(thread)
        self.session.flush()
        self.add_negotiation_message(
            thread_id=thread.thread_id,
            actor_id=actor_id,
            action="offer_created",
            amount=offer_amount,
            currency=offer_currency,
            note=note,
        )
        return thread

    def get_negotiation_thread(self, *, thread_id: str) -> NegotiationThread | None:
        statement = select(NegotiationThread).where(NegotiationThread.thread_id == thread_id)
        return self.session.execute(statement).scalar_one_or_none()

    def get_negotiation_thread_for_actor(
        self, *, thread_id: str, actor_id: str, country_code: str
    ) -> NegotiationThread | None:
        statement = select(NegotiationThread).where(
            NegotiationThread.thread_id == thread_id,
            NegotiationThread.country_code == country_code,
            (NegotiationThread.seller_actor_id == actor_id)
            | (NegotiationThread.buyer_actor_id == actor_id),
        )
        return self.session.execute(statement).scalar_one_or_none()

    def list_negotiation_threads(self, *, actor_id: str, country_code: str) -> list[NegotiationThread]:
        statement = (
            select(NegotiationThread)
            .where(
                NegotiationThread.country_code == country_code,
                (NegotiationThread.seller_actor_id == actor_id)
                | (NegotiationThread.buyer_actor_id == actor_id),
            )
            .order_by(NegotiationThread.updated_at.desc(), NegotiationThread.id.desc())
        )
        return list(self.session.execute(statement).scalars().all())

    def add_negotiation_message(
        self,
        *,
        thread_id: str,
        actor_id: str,
        action: str,
        amount: float | None,
        currency: str | None,
        note: str | None,
    ) -> NegotiationMessage:
        message = NegotiationMessage(
            thread_id=thread_id,
            actor_id=actor_id,
            action=action,
            amount=amount,
            currency=currency,
            note=note,
        )
        self.session.add(message)
        self.session.flush()
        return message

    def update_negotiation_thread(
        self,
        *,
        thread: NegotiationThread,
        status: str,
        actor_id: str,
        action: str,
        amount: float | None = None,
        currency: str | None = None,
        note: str | None = None,
        confirmation_requested_by_actor_id: str | None = None,
        required_confirmer_actor_id: str | None = None,
        clear_confirmation_checkpoint: bool = False,
    ) -> NegotiationThread:
        now = datetime.now(tz=UTC)
        thread.status = status
        if amount is not None:
            thread.current_offer_amount = amount
        if currency is not None:
            thread.current_offer_currency = currency
        thread.last_action_at = now
        if clear_confirmation_checkpoint:
            thread.confirmation_requested_by_actor_id = None
            thread.required_confirmer_actor_id = None
            thread.confirmation_requested_at = None
        elif required_confirmer_actor_id is not None and confirmation_requested_by_actor_id is not None:
            thread.confirmation_requested_by_actor_id = confirmation_requested_by_actor_id
            thread.required_confirmer_actor_id = required_confirmer_actor_id
            thread.confirmation_requested_at = now
        self.session.add(thread)
        self.session.flush()
        self.add_negotiation_message(
            thread_id=thread.thread_id,
            actor_id=actor_id,
            action=action,
            amount=amount,
            currency=currency,
            note=note,
        )
        return thread

    def list_negotiation_messages(self, *, thread_id: str) -> list[NegotiationMessage]:
        statement = (
            select(NegotiationMessage)
            .where(NegotiationMessage.thread_id == thread_id)
            .order_by(NegotiationMessage.created_at.asc(), NegotiationMessage.id.asc())
        )
        return list(self.session.execute(statement).scalars().all())

    def build_confirmation_checkpoint(
        self, *, thread: NegotiationThread, note: str | None
    ) -> NegotiationCheckpointProjection | None:
        if (
            thread.confirmation_requested_by_actor_id is None
            or thread.required_confirmer_actor_id is None
            or thread.confirmation_requested_at is None
        ):
            return None
        return NegotiationCheckpointProjection(
            requested_by_actor_id=thread.confirmation_requested_by_actor_id,
            required_confirmer_actor_id=thread.required_confirmer_actor_id,
            requested_at=thread.confirmation_requested_at,
            note=note,
        )
