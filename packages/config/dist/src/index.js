import { countryPackRuntimeSchema, environmentProfileSchema, featureFlagSchema, rolloutPolicySchema, } from "@agrodomain/contracts";
import countryPackRuntimeRows from "./data/country-pack-runtimes.json";
import environmentProfileRows from "./data/environment-profiles.json";
import featureFlagRows from "./data/feature-flags.json";
import rolloutPolicyRows from "./data/rollout-policies.json";
const environmentProfiles = environmentProfileRows.map((row) => environmentProfileSchema.parse(row));
const featureFlags = featureFlagRows.map((row) => featureFlagSchema.parse(row));
const rolloutPolicies = rolloutPolicyRows.map((row) => rolloutPolicySchema.parse(row));
const countryPackRuntimes = countryPackRuntimeRows.map((row) => countryPackRuntimeSchema.parse(row));
export function resolveEnvironmentProfile(environment) {
    const profile = environmentProfiles.find((item) => item.environment === environment);
    if (!profile) {
        throw new Error(`environment_profile_not_found:${environment}`);
    }
    return profile;
}
export function resolveCountryPackRuntime(environment, countryCode) {
    const runtime = countryPackRuntimes.find((item) => item.environment === environment && item.country_pack.country_code === countryCode);
    if (!runtime) {
        throw new Error(`country_pack_runtime_not_found:${environment}:${countryCode}`);
    }
    return runtime;
}
export function resolveRolloutPolicies(environment, policyKeys) {
    return policyKeys.map((policyKey) => {
        const policy = rolloutPolicies.find((item) => item.environment === environment && item.policy_key === policyKey);
        if (!policy) {
            throw new Error(`rollout_policy_not_found:${environment}:${policyKey}`);
        }
        return policy;
    });
}
export function resolveFeatureFlags(environment, flagKeys) {
    const profile = resolveEnvironmentProfile(environment);
    return flagKeys.map((flagKey) => {
        if (!profile.feature_flag_keys.includes(flagKey)) {
            throw new Error(`feature_flag_not_enabled_for_environment:${environment}:${flagKey}`);
        }
        const flag = featureFlags.find((item) => item.flag_key === flagKey);
        if (!flag) {
            throw new Error(`feature_flag_not_found:${flagKey}`);
        }
        return flag;
    });
}
export function resolveRuntimeConfig(environment, countryCode) {
    const environmentProfile = resolveEnvironmentProfile(environment);
    const countryPackRuntime = resolveCountryPackRuntime(environment, countryCode);
    return {
        environmentProfile,
        countryPackRuntime,
        featureFlags: resolveFeatureFlags(environment, countryPackRuntime.feature_flag_keys),
        rolloutPolicies: resolveRolloutPolicies(environment, countryPackRuntime.rollout_policy_keys),
    };
}
export function resolveFeatureGate(input) {
    const runtime = resolveRuntimeConfig(input.environment, input.countryCode);
    const flag = runtime.featureFlags.find((item) => item.flag_key === input.flagKey);
    if (!flag) {
        return { enabled: false, reason: "flag_not_enabled", policy: null };
    }
    if (!flag.country_codes.includes(input.countryCode)) {
        return { enabled: false, reason: "country_not_allowed", policy: null };
    }
    if (!flag.channel_allowlist.includes(input.channel)) {
        return { enabled: false, reason: "channel_not_allowed", policy: null };
    }
    if (!flag.actor_role_allowlist.includes(input.actorRole)) {
        return { enabled: false, reason: "actor_role_not_allowed", policy: null };
    }
    if (flag.state === "disabled") {
        return { enabled: false, reason: "flag_disabled", policy: null };
    }
    if (flag.state === "enabled") {
        return { enabled: true, reason: "flag_enabled", policy: null };
    }
    const policy = runtime.rolloutPolicies.find((item) => item.policy_key === flag.rollout_policy_key);
    if (!policy) {
        return { enabled: false, reason: "policy_not_found", policy: null };
    }
    if (!policy.country_codes.includes(input.countryCode)) {
        return { enabled: false, reason: "policy_country_not_allowed", policy };
    }
    if (!policy.channel_allowlist.includes(input.channel)) {
        return { enabled: false, reason: "policy_channel_not_allowed", policy };
    }
    if (policy.mode === "frozen" || policy.mode === "hold") {
        return { enabled: false, reason: `policy_${policy.mode}`, policy };
    }
    return { enabled: true, reason: policy.mode, policy };
}
export function deriveHandoffChannel(input) {
    const runtime = resolveCountryPackRuntime(input.environment, input.countryCode);
    const channels = runtime.country_pack.supported_channels;
    if (input.connectivityState === "online") {
        return null;
    }
    if (input.connectivityState === "degraded") {
        return channels.includes("ussd") ? "ussd" : channels.includes("sms") ? "sms" : null;
    }
    return channels.includes("whatsapp")
        ? "whatsapp"
        : channels.includes("sms")
            ? "sms"
            : channels.includes("ussd")
                ? "ussd"
                : null;
}
export { countryPackRuntimes, environmentProfiles, featureFlags, rolloutPolicies, };
