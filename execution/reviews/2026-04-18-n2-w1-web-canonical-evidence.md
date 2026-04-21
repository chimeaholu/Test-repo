# Agrodomain N2-W1 Canonical Web Evidence

Date: `2026-04-18`
Repo: `/mnt/vault/MWH/Projects/Agrodomain`
Scope: `N2-W1 Published marketplace discovery` only

## Scope and Boundary

- Implemented buyer published marketplace discovery on web listing surfaces.
- Preserved owner edit/revision cues on owner-safe detail/listing surfaces.
- Kept negotiation route static composition only; no thread/inbox interaction logic shipped.
- `N2-W2` remains deferred until `N2-C1` and `N2-A2` prerequisites are satisfied.

## Canonical Command Evidence

Environment prep:

```bash
corepack pnpm -C /mnt/vault/MWH/Projects/Agrodomain install
```

Result: `PASS`

Web test:

```bash
corepack pnpm -C /mnt/vault/MWH/Projects/Agrodomain --filter @agrodomain/web test
```

Result: `PASS`

Evidence log:
- `execution/reviews/2026-04-18-n2-w1-web-test.log`

Key output:

```text
Test Files  6 passed (6)
Tests  16 passed (16)
Duration  9.37s
```

Web typecheck:

```bash
corepack pnpm -C /mnt/vault/MWH/Projects/Agrodomain --filter @agrodomain/web typecheck
```

Result: `PASS`

Evidence log:
- `execution/reviews/2026-04-18-n2-w1-web-typecheck.log`

Web build:

```bash
corepack pnpm -C /mnt/vault/MWH/Projects/Agrodomain --filter @agrodomain/web build
```

Result: `PASS`

Evidence log:
- `execution/reviews/2026-04-18-n2-w1-web-build.log`

Key output:

```text
✓ Compiled successfully
✓ Generating static pages (20/20)
Route /app/market/listings and /app/market/listings/[listingId] built successfully
```

## Files Changed for N2-W1

- `apps/web/features/listings/listing-slice.tsx`
- `apps/web/features/listings/listing-slice.test.tsx`
- `apps/web/app/app/market/negotiations/page.tsx`

## Additional Canonical Prereq Repair

The prereq import surfaced a contracts compile gap. Canonical fix applied:

- `packages/contracts/src/common/contract.ts`
  - added `"negotiation"` to `ContractDomain`

This change was required for official web commands to execute against shared contracts.
