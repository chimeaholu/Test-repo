# R4 Codex-Dev-1 Artifact

**Lane:** `codex-dev-1`  
**Scope:** `RB-038 Listing Detail Page Redesign`, `RB-040 My Listings Page`  
**Date:** 2026-04-24

## Files Changed

- `apps/web/app/app/market/listings/[listingId]/page.tsx`
- `apps/web/app/app/market/my-listings/page.tsx`
- `apps/web/components/marketplace/listing-detail-page.tsx`
- `apps/web/components/marketplace/photo-carousel.tsx`
- `apps/web/components/marketplace/price-card.tsx`
- `apps/web/components/marketplace/seller-card.tsx`
- `apps/web/components/marketplace/listing-management-card.tsx`
- `apps/web/components/marketplace/marketplace-r4.test.tsx`
- `apps/web/app/globals.css`

## What Landed

- Replaced the listing detail route with a new two-column R4 layout using reusable marketplace components.
- Added:
  - photo-carousel surface with multi-slide navigation
  - sticky price rail
  - seller card
  - owner-only revision history accordion backed by the real revisions endpoint
- Added seller-side `/app/market/my-listings` management page with:
  - status tabs (`All`, `Draft`, `Published`, `Unpublished`)
  - actor-scoped listing cards from the real marketplace list endpoint
  - real publish/unpublish actions
  - bulk publish/unpublish for selected listings
  - offer counts derived from the real negotiations list endpoint
- Preserved the current auth and route model:
  - no guard changes
  - no routing rewrites
  - edit actions stay on the existing listing detail editor route

## Validation

- `corepack pnpm --filter @agrodomain/web exec vitest run components/marketplace/marketplace-r4.test.tsx`
  - PASS (`2/2`)
- `corepack pnpm --filter @agrodomain/web exec tsc --noEmit`
  - BLOCKED by unrelated concurrent errors in `components/marketplace/listing-wizard/wizard-container.tsx`
  - no lane-specific TypeScript errors surfaced before that blocker

## R4 Readiness Notes

- `RB-040 My Listings`
  - Ready for R4 gate review on the current API contract.
  - Real data flows confirmed for list loading, publish/unpublish, bulk publish/unpublish, and offer counts.
- `RB-038 Listing Detail`
  - UI is implemented and route-ready on the current API contract.
  - Three PRD surfaces remain contract-limited, not front-end blocked:
    - listing media: current marketplace API exposes no photo fields, so the carousel uses derived visual slides from live listing data
    - seller public profile: buyer-safe listing reads expose seller `actor_id` but not seller profile payload, so buyer-side seller card remains an explicit stub surface
    - structured quality fields: grade, moisture, and packaging are not first-class fields in the current listing schema, so the page labels them as current-contract placeholders

## Gate Caveats

- Delete is shown but intentionally disabled on `My Listings` because the current marketplace API does not expose a delete command.
- Edit currently routes to the existing detail editor, not the future wizard-prefill route. That preserves current behavior and avoids crossing into `RB-039`.
- The older `features/listings/listing-slice.test.tsx` suite is not reliable R4 evidence for this lane; it is currently out of sync with the broader marketplace feed redesign outside these new route-level tests.
