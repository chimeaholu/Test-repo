from __future__ import annotations

from typing import cast

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.dependencies.request_context import get_active_settings, get_session
from app.core.auth import authenticate_request
from app.core.config import Settings
from app.core.contracts_catalog import get_envelope_schema_version
from app.db.models.marketplace import Listing, ListingRevision, NegotiationMessage, NegotiationThread
from app.db.repositories.marketplace import ListingProjection, MarketplaceRepository

router = APIRouter(prefix="/api/v1/marketplace", tags=["marketplace"])
PUBLISHED_LISTING_ROLES = {"buyer", "transporter"}


def _listing_payload(listing: Listing) -> dict[str, object]:
    schema_version = get_envelope_schema_version()
    return {
        "schema_version": schema_version,
        "listing_id": listing.listing_id,
        "actor_id": listing.actor_id,
        "country_code": listing.country_code,
        "title": listing.title,
        "commodity": listing.commodity,
        "quantity_tons": listing.quantity_tons,
        "price_amount": listing.price_amount,
        "price_currency": listing.price_currency,
        "location": listing.location,
        "summary": listing.summary,
        "status": listing.status,
        "revision_number": listing.revision_number,
        "published_at": listing.published_at.isoformat() if listing.published_at else None,
        "created_at": listing.created_at.isoformat(),
        "updated_at": listing.updated_at.isoformat(),
    }


def _projection_payload(listing: ListingProjection) -> dict[str, object]:
    schema_version = get_envelope_schema_version()
    return {
        "schema_version": schema_version,
        "listing_id": listing.listing_id,
        "actor_id": listing.actor_id,
        "country_code": listing.country_code,
        "title": listing.title,
        "commodity": listing.commodity,
        "quantity_tons": listing.quantity_tons,
        "price_amount": listing.price_amount,
        "price_currency": listing.price_currency,
        "location": listing.location,
        "summary": listing.summary,
        "status": listing.status,
        "revision_number": listing.revision_number,
        "published_revision_number": listing.published_revision_number,
        "revision_count": listing.revision_count,
        "has_unpublished_changes": listing.has_unpublished_changes,
        "view_scope": listing.view_scope,
        "published_at": listing.published_at.isoformat() if listing.published_at else None,
        "created_at": listing.created_at.isoformat(),
        "updated_at": listing.updated_at.isoformat(),
    }


def _revision_payload(revision: ListingRevision) -> dict[str, object]:
    schema_version = get_envelope_schema_version()
    return {
        "schema_version": schema_version,
        "listing_id": revision.listing_id,
        "revision_number": revision.revision_number,
        "change_type": revision.change_type,
        "actor_id": revision.actor_id,
        "country_code": revision.country_code,
        "status": revision.status,
        "title": revision.title,
        "commodity": revision.commodity,
        "quantity_tons": revision.quantity_tons,
        "price_amount": revision.price_amount,
        "price_currency": revision.price_currency,
        "location": revision.location,
        "summary": revision.summary,
        "changed_at": revision.changed_at.isoformat(),
    }


def _thread_payload(
    thread: NegotiationThread,
    messages: list[NegotiationMessage],
) -> dict[str, object]:
    schema_version = get_envelope_schema_version()
    confirmation_checkpoint = None
    if (
        thread.confirmation_requested_by_actor_id is not None
        and thread.required_confirmer_actor_id is not None
        and thread.confirmation_requested_at is not None
    ):
        checkpoint_note = next(
            (
                item.note
                for item in reversed(messages)
                if item.action == "confirmation_requested"
            ),
            None,
        )
        confirmation_checkpoint = {
            "requested_by_actor_id": thread.confirmation_requested_by_actor_id,
            "required_confirmer_actor_id": thread.required_confirmer_actor_id,
            "requested_at": thread.confirmation_requested_at.isoformat(),
            "note": checkpoint_note,
        }
    return {
        "schema_version": schema_version,
        "thread_id": thread.thread_id,
        "listing_id": thread.listing_id,
        "seller_actor_id": thread.seller_actor_id,
        "buyer_actor_id": thread.buyer_actor_id,
        "country_code": thread.country_code,
        "status": thread.status,
        "current_offer_amount": thread.current_offer_amount,
        "current_offer_currency": thread.current_offer_currency,
        "last_action_at": thread.last_action_at.isoformat(),
        "created_at": thread.created_at.isoformat(),
        "updated_at": thread.updated_at.isoformat(),
        "confirmation_checkpoint": confirmation_checkpoint,
        "messages": [
            {
                "schema_version": schema_version,
                "actor_id": item.actor_id,
                "action": item.action,
                "amount": item.amount,
                "currency": item.currency,
                "note": item.note,
                "created_at": item.created_at.isoformat(),
            }
            for item in messages
        ],
    }


