import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  channelSchema,
  countryCodeSchema,
  isoTimestampSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";
import { countryPackSchema, membershipRoleSchema } from "../identity/index.js";

const environmentNameSchema = z.enum(["local", "test", "ci", "staging", "production"]);
const rolloutPolicyModeSchema = z.enum(["active", "hold", "frozen", "limited_release"]);

export const featureFlagSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    flag_key: z.string().min(3).max(96),
    owner_service: z.string().min(2).max(64),
    description: z.string().min(8).max(280),
    state: z.enum(["disabled", "enabled", "conditional"]),
    enabled_by_default: z.boolean(),
    country_codes: z.array(countryCodeSchema).min(1),
    channel_allowlist: z.array(channelSchema).min(1),
    actor_role_allowlist: z.array(membershipRoleSchema).min(1),
    rollout_policy_key: z.string().min(3).max(96).nullable(),
    expires_at: isoTimestampSchema.nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.state === "conditional" && value.rollout_policy_key == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rollout_policy_key"],
        message: "conditional feature flags require rollout_policy_key",
      });
    }
    if (value.state !== "conditional" && value.rollout_policy_key != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rollout_policy_key"],
        message: "rollout_policy_key may only be set for conditional feature flags",
      });
    }
  });

export const rolloutPolicySchema = z
  .object({
    schema_version: schemaVersionLiteral,
    policy_key: z.string().min(3).max(96),
    environment: environmentNameSchema,
    mode: rolloutPolicyModeSchema,
    country_codes: z.array(countryCodeSchema).min(1),
    channel_allowlist: z.array(channelSchema).min(1),
    actor_subset_required: z.boolean(),
    limited_release_percent: z.number().int().min(1).max(99).nullable(),
    reason_code: z.string().min(1).max(96),
    updated_at: isoTimestampSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.mode === "limited_release" && value.limited_release_percent == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["limited_release_percent"],
        message: "limited_release mode requires limited_release_percent",
      });
    }
    if (value.mode !== "limited_release" && value.limited_release_percent != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["limited_release_percent"],
        message: "limited_release_percent is only allowed for limited_release mode",
      });
    }
  });

export const environmentProfileSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    environment: environmentNameSchema,
    public_schema_version: z.string().min(1),
    allowed_schema_versions: z.array(z.string().min(1)).min(1),
    default_country_code: countryCodeSchema,
    supported_country_codes: z.array(countryCodeSchema).min(1),
    feature_flag_keys: z.array(z.string().min(3).max(96)),
    rollout_policy_keys: z.array(z.string().min(3).max(96)),
    telemetry_collection_enabled: z.boolean(),
    admin_api_enabled: z.boolean(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.allowed_schema_versions.includes(value.public_schema_version)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["public_schema_version"],
        message: "public_schema_version must be included in allowed_schema_versions",
      });
    }
    if (!value.supported_country_codes.includes(value.default_country_code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["default_country_code"],
        message: "default_country_code must be included in supported_country_codes",
      });
    }
  });

export const countryPackRuntimeSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    environment: environmentNameSchema,
    country_pack: countryPackSchema,
    feature_flag_keys: z.array(z.string().min(3).max(96)),
    rollout_policy_keys: z.array(z.string().min(3).max(96)),
    config_revision: z.string().min(1).max(96),
    legal_notice_checksum: z.string().min(8).max(128),
  })
  .strict();

export const featureFlagContract = defineContract({
  id: "config.feature_flag",
  name: "FeatureFlag",
  kind: "dto",
  domain: "config",
  schemaVersion,
  schema: featureFlagSchema,
  description:
    "Typed feature-flag definition shared across web, api, and worker boundaries with explicit country, channel, and actor scoping.",
  traceability: ["EP-005", "EP-007", "DI-004"],
  sourceArtifacts: [
    "execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md",
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
  ],
});

export const rolloutPolicyContract = defineContract({
  id: "config.rollout_policy",
  name: "RolloutPolicy",
  kind: "dto",
  domain: "config",
  schemaVersion,
  schema: rolloutPolicySchema,
  description:
    "Typed rollout-policy schema that binds environment, country, channel, and bounded release mode into one source-backed config contract.",
  traceability: ["EP-005", "EP-007", "DI-003", "DI-004"],
  sourceArtifacts: [
    "execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md",
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
  ],
});

export const environmentProfileContract = defineContract({
  id: "config.environment_profile",
  name: "EnvironmentProfile",
  kind: "dto",
  domain: "config",
  schemaVersion,
  schema: environmentProfileSchema,
  description:
    "Typed environment profile used to enforce schema-version allowlists and feature/config availability across local, CI, staging, and production.",
  traceability: ["EP-007", "DI-004"],
  sourceArtifacts: [
    "execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md",
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
  ],
});

export const countryPackRuntimeContract = defineContract({
  id: "config.country_pack_runtime",
  name: "CountryPackRuntime",
  kind: "dto",
  domain: "config",
  schemaVersion,
  schema: countryPackRuntimeSchema,
  description:
    "Country-pack runtime binding that ties the canonical country pack to environment-specific feature and rollout policy references.",
  traceability: ["CJ-001", "EP-007", "DI-004"],
  sourceArtifacts: [
    "execution/reviews/2026-04-20-agrodomain-enterprise-master-plan-revision.md",
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "execution/contracts/b002_identity_consent_contract.json",
  ],
});
