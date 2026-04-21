# Wave 0 V-001 Vertical Slice Evidence

Date: `2026-04-18`
Branch: `master`
Scope: `V-001` create-listing vertical slice

## Canonical commit set

- `029717d5` `feat(contracts): add marketplace listing contracts for V-001`
- `8a7f5f97` `feat(api): deliver V-001 listing persistence and audit flow`
- `440e5c4b` `feat(web): wire authenticated listing slice to production API`

## Route and API walkthrough

### Web routes

- `GET /signin`
  - role and country-aware sign-in form
  - posts to `POST /api/v1/identity/session`
- `GET /onboarding/consent`
  - consent capture flow
  - posts to `POST /api/v1/identity/consent`
- `GET /app/market/listings`
  - authenticated shell route
  - renders create-listing wizard
  - submits listing create command through `POST /api/v1/workflow/commands`
  - reloads persisted listings via `GET /api/v1/marketplace/listings`
- `GET /app/market/listings/[listingId]`
  - reads back persisted listing detail from `GET /api/v1/marketplace/listings/{listingId}`

### API surface

- `POST /api/v1/identity/session`
  - creates or rotates an identity session token
  - persists session state in `identity_sessions`
- `GET /api/v1/identity/session`
  - restores the authenticated shell state from server persistence
- `POST /api/v1/identity/consent`
  - persists consent grant server-side
  - updates `consent_records` and `identity_sessions`
- `POST /api/v1/identity/consent/revoke`
  - revokes consent server-side
- `POST /api/v1/workflow/commands`
  - accepts `market.listings.create`
  - enforces actor scope, country scope, consent gate, schema version, and idempotency
  - writes audit and outbox records
- `GET /api/v1/marketplace/listings`
  - returns actor-scoped listing collection
- `GET /api/v1/marketplace/listings/{listingId}`
  - returns actor-scoped listing detail
- `GET /api/v1/audit/events`
  - returns queryable audit evidence filtered by `request_id` and `idempotency_key`

## Persistence and seam proof

- Migration `0005_vertical_slice_identity_marketplace.py` adds:
  - `identity_sessions`
  - `listings`
- Command handler branch `market.listings.create` validates against the generated marketplace contract
- Command bus rejects:
  - actor mismatch
  - country mismatch
  - missing consent for listing mutation
- Idempotent replay returns prior receipt without creating a second listing row
- Audit evidence is queryable through API and integration tests

## Gate commands and results

### Contracts

Command:

```bash
corepack pnpm --filter @agrodomain/contracts generate
corepack pnpm --filter @agrodomain/contracts test
```

Result:

```text
1 file passed
10 tests passed
```

### API

Command:

```bash
python3 -m pytest apps/api/tests -q
corepack pnpm --filter @agrodomain/api test
```

Result:

```text
15 passed in 8.22s
15 passed in 8.50s
```

### Web

Command:

```bash
corepack pnpm --filter @agrodomain/web test
corepack pnpm --filter @agrodomain/web typecheck
corepack pnpm --filter @agrodomain/web build
```

Result:

```text
4 files passed
9 tests passed
typecheck passed
Next production build passed
```

## G4 decision

`PASS`

Evidence by acceptance clause:

- authenticated shell exists
  - `/signin` -> `/onboarding/consent` -> `/app/*`
  - shell restore now comes from `GET /api/v1/identity/session`
- consent persists
  - `POST /api/v1/identity/consent` updates server state
  - reload path reads persisted consent from `identity_sessions`
- create listing works end to end
  - web wizard -> API command -> database row -> actor-scoped list/detail read-back
- audit and idempotency evidence exists
  - integration test proves duplicate create is single-effect
  - audit query endpoint returns matching evidence for request/idempotency metadata

## Known next-tranche blockers

- Buyer-visible marketplace discovery is not implemented; reads are seller-scoped only in this slice.
- Listing edit flow is still missing; current slice proves create plus read-back only.
- No browser-level Playwright journey was added in this tranche; QA proof is package and integration test based.
- API package `build`, `lint`, and `typecheck` scripts remain placeholder-level and should be hardened before CI is treated as production-grade.
