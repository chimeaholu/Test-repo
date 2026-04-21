import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveHandoffChannel,
  resolveEnvironmentProfile,
  resolveFeatureGate,
  resolveRuntimeConfig,
} from "../src/index.js";

test("resolves a typed runtime config bundle for shared consumers", () => {
  const runtime = resolveRuntimeConfig("test", "GH");
  assert.equal(runtime.environmentProfile.default_country_code, "GH");
  assert.ok(runtime.countryPackRuntime.country_pack.supported_channels.includes("whatsapp"));
  assert.equal(runtime.rolloutPolicies.length, 2);
});

test("derives handoff channels from country-pack support instead of hardcoded UI defaults", () => {
  assert.equal(
    deriveHandoffChannel({
      connectivityState: "degraded",
      countryCode: "GH",
      environment: "test",
    }),
    "ussd",
  );
  assert.equal(
    deriveHandoffChannel({
      connectivityState: "offline",
      countryCode: "CI",
      environment: "test",
    }),
    "whatsapp",
  );
});

test("evaluates conditional feature flags against rollout policy", () => {
  const gate = resolveFeatureGate({
    actorRole: "admin",
    channel: "pwa",
    countryCode: "GH",
    environment: "test",
    flagKey: "workflow.offline_backend_replay",
  });
  assert.equal(gate.enabled, true);
  assert.equal(gate.policy?.policy_key, "workflow.offline.default");
});

test("preserves environment-wide schema and admin policy", () => {
  const profile = resolveEnvironmentProfile("test");
  assert.ok(profile.allowed_schema_versions.includes(profile.public_schema_version));
  assert.equal(profile.admin_api_enabled, true);
});
