import type { ConnectivityState } from "@agrodomain/contracts";

export type EnvironmentName = "local" | "test" | "ci" | "staging" | "production";

export type EnvironmentProfile = {
  schema_version: string;
  environment: EnvironmentName;
  public_schema_version: string;
  allowed_schema_versions: string[];
  default_country_code: string;
  supported_country_codes: string[];
  feature_flag_keys: string[];
  rollout_policy_keys: string[];
  telemetry_collection_enabled: boolean;
  admin_api_enabled: boolean;
};

export type FeatureFlag = {
  schema_version: string;
  flag_key: string;
  owner_service: string;
  description: string;
  state: "disabled" | "enabled" | "conditional";
  enabled_by_default: boolean;
  country_codes: string[];
  channel_allowlist: string[];
  actor_role_allowlist: string[];
  rollout_policy_key: string | null;
  expires_at: string | null;
};

export type RolloutPolicy = {
  schema_version: string;
  policy_key: string;
  environment: EnvironmentName;
  mode: "active" | "hold" | "frozen" | "limited_release";
  country_codes: string[];
  channel_allowlist: string[];
  actor_subset_required: boolean;
  limited_release_percent: number | null;
  reason_code: string;
  updated_at: string;
};

export type CountryPackRuntime = {
  schema_version: string;
  environment: EnvironmentName;
  country_pack: {
    schema_version: string;
    country_code: string;
    region: string;
    currency: string;
    default_locale: string;
    supported_locales: string[];
    supported_channels: string[];
    legal_notices: Array<Record<string, unknown>>;
    regulated_mutation_requires_consent: boolean;
  };
  feature_flag_keys: string[];
  rollout_policy_keys: string[];
  config_revision: string;
  legal_notice_checksum: string;
};

export type RuntimeConfigResolution = {
  environmentProfile: EnvironmentProfile;
  countryPackRuntime: CountryPackRuntime;
  featureFlags: FeatureFlag[];
  rolloutPolicies: RolloutPolicy[];
};

export declare const environmentProfiles: EnvironmentProfile[];
export declare const featureFlags: FeatureFlag[];
export declare const rolloutPolicies: RolloutPolicy[];
export declare const countryPackRuntimes: CountryPackRuntime[];

export declare function resolveEnvironmentProfile(environment: EnvironmentName): EnvironmentProfile;
export declare function resolveCountryPackRuntime(
  environment: EnvironmentName,
  countryCode: string,
): CountryPackRuntime;
export declare function resolveRolloutPolicies(
  environment: EnvironmentName,
  policyKeys: string[],
): RolloutPolicy[];
export declare function resolveFeatureFlags(
  environment: EnvironmentName,
  flagKeys: string[],
): FeatureFlag[];
export declare function resolveRuntimeConfig(
  environment: EnvironmentName,
  countryCode: string,
): RuntimeConfigResolution;
export declare function resolveFeatureGate(input: {
  actorRole: string;
  channel: string;
  countryCode: string;
  environment: EnvironmentName;
  flagKey: string;
}): { enabled: boolean; reason: string; policy: RolloutPolicy | null };
export declare function deriveHandoffChannel(input: {
  connectivityState: ConnectivityState;
  countryCode: string;
  environment: EnvironmentName;
}): "whatsapp" | "ussd" | "sms" | null;
