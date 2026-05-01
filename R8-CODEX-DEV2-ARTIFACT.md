# R8 Codex Dev 2 Artifact

## Bead

- `RB-066 SEO Optimization`

## Scope Completed

- Centralized public-page metadata and canonical URL generation in `apps/web/lib/seo.ts`.
- Added structured data coverage for the landing, about, features, and contact pages.
- Added route-level indexing controls so `/signin`, `/signup`, `/onboarding/*`, and `/app/*` are `noindex`.
- Added technical SEO routes for `robots.txt` and `sitemap.xml`.
- Added generated social preview images for Open Graph and Twitter.
- Preserved existing routing and page content behavior.

## Files Changed

- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/about/page.tsx`
- `apps/web/app/features/page.tsx`
- `apps/web/app/contact/page.tsx`
- `apps/web/app/contact/layout.tsx`
- `apps/web/app/signin/layout.tsx`
- `apps/web/app/signup/layout.tsx`
- `apps/web/app/onboarding/layout.tsx`
- `apps/web/app/app/layout.tsx`
- `apps/web/app/robots.ts`
- `apps/web/app/sitemap.ts`
- `apps/web/app/opengraph-image.tsx`
- `apps/web/app/twitter-image.tsx`
- `apps/web/components/seo/json-ld.tsx`
- `apps/web/lib/seo.ts`
- `apps/web/lib/seo.test.ts`

## Checks Run

- `corepack pnpm --filter @agrodomain/web exec vitest run lib/seo.test.ts`
  - `PASS`
- `corepack pnpm --filter @agrodomain/web typecheck`
  - `PARTIAL`
  - `next typegen`, `guard:contracts`, and `guard:copy` passed.
  - Final `tsc --noEmit` remains blocked by a pre-existing error in `apps/web/app/manifest.ts`:
    - `TS2339: Property 'purpose' does not exist ...`
- `corepack pnpm build`
  - `PARTIAL`
  - Next production compile completed successfully.
  - Final page-data collection failed in the existing shared build directory with:
    - `ENOENT: ... .next/server/pages-manifest.json`

## Readiness Notes

- SEO implementation is ready for merge from the RB-066 scope perspective.
- Remaining validation blockers are outside this lane and should be cleared before final release signoff:
  - fix the pre-existing `app/manifest.ts` typing issue
  - rerun production build in a clean dist directory or after resetting the shared `.next` state
