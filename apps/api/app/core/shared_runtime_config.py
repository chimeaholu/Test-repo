from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Literal, TypedDict, cast

from app.core.contracts_catalog import validate_contract_payload

RuntimeEnvironment = Literal["local", "test", "ci", "staging", "production"]


class EnvironmentProfile(TypedDict):
    schema_version: str
    environment: RuntimeEnvironment
    public_schema_version: str
    allowed_schema_versions: list[str]
    default_country_code: str
    supported_country_codes: list[str]
    feature_flag_keys: list[str]
    rollout_policy_keys: list[str]
    telemetry_collection_enabled: bool
    admin_api_enabled: bool


class RolloutPolicy(TypedDict):
    schema_version: str
    policy_key: str
    environment: RuntimeEnvironment
    mode: str
    country_codes: list[str]
    channel_allowlist: list[str]
    actor_subset_required: bool
    limited_release_percent: int | None
    reason_code: str
    updated_at: str


class FeatureFlag(TypedDict):
    schema_version: str
    flag_key: str
    owner_service: str
    description: str
    state: str
    enabled_by_default: bool
    country_codes: list[str]
    channel_allowlist: list[str]
    actor_role_allowlist: list[str]
    rollout_policy_key: str | None
    expires_at: str | None


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
    return Path(__file__).resolve().parents[4] / "packages" / "config" / "src" / "data"


def _load_rows(filename: str) -> list[dict[str, object]]:
    with (_config_root() / filename).open("r", encoding="utf-8") as handle:
        rows = json.load(handle)
    if not isinstance(rows, list):
        raise ValueError(f"Invalid config rows in {filename}")
    return cast(list[dict[str, object]], rows)


@lru_cache(maxsize=1)
def load_environment_profiles() -> list[EnvironmentProfile]:
    return [
        cast(EnvironmentProfile, validate_contract_payload("config.environment_profile", row))
        for row in _load_rows("environment-profiles.json")
    ]


@lru_cache(maxsize=1)
def load_rollout_policies() -> list[RolloutPolicy]:
    return [
        cast(RolloutPolicy, validate_contract_payload("config.rollout_policy", row))
        for row in _load_rows("rollout-policies.json")
    ]


@lru_cache(maxsize=1)
def load_feature_flags() -> list[FeatureFlag]:
    return [
        cast(FeatureFlag, validate_contract_payload("config.feature_flag", row))
        for row in _load_rows("feature-flags.json")
    ]


@lru_cache(maxsize=1)
def load_country_pack_runtimes() -> list[CountryPackRuntime]:
    return [
        cast(CountryPackRuntime, validate_contract_payload("config.country_pack_runtime", row))
        for row in _load_rows("country-pack-runtimes.json")
    ]


def resolve_environment_profile(environment: RuntimeEnvironment) -> EnvironmentProfile:
    for profile in load_environment_profiles():
        if profile["environment"] == environment:
            return profile
    raise ValueError(f"Environment profile not found for {environment}")


def resolve_country_pack_runtime(
    *,
    environment: RuntimeEnvironment,
    country_code: str,
) -> CountryPackRuntime:
    for runtime in load_country_pack_runtimes():
        if runtime["environment"] == environment and runtime["country_pack"]["country_code"] == country_code:
            return runtime
    raise ValueError(f"Country runtime not found for {environment}:{country_code}")


def resolve_rollout_policy(
    *,
    environment: RuntimeEnvironment,
    policy_key: str,
) -> RolloutPolicy:
    for policy in load_rollout_policies():
        if policy["environment"] == environment and policy["policy_key"] == policy_key:
            return policy
    raise ValueError(f"Rollout policy not found for {environment}:{policy_key}")


def resolve_feature_flag(flag_key: str) -> FeatureFlag:
    for flag in load_feature_flags():
        if flag["flag_key"] == flag_key:
            return flag
    raise ValueError(f"Feature flag not found for {flag_key}")


def validate_runtime_country_access(
    *,
    environment: RuntimeEnvironment,
    country_code: str,
) -> CountryPackRuntime:
    profile = resolve_environment_profile(environment)
    if country_code not in profile["supported_country_codes"]:
        raise ValueError(f"Country {country_code} is not enabled for {environment}")
    return resolve_country_pack_runtime(environment=environment, country_code=country_code)
