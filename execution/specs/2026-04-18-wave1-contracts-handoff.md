# Wave 1 Contracts Lane Handoff

Date: `2026-04-18`
Branch: `feat/wave1-contracts-shared-contracts`
Scope: `C-001`, `C-002`, `C-003`

## Delivered

- Canonical request, response, and event envelopes under `packages/contracts/src/envelope`
- Shared reason catalog under `packages/contracts/src/errors`
- Identity, consent, membership, country-pack, workflow, and policy DTOs under `packages/contracts/src/identity` and `packages/contracts/src/workflow`
- Channel translator DTOs for USSD, WhatsApp, offline replay, and notification delivery under `packages/contracts/src/channels` and `packages/contracts/src/notifications`
- Generated JSON Schema and OpenAPI artifacts committed under `packages/contracts/generated`
- Contract tests covering schema strictness, version enforcement, idempotency metadata, consent gating, channel fallback, and replay conflict metadata

## Import Rules For API Lane

- Import shared schemas and types from `@agrodomain/contracts`; do not recreate DTOs in `apps/api`.
- Treat `RequestEnvelope` as the required shape for mutating routes.
- Enforce `schema_version`, `request_id`, `idempotency_key`, `actor_id`, `country_code`, `channel`, and correlation metadata at the route boundary.
- Use `PolicyDecision` and `ConsentGateDecision` to block regulated mutations before aggregate writes.
- Persist `EventEnvelope` metadata into audit/outbox tables without changing field names.

## Import Rules For Web Lane

- Import DTOs from `@agrodomain/contracts` for app-shell onboarding, consent capture, policy prompts, and channel fallback states.
- Use generated schema artifacts for form/client validation only if runtime bundling needs JSON Schema; otherwise prefer the package exports.
- Do not infer fallback behavior ad hoc in the UI. Respect `NotificationAttempt`, `NotificationResult`, and offline replay conflict fields exactly as defined.

## Generated Artifact Discipline

- Source of truth is `packages/contracts/src`.
- After any schema edit, run:

```bash
corepack pnpm --filter @agrodomain/contracts run generate
```

- Commit changes under:
  - `packages/contracts/generated/json-schema/`
  - `packages/contracts/generated/openapi/contracts.openapi.json`
  - `packages/contracts/generated/manifest.json`

## Validation Commands

```bash
corepack pnpm --filter @agrodomain/contracts run typecheck
corepack pnpm --filter @agrodomain/contracts run build
corepack pnpm --filter @agrodomain/contracts run generate
corepack pnpm --filter @agrodomain/contracts run test
```
