import { describe, expect, it } from "vitest";
import { deriveHandoffChannel, resolveEnvironmentProfile, resolveFeatureGate, resolveRuntimeConfig, } from "../src/index.js";
describe("@agrodomain/config", () => {
    it("resolves a typed runtime config bundle for shared consumers", () => {
        const runtime = resolveRuntimeConfig("test", "GH");
        expect(runtime.environmentProfile.default_country_code).toBe("GH");
        expect(runtime.countryPackRuntime.country_pack.supported_channels).toContain("whatsapp");
        expect(runtime.rolloutPolicies).toHaveLength(2);
    });
    it("derives handoff channels from country-pack support instead of hardcoded UI defaults", () => {
        expect(deriveHandoffChannel({
            connectivityState: "degraded",
            countryCode: "GH",
            environment: "test",
        })).toBe("ussd");
        expect(deriveHandoffChannel({
            connectivityState: "offline",
            countryCode: "CI",
            environment: "test",
        })).toBe("whatsapp");
    });
    it("evaluates conditional feature flags against rollout policy", () => {
        const gate = resolveFeatureGate({
            actorRole: "admin",
            channel: "pwa",
            countryCode: "GH",
            environment: "test",
            flagKey: "workflow.offline_backend_replay",
        });
        expect(gate.enabled).toBe(true);
        expect(gate.policy?.policy_key).toBe("workflow.offline.default");
    });
    it("preserves environment-wide schema/version policy", () => {
        const profile = resolveEnvironmentProfile("test");
        expect(profile.allowed_schema_versions).toContain(profile.public_schema_version);
        expect(profile.admin_api_enabled).toBe(true);
    });
});
