from agro_v2.frontend_accessibility_primitives import (
    build_default_frontend_accessibility_primitives,
)
from agro_v2.frontend_listing_wizard import FrontendListingWizard
from agro_v2.listings import CommodityListing, ListingStatus


def build_listing() -> CommodityListing:
    return CommodityListing(
        listing_id="list-8",
        seller_id="farmer-8",
        commodity_code="cassava",
        quantity_kg=800,
        price_minor=210000,
        currency="NGN",
        status=ListingStatus.DRAFT,
        version=1,
        created_at="2026-04-13T00:00:00Z",
        updated_at="2026-04-13T00:00:00Z",
    )


def test_listing_wizard_exposes_three_reviewable_steps():
    wizard = FrontendListingWizard(
        accessibility=build_default_frontend_accessibility_primitives()
    )

    surface = wizard.build_surface(build_listing())
    audit = wizard.audit(surface)

    assert [step.step_id for step in surface.steps] == ["details", "price", "review"]
    assert surface.publish_route == "/app/market/listings/list-8/publish"
    assert audit.passed is True
