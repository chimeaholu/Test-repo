"""F-007 listing browse and detail route contracts."""

from __future__ import annotations

from dataclasses import dataclass

from .listings import CommodityListing, ListingStatus
from .mobile_api_profile import MobileApiProfileRegistry


class FrontendListingRouteError(ValueError):
    """Raised when listing browse or detail surfaces violate the route contract."""


@dataclass(frozen=True)
class ListingCard:
    listing_id: str
    headline: str
    price_label: str
    quantity_label: str
    detail_route: str
    status: ListingStatus


@dataclass(frozen=True)
class ListingBrowseSurface:
    cards: tuple[ListingCard, ...]
    page_request: dict[str, object]
    api_profile_version: str
    results_label: str


@dataclass(frozen=True)
class ListingDetailSurface:
    listing_id: str
    headline: str
    detail_route: str
    status: ListingStatus
    quantity_label: str
    price_label: str
    metadata_rows: tuple[tuple[str, str], ...]
    related_routes: tuple[str, ...]


@dataclass(frozen=True)
class ListingRouteAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendListingRoutes:
    """Builds mobile-budget-safe listing browse and detail surfaces."""

    def __init__(self, *, api_profiles: MobileApiProfileRegistry) -> None:
        self._api_profiles = api_profiles

    def build_index(
        self,
        *,
        profile_version: str,
        listings: tuple[CommodityListing, ...],
        page_size: int | None = None,
        cursor: str | None = None,
    ) -> ListingBrowseSurface:
        page_request = self._api_profiles.build_page_request(
            version=profile_version,
            page_size=page_size,
            cursor=cursor,
        )
        cards = tuple(self._card_for(listing) for listing in listings[: int(page_request["page_size"])])
        self._api_profiles.assert_payload_budget(
            version=profile_version,
            endpoint_name="market.listings.index",
            payload=[card.__dict__ for card in cards],
        )
        return ListingBrowseSurface(
            cards=cards,
            page_request=page_request,
            api_profile_version=profile_version,
            results_label=f"{len(cards)} listings ready to review",
        )

    def build_detail(self, listing: CommodityListing) -> ListingDetailSurface:
        metadata_rows = tuple(
            (key, str(value))
            for key, value in sorted(listing.metadata.items())
        )
        return ListingDetailSurface(
            listing_id=listing.listing_id,
            headline=f"{listing.commodity_code.upper()} listing",
            detail_route=f"/app/market/listings/{listing.listing_id}",
            status=listing.status,
            quantity_label=f"{listing.quantity_kg} kg",
            price_label=_format_minor(listing.price_minor, listing.currency),
            metadata_rows=metadata_rows,
            related_routes=(
                "/app/market/listings",
                f"/app/market/listings/{listing.listing_id}/offers",
            ),
        )

    def audit(
        self,
        *,
        browse_surface: ListingBrowseSurface,
        detail_surface: ListingDetailSurface,
    ) -> ListingRouteAudit:
        issues: list[str] = []
        if not browse_surface.cards:
            issues.append("listing_index_empty")
        if detail_surface.detail_route not in tuple(card.detail_route for card in browse_surface.cards):
            issues.append("detail_route_missing_from_index")
        if detail_surface.status == ListingStatus.CLOSED:
            issues.append("closed_listing_presented_as_actionable")
        return ListingRouteAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="FJ-C02",
            ux_data_check_id="F-007",
        )

    @staticmethod
    def _card_for(listing: CommodityListing) -> ListingCard:
        return ListingCard(
            listing_id=listing.listing_id,
            headline=f"{listing.commodity_code.upper()} from {listing.seller_id}",
            price_label=_format_minor(listing.price_minor, listing.currency),
            quantity_label=f"{listing.quantity_kg} kg",
            detail_route=f"/app/market/listings/{listing.listing_id}",
            status=listing.status,
        )


def _format_minor(amount_minor: int, currency: str) -> str:
    return f"{currency} {amount_minor / 100:.2f}"
