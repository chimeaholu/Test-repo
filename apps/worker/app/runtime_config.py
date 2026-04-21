from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Literal, TypedDict, cast

from app.contracts import validate_contract_payload

RuntimeEnvironment = Literal["local", "test", "ci", "staging", "production"]


class CountryPack(TypedDict):
    schema_version: str
    country_code: str
    region: str
    currency: str
    default_locale: str
    supported_locales: list[str]
    supported_channels: list[str]
    legal_notices: list[dict[str, object]]
    regulated_mutation_requires_consent: bool


class CountryPackRuntime(TypedDict):
    schema_version: str
    environment: RuntimeEnvironment
    country_pack: CountryPack
    feature_flag_keys: list[str]
    rollout_policy_keys: list[str]
    config_revision: str
    legal_notice_checksum: str


@lru_cache(maxsize=1)
def _config_root() -> Path:
    return Path(__file__).resolve().parents[3] / "packages" / "config" / "src" / "data"


@lru_cache(maxsize=1)
def load_country_pack_runtimes() -> list[CountryPackRuntime]:
    with (_config_root() / "country-pack-runtimes.json").open("r", encoding="utf-8") as handle:
        rows = json.load(handle)
    return [
        cast(CountryPackRuntime, validate_contract_payload("config.country_pack_runtime", row))
        for row in rows
    ]


def resolve_country_pack_runtime(
    *,
    environment: RuntimeEnvironment,
    country_code: str,
) -> CountryPackRuntime:
    for runtime in load_country_pack_runtimes():
        if runtime["environment"] == environment and runtime["country_pack"]["country_code"] == country_code:
            return runtime
    raise ValueError(f"Country runtime not found for {environment}:{country_code}")
