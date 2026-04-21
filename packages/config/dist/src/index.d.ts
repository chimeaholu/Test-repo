import type { ConnectivityState } from "@agrodomain/contracts";
declare const environmentProfiles: any[];
declare const featureFlags: any[];
declare const rolloutPolicies: any[];
declare const countryPackRuntimes: any[];
export type EnvironmentName = (typeof environmentProfiles)[number]["environment"];
export type EnvironmentProfile = (typeof environmentProfiles)[number];
export type FeatureFlag = (typeof featureFlags)[number];
export type RolloutPolicy = (typeof rolloutPolicies)[number];
export type CountryPackRuntime = (typeof countryPackRuntimes)[number];
export type RuntimeConfigResolution = {
    environmentProfile: EnvironmentProfile;
    countryPackRuntime: CountryPackRuntime;
    featureFlags: FeatureFlag[];
    rolloutPolicies: RolloutPolicy[];
};
export declare function resolveEnvironmentProfile(environment: EnvironmentName): EnvironmentProfile;
export declare function resolveCountryPackRuntime(environment: EnvironmentName, countryCode: string): CountryPackRuntime;
export declare function resolveRolloutPolicies(environment: EnvironmentName, policyKeys: string[]): RolloutPolicy[];
export declare function resolveFeatureFlags(environment: EnvironmentName, flagKeys: string[]): FeatureFlag[];
export declare function resolveRuntimeConfig(environment: EnvironmentName, countryCode: string): RuntimeConfigResolution;
export declare function resolveFeatureGate(input: {
    actorRole: string;
    channel: string;
    countryCode: string;
    environment: EnvironmentName;
    flagKey: string;
}): {
    enabled: boolean;
    reason: string;
    policy: RolloutPolicy | null;
};
export declare function deriveHandoffChannel(input: {
    connectivityState: ConnectivityState;
    countryCode: string;
    environment: EnvironmentName;
}): "whatsapp" | "ussd" | "sms" | null;
export { countryPackRuntimes, environmentProfiles, featureFlags, rolloutPolicies, };
