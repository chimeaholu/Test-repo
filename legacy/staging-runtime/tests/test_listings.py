import pytest

from agro_v2.listings import (
    CreateListingCommand,
    CreateListingPayload,
    ListingApiContract,
    ListingContractError,
    ListingLifecycleError,
    ListingStatus,
    UpdateListingCommand,
    UpdateListingPayload,
)


def test_create_read_update_listing_lifecycle_contract():
    service = ListingApiContract(clock=lambda: "2026-04-13T00:00:00+00:00")

    created = service.create(
        CreateListingCommand(
            request_id="req-1",
            idempotency_key="idem-create-1",
            actor_id="farmer-1",
            payload=CreateListingPayload(
                listing_id="list-1",
                seller_id="farmer-1",
                commodity_code="maize",
                quantity_kg=1000,
                price_minor=420000,
                currency="GHS",
                metadata={"channel": "pwa"},
            ),
        )
    )
    read_back = service.read("list-1")
    updated = service.update(
        UpdateListingCommand(
            request_id="req-2",
            idempotency_key="idem-update-1",
            actor_id="farmer-1",
            listing_id="list-1",
            payload=UpdateListingPayload(
                status=ListingStatus.PUBLISHED,
                price_minor=430000,
            ),
        )
    )

    assert created.status == ListingStatus.DRAFT
    assert created.version == 1
    assert read_back == created
    assert updated.status == ListingStatus.PUBLISHED
    assert updated.price_minor == 430000
    assert updated.version == 2


def test_listing_transition_published_to_draft_is_rejected():
    service = ListingApiContract(clock=lambda: "2026-04-13T00:00:00+00:00")
    service.create(
        CreateListingCommand(
            request_id="req-1",
            idempotency_key="idem-create-1",
            actor_id="farmer-1",
            payload=CreateListingPayload(
                listing_id="list-1",
                seller_id="farmer-1",
                commodity_code="maize",
                quantity_kg=1000,
                price_minor=420000,
                currency="GHS",
            ),
        )
    )
    service.update(
        UpdateListingCommand(
            request_id="req-2",
            idempotency_key="idem-update-1",
            actor_id="farmer-1",
            listing_id="list-1",
            payload=UpdateListingPayload(status=ListingStatus.PUBLISHED),
        )
    )

    with pytest.raises(ListingLifecycleError, match="invalid listing transition"):
        service.update(
            UpdateListingCommand(
                request_id="req-3",
                idempotency_key="idem-update-2",
                actor_id="farmer-1",
                listing_id="list-1",
                payload=UpdateListingPayload(status=ListingStatus.DRAFT),
            )
        )


def test_closed_listing_rejects_mutation():
    service = ListingApiContract(clock=lambda: "2026-04-13T00:00:00+00:00")
    service.create(
        CreateListingCommand(
            request_id="req-1",
            idempotency_key="idem-create-1",
            actor_id="farmer-1",
            payload=CreateListingPayload(
                listing_id="list-1",
                seller_id="farmer-1",
                commodity_code="maize",
                quantity_kg=1000,
                price_minor=420000,
                currency="GHS",
            ),
        )
    )
    service.update(
        UpdateListingCommand(
            request_id="req-2",
            idempotency_key="idem-update-1",
            actor_id="farmer-1",
            listing_id="list-1",
            payload=UpdateListingPayload(status=ListingStatus.CLOSED),
        )
    )

    with pytest.raises(ListingLifecycleError, match="closed listing cannot be updated"):
        service.update(
            UpdateListingCommand(
                request_id="req-3",
                idempotency_key="idem-update-2",
                actor_id="farmer-1",
                listing_id="list-1",
                payload=UpdateListingPayload(price_minor=410000),
            )
        )


def test_create_requires_idempotency_key():
    service = ListingApiContract(clock=lambda: "2026-04-13T00:00:00+00:00")

    with pytest.raises(ListingContractError, match="idempotency_key is required"):
        service.create(
            CreateListingCommand(
                request_id="req-1",
                idempotency_key=" ",
                actor_id="farmer-1",
                payload=CreateListingPayload(
                    listing_id="list-1",
                    seller_id="farmer-1",
                    commodity_code="maize",
                    quantity_kg=1000,
                    price_minor=420000,
                    currency="GHS",
                ),
            )
        )


def test_create_replay_with_same_token_returns_same_listing():
    service = ListingApiContract(clock=lambda: "2026-04-13T00:00:00+00:00")
    command = CreateListingCommand(
        request_id="req-1",
        idempotency_key="idem-create-1",
        actor_id="farmer-1",
        payload=CreateListingPayload(
            listing_id="list-1",
            seller_id="farmer-1",
            commodity_code="maize",
            quantity_kg=1000,
            price_minor=420000,
            currency="GHS",
        ),
    )

    first = service.create(command)
    second = service.create(command)

    assert first == second
    assert service.read("list-1").version == 1


def test_idempotency_token_reuse_with_different_payload_is_rejected():
    service = ListingApiContract(clock=lambda: "2026-04-13T00:00:00+00:00")
    service.create(
        CreateListingCommand(
            request_id="req-1",
            idempotency_key="idem-create-1",
            actor_id="farmer-1",
            payload=CreateListingPayload(
                listing_id="list-1",
                seller_id="farmer-1",
                commodity_code="maize",
                quantity_kg=1000,
                price_minor=420000,
                currency="GHS",
            ),
        )
    )

    with pytest.raises(ListingContractError, match="idempotency key already used"):
        service.create(
            CreateListingCommand(
                request_id="req-2",
                idempotency_key="idem-create-1",
                actor_id="farmer-1",
                payload=CreateListingPayload(
                    listing_id="list-2",
                    seller_id="farmer-1",
                    commodity_code="maize",
                    quantity_kg=1100,
                    price_minor=430000,
                    currency="GHS",
                ),
            )
        )


def test_read_returns_copy_of_listing_metadata():
    service = ListingApiContract(clock=lambda: "2026-04-13T00:00:00+00:00")
    service.create(
        CreateListingCommand(
            request_id="req-1",
            idempotency_key="idem-create-1",
            actor_id="farmer-1",
            payload=CreateListingPayload(
                listing_id="list-1",
                seller_id="farmer-1",
                commodity_code="maize",
                quantity_kg=1000,
                price_minor=420000,
                currency="GHS",
                metadata={"region": "ashanti"},
            ),
        )
    )

    listing = service.read("list-1")
    listing.metadata["region"] = "tampered"

    assert service.read("list-1").metadata["region"] == "ashanti"
