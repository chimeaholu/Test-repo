"""Commodity listing domain model and minimal create/read/update API contract."""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from enum import Enum
from hashlib import sha256
import json
from typing import Any, Callable


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _fingerprint(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return sha256(encoded.encode("utf-8")).hexdigest()


class ListingStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"


class ListingLifecycleError(ValueError):
    """Raised when an invalid listing state transition is requested."""


class ListingContractError(ValueError):
    """Raised when API contract validation fails."""


@dataclass(frozen=True)
class CommodityListing:
    listing_id: str
    seller_id: str
    commodity_code: str
    quantity_kg: int
    price_minor: int
    currency: str
    status: ListingStatus
    version: int
    created_at: str
    updated_at: str
    metadata: dict[str, Any] = field(default_factory=dict)

    def apply_update(
        self,
        *,
        quantity_kg: int | None = None,
        price_minor: int | None = None,
        status: ListingStatus | None = None,
        metadata_patch: dict[str, Any] | None = None,
        now_iso: str,
    ) -> CommodityListing:
        if self.status == ListingStatus.CLOSED:
            raise ListingLifecycleError("closed listing cannot be updated")

        next_status = status or self.status
        if next_status != self.status and not _is_valid_transition(self.status, next_status):
            raise ListingLifecycleError(
                f"invalid listing transition: {self.status.value} -> {next_status.value}"
            )

        next_quantity = quantity_kg if quantity_kg is not None else self.quantity_kg
        next_price = price_minor if price_minor is not None else self.price_minor
        _validate_listing_fields(
            listing_id=self.listing_id,
            seller_id=self.seller_id,
            commodity_code=self.commodity_code,
            quantity_kg=next_quantity,
            price_minor=next_price,
            currency=self.currency,
        )

        merged_metadata = dict(self.metadata)
        if metadata_patch:
            merged_metadata.update(metadata_patch)

        return replace(
            self,
            quantity_kg=next_quantity,
            price_minor=next_price,
            status=next_status,
            metadata=merged_metadata,
            version=self.version + 1,
            updated_at=now_iso,
        )


def _is_valid_transition(current: ListingStatus, nxt: ListingStatus) -> bool:
    allowed = {
        ListingStatus.DRAFT: {ListingStatus.DRAFT, ListingStatus.PUBLISHED, ListingStatus.CLOSED},
        ListingStatus.PUBLISHED: {ListingStatus.PUBLISHED, ListingStatus.CLOSED},
        ListingStatus.CLOSED: {ListingStatus.CLOSED},
    }
    return nxt in allowed[current]


def _validate_listing_fields(
    *,
    listing_id: str,
    seller_id: str,
    commodity_code: str,
    quantity_kg: int,
    price_minor: int,
    currency: str,
) -> None:
    if not listing_id.strip():
        raise ListingContractError("listing_id is required")
    if not seller_id.strip():
        raise ListingContractError("seller_id is required")
    if not commodity_code.strip():
        raise ListingContractError("commodity_code is required")
    if quantity_kg <= 0:
        raise ListingContractError("quantity_kg must be positive")
    if price_minor <= 0:
        raise ListingContractError("price_minor must be positive")
    if len(currency) != 3 or currency != currency.upper() or not currency.isalpha():
        raise ListingContractError("currency must be a 3-letter uppercase code")


@dataclass(frozen=True)
class CreateListingPayload:
    listing_id: str
    seller_id: str
    commodity_code: str
    quantity_kg: int
    price_minor: int
    currency: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class CreateListingCommand:
    request_id: str
    idempotency_key: str
    actor_id: str
    payload: CreateListingPayload


@dataclass(frozen=True)
class UpdateListingPayload:
    quantity_kg: int | None = None
    price_minor: int | None = None
    status: ListingStatus | None = None
    metadata_patch: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class UpdateListingCommand:
    request_id: str
    idempotency_key: str
    actor_id: str
    listing_id: str
    payload: UpdateListingPayload


class ListingApiContract:
    """In-memory create/read/update contract with idempotency handling."""

    def __init__(self, clock: Callable[[], str] | None = None) -> None:
        self._clock = clock or _utc_now_iso
        self._listings: dict[str, CommodityListing] = {}
        self._idempotency_index: dict[str, tuple[str, CommodityListing]] = {}

    def create(self, command: CreateListingCommand) -> CommodityListing:
        self._require_idempotency_key(command.idempotency_key)
        payload = {
            "operation": "create",
            "request_id": command.request_id,
            "actor_id": command.actor_id,
            "listing_id": command.payload.listing_id,
            "seller_id": command.payload.seller_id,
            "commodity_code": command.payload.commodity_code,
            "quantity_kg": command.payload.quantity_kg,
            "price_minor": command.payload.price_minor,
            "currency": command.payload.currency,
            "metadata": command.payload.metadata,
        }
        replay = self._resolve_replay(command.idempotency_key, payload)
        if replay is not None:
            return replay

        if command.payload.listing_id in self._listings:
            raise ListingContractError("listing already exists")

        _validate_listing_fields(
            listing_id=command.payload.listing_id,
            seller_id=command.payload.seller_id,
            commodity_code=command.payload.commodity_code,
            quantity_kg=command.payload.quantity_kg,
            price_minor=command.payload.price_minor,
            currency=command.payload.currency,
        )
        now_iso = self._clock()
        listing = CommodityListing(
            listing_id=command.payload.listing_id,
            seller_id=command.payload.seller_id,
            commodity_code=command.payload.commodity_code,
            quantity_kg=command.payload.quantity_kg,
            price_minor=command.payload.price_minor,
            currency=command.payload.currency,
            status=ListingStatus.DRAFT,
            version=1,
            created_at=now_iso,
            updated_at=now_iso,
            metadata=dict(command.payload.metadata),
        )
        self._listings[listing.listing_id] = listing
        self._idempotency_index[command.idempotency_key] = (_fingerprint(payload), listing)
        return listing

    def read(self, listing_id: str) -> CommodityListing:
        if listing_id not in self._listings:
            raise KeyError(f"unknown listing: {listing_id}")
        listing = self._listings[listing_id]
        return replace(listing, metadata=dict(listing.metadata))

    def update(self, command: UpdateListingCommand) -> CommodityListing:
        self._require_idempotency_key(command.idempotency_key)
        payload = {
            "operation": "update",
            "request_id": command.request_id,
            "actor_id": command.actor_id,
            "listing_id": command.listing_id,
            "quantity_kg": command.payload.quantity_kg,
            "price_minor": command.payload.price_minor,
            "status": command.payload.status.value if command.payload.status else None,
            "metadata_patch": command.payload.metadata_patch,
        }
        replay = self._resolve_replay(command.idempotency_key, payload)
        if replay is not None:
            return replay

        if command.listing_id not in self._listings:
            raise KeyError(f"unknown listing: {command.listing_id}")

        updated = self._listings[command.listing_id].apply_update(
            quantity_kg=command.payload.quantity_kg,
            price_minor=command.payload.price_minor,
            status=command.payload.status,
            metadata_patch=command.payload.metadata_patch,
            now_iso=self._clock(),
        )
        self._listings[command.listing_id] = updated
        self._idempotency_index[command.idempotency_key] = (_fingerprint(payload), updated)
        return updated

    def _require_idempotency_key(self, key: str) -> None:
        if not key or not key.strip():
            raise ListingContractError("idempotency_key is required")

    def _resolve_replay(
        self,
        idempotency_key: str,
        payload: dict[str, Any],
    ) -> CommodityListing | None:
        prior = self._idempotency_index.get(idempotency_key)
        if prior is None:
            return None

        prior_fingerprint, prior_listing = prior
        current_fingerprint = _fingerprint(payload)
        if prior_fingerprint != current_fingerprint:
            raise ListingContractError(
                "idempotency key already used for a different listing command"
            )
        return prior_listing
