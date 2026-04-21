from agro_v2.listings import CommodityListing, ListingStatus
from agro_v2.frontend_listing_routes import FrontendListingRoutes
from agro_v2.mobile_api_profile import (
    MobileApiProfile,
    MobileApiProfileRegistry,
    PaginationPolicy,
    PayloadBudget,
    ResumableOperation,
)


def build_registry() -> MobileApiProfileRegistry:
    registry = MobileApiProfileRegistry()
    registry.register(
        MobileApiProfile(
            version="2026-04-13",
            payload_budgets=(PayloadBudget("market.listings.index", max_bytes=500, max_items=3),),
            pagination=PaginationPolicy(default_page_size=3, max_page_size=5),
            resumable_operations=(ResumableOperation("market.offers.mutate", token_ttl_seconds=900),),
        )
    )
    return registry


def build_listing(listing_id: str, status: ListingStatus = ListingStatus.PUBLISHED) -> CommodityListing:
    return CommodityListing(
        listing_id=listing_id,
        seller_id="farmer-1",
        commodity_code="maize",
        quantity_kg=1000,
        price_minor=420000,
        currency="GHS",
        status=status,
        version=1,
        created_at="2026-04-13T00:00:00Z",
        updated_at="2026-04-13T00:00:00Z",
        metadata={"region": "ashanti"},
    )


def test_listing_index_and_detail_stay_within_mobile_profile_budget():
    routes = FrontendListingRoutes(api_profiles=build_registry())

    browse = routes.build_index(
        profile_version="2026-04-13",
        listings=(build_listing("list-1"), build_listing("list-2")),
    )
    detail = routes.build_detail(build_listing("list-1"))
    audit = routes.audit(browse_surface=browse, detail_surface=detail)

    assert browse.page_request == {"page_size": 3}
    assert browse.cards[0].detail_route == "/app/market/listings/list-1"
    assert detail.metadata_rows == (("region", "ashanti"),)
    assert audit.passed is True


def test_closed_listing_is_flagged_in_audit():
    routes = FrontendListingRoutes(api_profiles=build_registry())
    closed = build_listing("list-3", status=ListingStatus.CLOSED)

    browse = routes.build_index(profile_version="2026-04-13", listings=(closed,))
    detail = routes.build_detail(closed)
    audit = routes.audit(browse_surface=browse, detail_surface=detail)

    assert audit.passed is False
    assert "closed_listing_presented_as_actionable" in audit.issues
