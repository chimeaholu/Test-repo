# N2-W2 Web Evidence

Date: `2026-04-18`
Lane: `N2-W2`
Canonical repo: `/mnt/vault/MWH/Projects/Agrodomain`
Canonical branch: `master`

## SHA chain

- `N2-A2` prerequisite runtime commit: `7f9a90bba1123c55fc4ff98b9e590fc94350e6a4`
- `master` integration base before N2-W2 commit: `30eea4bbd9f805f2330dd52b6253a142c304d4be`
- `N2-W2` implementation commit: `8b9031480b4a43ebf2d7b82582788cc6dfa38c5d`

## Scope lock

Implemented only the negotiation inbox/thread surface against the canonical N2-A2 runtime:

- live inbox list on `/app/market/negotiations`
- actor-scoped thread detail reads
- buyer offer creation
- seller counter offer
- participant confirmation request
- authorized confirmer approve/reject controls
- pending confirmation UX
- terminal-state lock UX
- unauthorized/inaccessible thread handling
- audit and idempotency evidence cues

Explicitly not implemented:

- wallet
- escrow
- settlement
- finance partner routing
- channel fallback

## Changed surfaces

- `apps/web/app/app/market/negotiations/page.tsx`
- `apps/web/features/negotiation/negotiation-inbox.tsx`
- `apps/web/features/negotiation/thread-state.ts`
- `apps/web/lib/api/mock-client.ts`
- `apps/web/features/listings/listing-slice.tsx`
- `apps/web/app/globals.css`
- test coverage for listing CTA updates and negotiation state rendering

## Contract/runtime alignment

- Reads bind to `GET /api/v1/marketplace/negotiations` and `GET /api/v1/marketplace/negotiations/{thread_id}`.
- Mutations bind to canonical commands:
  - `market.negotiations.create`
  - `market.negotiations.counter`
  - `market.negotiations.confirm.request`
  - `market.negotiations.confirm.approve`
  - `market.negotiations.confirm.reject`
- Mutation metadata remains contract-first with `request_id`, `idempotency_key`, `actor_id`, `country_code`, `channel`, `schema_version`, and `DI-002`/`CJ-003` traceability.

## Gate evidence

Executed official `@agrodomain/web` gates on canonical `master` after the N2-W2 patch.

### `corepack pnpm --filter @agrodomain/web test`

- Result: pass
- Evidence:
  - `8` test files passed
  - `23` tests passed
  - includes:
    - `features/negotiation/thread-state.test.ts`
    - `features/negotiation/negotiation-inbox.test.tsx`
    - updated listing route tests

### `corepack pnpm --filter @agrodomain/web typecheck`

- Result: pass
- Evidence:
  - contract boundary verification passed
  - `next typegen` succeeded
  - `tsc --noEmit` succeeded

### `corepack pnpm --filter @agrodomain/web build`

- Result: pass
- Evidence:
  - production build compiled successfully
  - `/app/market/negotiations` built as a dynamic route
  - route output:
    - size: `5.22 kB`
    - first load JS: `133 kB`

## Behavior coverage summary

- `pending_confirmation` now renders an explicit checkpoint callout with requestor and required confirmer ids.
- Only the actor named by `confirmation_checkpoint.required_confirmer_actor_id` sees approve/reject buttons.
- Accepted/rejected threads render a terminal lock callout and do not expose further counter or checkpoint actions.
- Inaccessible thread reads render a blocked/in-scope message for `thread_not_found`.
- Replay-aware evidence panel shows request id, idempotency key, replay flag, and audit event count after mutations.

## Residual notes

- This evidence pack covers the web lane only. Full tranche close still requires the dedicated `N2-Q1` gate pack for Playwright and cross-lane evidence.