@router.get("/listings")
def list_listings(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    repository = MarketplaceRepository(db_session)
    if auth_context.role in PUBLISHED_LISTING_ROLES:
        items: list[Listing | ListingProjection] = cast(
            list[Listing | ListingProjection],
            repository.list_published_listings(country_code=auth_context.country_code or "GH"),
        )
    else:
        items = cast(
            list[Listing | ListingProjection],
            repository.list_listings(
                actor_id=auth_context.actor_subject,
                country_code=auth_context.country_code or "GH",
            ),
        )
    return {
        "schema_version": get_envelope_schema_version(),
        "items": [
            _projection_payload(repository.build_owner_projection(listing=item))
            if isinstance(item, Listing)
            else _projection_payload(item)
            for item in items
        ],
    }


@router.get("/listings/{listing_id}")
def get_listing(
    listing_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    repository = MarketplaceRepository(db_session)
    if auth_context.role in PUBLISHED_LISTING_ROLES:
        listing: ListingProjection | Listing | None = cast(
            ListingProjection | Listing | None,
            repository.get_published_listing(
                listing_id=listing_id,
                country_code=auth_context.country_code or "GH",
            ),
        )
    else:
        listing = cast(
            ListingProjection | Listing | None,
            repository.get_listing(
                listing_id=listing_id,
                actor_id=auth_context.actor_subject,
                country_code=auth_context.country_code or "GH",
            ),
        )
    if listing is None:
        raise HTTPException(status_code=404, detail="listing_not_found")
    if isinstance(listing, Listing):
        return _projection_payload(repository.build_owner_projection(listing=listing))
    return _projection_payload(listing)


@router.get("/listings/{listing_id}/revisions")
def get_listing_revisions(
    listing_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    repository = MarketplaceRepository(db_session)
    listing = repository.get_listing(
        listing_id=listing_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if listing is None:
        raise HTTPException(status_code=404, detail="listing_not_found")
    revisions = repository.list_revisions(listing_id=listing_id)
    return {
        "schema_version": get_envelope_schema_version(),
        "items": [_revision_payload(item) for item in revisions],
    }


@router.get("/negotiations")
def list_negotiations(
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    repository = MarketplaceRepository(db_session)
    threads = repository.list_negotiation_threads(
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    messages_by_thread = repository.list_negotiation_messages_for_threads(
        thread_ids=[thread.thread_id for thread in threads]
    )
    return {
        "schema_version": get_envelope_schema_version(),
        "items": [
            _thread_payload(thread, messages_by_thread.get(thread.thread_id, []))
            for thread in threads
        ],
    }


@router.get("/negotiations/{thread_id}")
def get_negotiation_thread(
    thread_id: str,
    request: Request,
    db_session: Session = Depends(get_session),
    settings: Settings = Depends(get_active_settings),
) -> dict[str, object]:
    auth_context = authenticate_request(request, settings, db_session)
    if auth_context is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    repository = MarketplaceRepository(db_session)
    thread = repository.get_negotiation_thread_for_actor(
        thread_id=thread_id,
        actor_id=auth_context.actor_subject,
        country_code=auth_context.country_code or "GH",
    )
    if thread is None:
        raise HTTPException(status_code=404, detail="thread_not_found")
    return _thread_payload(thread, repository.list_negotiation_messages(thread_id=thread.thread_id))
