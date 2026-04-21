import pytest

from agro_v2.mobile_api_profile import (
    MobileApiProfile,
    MobileApiProfileError,
    MobileApiProfileRegistry,
    PaginationPolicy,
    PayloadBudget,
    ResumableOperation,
)
from agro_v2.tool_contracts import (
    ContractField,
    ContractValueType,
    ToolContract,
    ToolContractRegistry,
)


def build_registry() -> MobileApiProfileRegistry:
    registry = MobileApiProfileRegistry()
    registry.register(
        MobileApiProfile(
            version="2026-04-13",
            payload_budgets=(
                PayloadBudget("market.listings.index", max_bytes=240, max_items=3),
                PayloadBudget("market.offers.mutate", max_bytes=180),
            ),
            pagination=PaginationPolicy(default_page_size=20, max_page_size=50),
            resumable_operations=(
                ResumableOperation(
                    operation_name="market.offers.mutate",
                    token_ttl_seconds=900,
                    contract_tool_name="market.update_offer",
                ),
            ),
        )
    )
    registry.register(
        MobileApiProfile(
            version="2026-03-01",
            payload_budgets=(PayloadBudget("market.listings.index", max_bytes=180),),
            pagination=PaginationPolicy(default_page_size=15, max_page_size=30),
            resumable_operations=(),
        )
    )
    return registry


def build_contract_registry() -> ToolContractRegistry:
    registry = ToolContractRegistry()
    registry.register(
        ToolContract(
            tool_name="market.update_offer",
            version="2026-04-13",
            input_fields=(
                ContractField("offer_id", ContractValueType.STRING),
                ContractField("price_minor", ContractValueType.INTEGER),
            ),
            output_fields=(ContractField("status", ContractValueType.STRING),),
        )
    )
    return registry


def test_negotiate_version_chooses_latest_compatible_profile():
    registry = build_registry()

    profile = registry.negotiate_version(
        accepted_versions=("2026-03-01", "2026-04-13"),
        minimum_version="2026-03-15",
    )

    assert profile.version == "2026-04-13"


def test_negotiate_version_rejects_when_no_compatible_version_exists():
    registry = build_registry()

    with pytest.raises(MobileApiProfileError, match="no compatible mobile profile version"):
        registry.negotiate_version(
            accepted_versions=("2026-02-01",),
            minimum_version="2026-03-01",
        )


def test_assert_payload_budget_passes_for_small_payload():
    registry = build_registry()

    result = registry.assert_payload_budget(
        version="2026-04-13",
        endpoint_name="market.listings.index",
        payload=[{"listing_id": "l-1"}, {"listing_id": "l-2"}],
    )

    assert result.within_budget is True
    assert result.size_bytes > 0


def test_assert_payload_budget_rejects_oversized_payload():
    registry = build_registry()

    with pytest.raises(MobileApiProfileError, match="payload budget exceeded"):
        registry.assert_payload_budget(
            version="2026-04-13",
            endpoint_name="market.offers.mutate",
            payload={"offer_id": "offer-1", "notes": "x" * 300},
        )


def test_build_page_request_enforces_max_page_size():
    registry = build_registry()

    request = registry.build_page_request(
        version="2026-04-13",
        page_size=25,
        cursor="cursor-1",
    )

    assert request == {"page_size": 25, "cursor": "cursor-1"}

    with pytest.raises(MobileApiProfileError, match="max_page_size"):
        registry.build_page_request(
            version="2026-04-13",
            page_size=51,
        )


def test_validate_resumable_mutation_requires_token_and_contract_shape():
    registry = build_registry()
    contract_registry = build_contract_registry()

    registry.validate_resumable_mutation(
        version="2026-04-13",
        operation_name="market.offers.mutate",
        payload={"offer_id": "offer-1", "price_minor": 4200},
        operation_token="op-123",
        contract_version="2026-04-13",
        contract_registry=contract_registry,
    )

    with pytest.raises(MobileApiProfileError, match="operation_token is required"):
        registry.validate_resumable_mutation(
            version="2026-04-13",
            operation_name="market.offers.mutate",
            payload={"offer_id": "offer-1", "price_minor": 4200},
            operation_token=" ",
            contract_version="2026-04-13",
            contract_registry=contract_registry,
        )

    with pytest.raises(MobileApiProfileError, match="missing required field: price_minor"):
        registry.validate_resumable_mutation(
            version="2026-04-13",
            operation_name="market.offers.mutate",
            payload={"offer_id": "offer-1"},
            operation_token="op-123",
            contract_version="2026-04-13",
            contract_registry=contract_registry,
        )
