import pytest

from agro_v2.frontend_contract_adapters import (
    FrontendContractAdapterError,
    FrontendContractAdapters,
)
from agro_v2.frontend_listing_routes import ListingBrowseSurface, ListingCard
from agro_v2.listings import ListingStatus


def test_adapt_payload_normalizes_dataclasses_into_route_envelope():
    surface = ListingBrowseSurface(
        cards=(
            ListingCard(
                listing_id="listing-22",
                headline="Premium maize lot",
                quantity_label="40 bags",
                price_label="GHS 900",
                detail_route="/app/market/listings/listing-22",
                status=ListingStatus.PUBLISHED,
            ),
        ),
        page_request={"page_size": 1},
        api_profile_version="frontend.v1",
        results_label="1 listing ready",
    )
    adapters = FrontendContractAdapters()

    envelope = adapters.adapt_payload(
        route_name="/app/listings",
        role="buyer",
        source_bead_ids=("F-022", "F-007"),
        payload=surface,
    )

    assert envelope.schema_version == "frontend.dto.v1"
    assert envelope.payload["cards"][0]["listing_id"] == "listing-22"
    assert envelope.payload_bytes > 0


def test_build_mutation_rejects_null_payload_values():
    adapters = FrontendContractAdapters()

    with pytest.raises(FrontendContractAdapterError, match="value_must_not_be_null"):
        adapters.build_mutation(
            action="listing.publish",
            route_name="/app/listings/new",
            payload={"draft_id": None},
            idempotency_key="idem-22",
        )
