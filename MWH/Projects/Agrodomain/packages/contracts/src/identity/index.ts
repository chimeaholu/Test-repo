import { z } from "zod";

import { defineContract, schemaVersion } from "../common/contract.js";
import {
  actorIdSchema,
  channelSchema,
  countryCodeSchema,
  isoTimestampSchema,
  localeSchema,
  reasonCodeSchema,
  schemaVersionLiteral,
} from "../common/primitives.js";

export const supportedChannelSchema = z.enum(["ussd", "whatsapp", "pwa", "sms"]);

export const legalNoticeSchema = z
  .object({
    notice_id: z.string().min(1),
    locale: localeSchema,
    title: z.string().min(1),
    body_markdown: z.string().min(1),
    required_for_scopes: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const countryPackSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    country_code: countryCodeSchema,
    region: z.string().min(1),
    currency: z.string().regex(/^[A-Z]{3}$/u),
    default_locale: localeSchema,
    supported_locales: z.array(localeSchema).min(1),
    supported_channels: z.array(supportedChannelSchema).min(1),
    legal_notices: z.array(legalNoticeSchema).min(1),
    regulated_mutation_requires_consent: z.boolean(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.supported_locales.includes(value.default_locale)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "default_locale must be present in supported_locales",
        path: ["default_locale"],
      });
    }
  });

export const membershipRoleSchema = z.enum([
  "farmer",
  "buyer",
  "cooperative_admin",
  "advisor",
  "finance_ops",
  "compliance",
  "admin",
]);

export const membershipSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    membership_id: z.string().min(1),
    actor_id: actorIdSchema,
    organization_id: z.string().min(1),
    role: membershipRoleSchema,
    country_code: countryCodeSchema,
    status: z.enum(["invited", "active", "suspended", "revoked"]),
  })
  .strict();

export const consentStateSchema = z.enum([
  "identified",
  "consent_pending",
  "consent_granted",
  "consent_revoked",
]);

export const consentCaptureSchema = z
  .object({
    policy_version: z.string().min(1),
    scope_ids: z.array(z.string().min(1)).min(1),
    channel: channelSchema,
    captured_at: isoTimestampSchema,
  })
  .strict();

export const consentRecordSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    actor_id: actorIdSchema,
    country_code: countryCodeSchema,
    state: consentStateSchema,
    policy_version: z.string().min(1).nullable().optional(),
    consent_scope_ids: z.array(z.string().min(1)).default([]),
    consent_channel: channelSchema.nullable().optional(),
    consent_captured_at: isoTimestampSchema.nullable().optional(),
    consent_revoked_at: isoTimestampSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.state === "consent_granted") {
      if (!value.policy_version || !value.consent_captured_at || value.consent_scope_ids.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "granted consent requires policy details, captured_at, and at least one scope",
        });
      }
    }
    if (value.state === "consent_revoked" && !value.consent_revoked_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "revoked consent requires consent_revoked_at",
        path: ["consent_revoked_at"],
      });
    }
  });

export const consentGateSchema = z
  .object({
    schema_version: schemaVersionLiteral,
    regulated_mutation: z.boolean(),
    consent_required: z.boolean(),
    consent_state: consentStateSchema,
    decision: z.enum(["allow", "challenge", "deny"]),
    reason_code: reasonCodeSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.regulated_mutation &&
      value.consent_required &&
      value.consent_state !== "consent_granted" &&
      value.decision === "allow"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "regulated consent gate cannot allow without consent_granted",
      });
    }
  });

export const countryPackContract = defineContract({
  id: "identity.country_pack",
  name: "CountryPack",
  kind: "dto",
  domain: "identity",
  schemaVersion,
  schema: countryPackSchema,
  description: "Typed country-pack configuration with channel, locale, and legal-pack rules.",
  traceability: ["CJ-001", "EP-007", "DI-004"],
  sourceArtifacts: [
    "execution/contracts/b002_identity_consent_contract.json",
    "legacy/staging-runtime/src/agro_v2/country_pack.py",
  ],
});

export const membershipContract = defineContract({
  id: "identity.membership",
  name: "Membership",
  kind: "dto",
  domain: "identity",
  schemaVersion,
  schema: membershipSchema,
  description: "Actor membership DTO shared by identity, policy, and workflow modules.",
  traceability: ["CJ-001", "EP-007"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "legacy/staging-runtime/src/agro_v2/identity_consent.py",
  ],
});

export const consentCaptureContract = defineContract({
  id: "identity.consent_capture",
  name: "ConsentCapture",
  kind: "dto",
  domain: "identity",
  schemaVersion,
  schema: consentCaptureSchema,
  description: "Consent capture payload required to transition into consent_granted.",
  traceability: ["CJ-001", "EP-007", "DI-004"],
  sourceArtifacts: [
    "execution/contracts/b002_identity_consent_contract.json",
    "legacy/staging-runtime/src/agro_v2/identity_consent.py",
  ],
});

export const consentRecordContract = defineContract({
  id: "identity.consent_record",
  name: "ConsentRecord",
  kind: "dto",
  domain: "identity",
  schemaVersion,
  schema: consentRecordSchema,
  description: "Consent lifecycle snapshot used by workflow, audit, and regulated mutation guards.",
  traceability: ["CJ-001", "EP-007", "DI-004"],
  sourceArtifacts: [
    "execution/contracts/b002_identity_consent_contract.json",
    "legacy/staging-runtime/src/agro_v2/identity_consent.py",
  ],
});

export const consentGateContract = defineContract({
  id: "identity.consent_gate",
  name: "ConsentGateDecision",
  kind: "dto",
  domain: "identity",
  schemaVersion,
  schema: consentGateSchema,
  description: "Derived gate decision that prevents regulated mutations without consent.",
  traceability: ["EP-007", "DI-004"],
  sourceArtifacts: [
    "execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md",
    "legacy/staging-runtime/src/agro_v2/policy_guardrails.py",
  ],
});
