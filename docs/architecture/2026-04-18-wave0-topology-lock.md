# Wave 0 Topology Lock

Source of truth: `execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md`

## Locked production topology

```text
Agrodomain/
  apps/
    web/
    api/
    worker/
  packages/
    contracts/
    config/
  legacy/
    staging-runtime/
  docs/
  infra/
  execution/
  v2-planning/
```

## Ownership rules

- `apps/web` may import only client-safe types, generated contract clients, and feature-flag config.
- `apps/api` owns all persistence, policy enforcement, idempotency checks, and audit writes.
- `apps/worker` owns async retries, notification fan-out, ingestion, reconciliation, and long-running verifier or eval jobs.
- `packages/contracts` is the transport source of truth for envelopes, DTOs, event payloads, error codes, and schema versioning.
- `packages/config` owns typed environment loading, feature flags, and country-pack config shape.
- `legacy/staging-runtime` is read-only reference material and cannot be used as the production deploy path.

## Launch-blocking boundary rules

- Channel adapters are translators only.
- All mutating commands require `request_id`, `idempotency_key`, `actor_id`, `country_code`, `channel`, and `schema_version`.
- All regulated mutations write audit events and outbox records.
- Intelligence modules can recommend, classify, and block, but cannot directly commit wallet, escrow, finance, or consent state.
- Analytics consumes projections, not direct business writes.
