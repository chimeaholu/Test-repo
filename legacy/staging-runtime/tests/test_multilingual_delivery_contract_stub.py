"""Executable validation stub for B-016 multilingual delivery contract."""

import json
from pathlib import Path


CONTRACT_PATH = (
    Path(__file__).resolve().parent.parent
    / "execution"
    / "contracts"
    / "b016_multilingual_delivery_contract.json"
)


def _load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_declares_supported_locales_and_fallback_chain():
    contract = _load_contract()

    assert contract["bead_id"] == "B-016"
    assert {"en", "fr"} <= set(contract["locales"]["supported"])
    assert contract["locales"]["fallback_order"] == [
        "preferred_locale",
        "user_fallback_locale",
        "country_default_locale",
        "platform_default_locale",
    ]


def test_contract_declares_readability_controls():
    contract = _load_contract()

    readability = contract["readability"]

    assert readability["max_sentence_words"] == 18
    assert readability["max_long_words"] == 6
    assert {
        "sentence_length_exceeds_budget",
        "too_many_long_words",
        "single_sentence_delivery",
    } <= set(readability["warning_codes"])


def test_contract_maps_required_journeys_and_data_check():
    contract = _load_contract()

    assert {"CJ-005", "RJ-003"} <= set(contract["test_obligations"]["journeys"])
    assert contract["test_obligations"]["data_check"] == "DI-005"
