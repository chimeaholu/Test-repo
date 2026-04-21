import pytest

from agro_v2.tool_contracts import (
    ContractField,
    ContractValueType,
    ToolContract,
    ToolContractError,
    ToolContractRegistry,
)


def build_registry() -> ToolContractRegistry:
    registry = ToolContractRegistry()
    registry.register(
        ToolContract(
            tool_name="market.create_listing",
            version="2026-04-13",
            input_fields=(
                ContractField("listing_id", ContractValueType.STRING),
                ContractField("quantity_kg", ContractValueType.INTEGER),
                ContractField("metadata", ContractValueType.OBJECT, required=False),
            ),
            output_fields=(
                ContractField("listing_id", ContractValueType.STRING),
                ContractField("status", ContractValueType.STRING),
                ContractField("warnings", ContractValueType.ARRAY, required=False),
            ),
        )
    )
    return registry


def test_registry_accepts_payloads_that_match_registered_contract():
    registry = build_registry()

    registry.validate_input(
        tool_name="market.create_listing",
        version="2026-04-13",
        payload={
            "listing_id": "listing-1",
            "quantity_kg": 250,
            "metadata": {"channel": "whatsapp"},
        },
    )
    registry.validate_output(
        tool_name="market.create_listing",
        version="2026-04-13",
        payload={"listing_id": "listing-1", "status": "draft", "warnings": []},
    )


def test_registry_rejects_missing_required_input_field():
    registry = build_registry()

    with pytest.raises(ToolContractError, match="missing required field: quantity_kg"):
        registry.validate_input(
            tool_name="market.create_listing",
            version="2026-04-13",
            payload={"listing_id": "listing-1"},
        )


def test_registry_rejects_type_mismatches():
    registry = build_registry()

    with pytest.raises(ToolContractError, match="expected integer"):
        registry.validate_input(
            tool_name="market.create_listing",
            version="2026-04-13",
            payload={"listing_id": "listing-1", "quantity_kg": "250"},
        )


def test_registry_rejects_unknown_fields_under_strict_schema():
    registry = build_registry()

    with pytest.raises(ToolContractError, match="unknown fields: extra_flag"):
        registry.validate_output(
            tool_name="market.create_listing",
            version="2026-04-13",
            payload={
                "listing_id": "listing-1",
                "status": "draft",
                "extra_flag": True,
            },
        )


def test_registry_rejects_duplicate_contract_versions():
    registry = build_registry()

    with pytest.raises(ToolContractError, match="already registered"):
        registry.register(
            ToolContract(
                tool_name="market.create_listing",
                version="2026-04-13",
                input_fields=(ContractField("listing_id", ContractValueType.STRING),),
                output_fields=(ContractField("status", ContractValueType.STRING),),
            )
        )
