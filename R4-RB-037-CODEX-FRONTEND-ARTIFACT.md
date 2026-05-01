# RB-037 Frontend Artifact

## Scope

Marketplace home redesign for the buyer-facing `/app/market/listings` discovery surface, using the R1 token system and preserving the live `marketplaceApi.listListings()` wiring from R0/R4.

## Delivered

- Rebuilt buyer discovery into a polished marketplace home with:
  - search with commodity/location suggestions
  - combined filters for commodity, location, price range, listing age, and sort order
  - category pill navigation
  - 20-at-a-time progressive loading
  - high-trust listing cards with commodity visuals, seller identity fallback, freshness, and negotiation CTAs
  - merchandising sidebar with popular categories, price pulse sparklines, and featured listings
  - mobile-first responsive layout aligned to the R1 design system
- Preserved seller workspace and detail/edit behavior so existing R0/R3 marketplace flows are not regressed by the buyer-home redesign.
- Hardened the shared R1 UI primitives exercised by the new marketplace surface so the route renders cleanly under the current test transform.

## Files Changed

- `apps/web/features/listings/listing-slice.tsx`
- `apps/web/features/listings/listing-slice.test.tsx`
- `apps/web/app/globals.css`
- `apps/web/components/marketplace/category-nav.tsx`
- `apps/web/components/marketplace/search-filters.tsx`
- `apps/web/components/marketplace/listing-card.tsx`
- `apps/web/components/marketplace/marketplace-sidebar.tsx`
- `apps/web/components/ui/button.tsx`
- `apps/web/components/ui/card.tsx`
- `apps/web/components/ui/input.tsx`
- `apps/web/components/ui/select.tsx`
- `apps/web/components/ui/avatar.tsx`
- `apps/web/components/ui/badge.tsx`
- `tests/e2e/buyer-discovery.spec.ts`
- `tests/e2e/ui-recovery.spec.ts`

## Validation

- Passed: `corepack pnpm --dir /mnt/vault/MWH/Projects/Agrodomain/apps/web exec vitest run features/listings/listing-slice.test.tsx`
- Attempted and blocked: `corepack pnpm --dir /mnt/vault/MWH/Projects/Agrodomain exec playwright test tests/e2e/buyer-discovery.spec.ts --project=desktop-critical`
  - blocker: local Playwright API bootstrap failed because Python dependency `alembic` is missing in the environment
- Repo-wide TypeScript remains blocked by unrelated existing errors in `apps/web/components/marketplace/listing-wizard/wizard-container.tsx`; no new type errors were surfaced for the RB-037 files touched in this lane.

## R4 Gate Readiness

- `RB-037` buyer marketplace home is functionally ready for the R4 gate.
- Data wiring remains real and unchanged at the API boundary.
- Remaining gate risk is environmental, not implementation:
  - restore the Playwright API test environment dependencies
  - clear the unrelated listing wizard type errors before relying on repo-wide `tsc`
