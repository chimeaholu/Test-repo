"""F-008 listing create wizard contract."""

from __future__ import annotations

from dataclasses import dataclass

from .frontend_accessibility_primitives import FrontendAccessibilityPrimitives
from .listings import CommodityListing, ListingStatus


class FrontendListingWizardError(ValueError):
    """Raised when the listing wizard loses step order or publishing safety."""


@dataclass(frozen=True)
class ListingWizardStep:
    step_id: str
    title: str
    field_ids: tuple[str, ...]
    helper_text: tuple[str, ...]


@dataclass(frozen=True)
class ListingWizardSurface:
    steps: tuple[ListingWizardStep, ...]
    current_step_id: str
    publish_ready: bool
    review_route: str
    publish_route: str
    summary_cards: tuple[str, ...]


@dataclass(frozen=True)
class ListingWizardAudit:
    passed: bool
    issues: tuple[str, ...]
    ux_journey_id: str
    ux_data_check_id: str


class FrontendListingWizard:
    """Defines the 3-step listing creation and publish posture."""

    def __init__(self, *, accessibility: FrontendAccessibilityPrimitives) -> None:
        self._accessibility = accessibility

    def build_surface(self, listing: CommodityListing) -> ListingWizardSurface:
        language_helper = self._accessibility.helper_for("consent-language")
        steps = (
            ListingWizardStep(
                step_id="details",
                title="Describe the lot",
                field_ids=("commodity_code", "quantity_kg"),
                helper_text=("Use words buyers know.",),
            ),
            ListingWizardStep(
                step_id="price",
                title="Set the price",
                field_ids=("price_minor", "currency"),
                helper_text=("Keep the amount exact.",),
            ),
            ListingWizardStep(
                step_id="review",
                title="Review and publish",
                field_ids=("proof_notes", "language_hint"),
                helper_text=(language_helper.helper_text, "Confirm before buyers can reply."),
            ),
        )
        publish_ready = listing.status in {ListingStatus.DRAFT, ListingStatus.PUBLISHED}
        return ListingWizardSurface(
            steps=steps,
            current_step_id="review" if publish_ready else "details",
            publish_ready=publish_ready,
            review_route=f"/app/market/listings/{listing.listing_id}/create/review",
            publish_route=f"/app/market/listings/{listing.listing_id}/publish",
            summary_cards=(
                f"{listing.commodity_code.upper()}",
                f"{listing.quantity_kg} kg",
                _format_minor(listing.price_minor, listing.currency),
            ),
        )

    def audit(self, surface: ListingWizardSurface) -> ListingWizardAudit:
        issues: list[str] = []
        if len(surface.steps) != 3:
            issues.append("step_count_mismatch")
        if surface.steps[-1].step_id != "review":
            issues.append("review_step_missing")
        if not surface.publish_ready:
            issues.append("publish_not_ready")
        return ListingWizardAudit(
            passed=not issues,
            issues=tuple(issues),
            ux_journey_id="FJ-E01",
            ux_data_check_id="F-008",
        )


def _format_minor(amount_minor: int, currency: str) -> str:
    return f"{currency} {amount_minor / 100:.2f}"
