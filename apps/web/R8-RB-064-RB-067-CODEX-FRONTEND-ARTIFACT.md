# R8 Frontend Lane Artifact

Date: 2026-04-25
Lane: `RB-064 Performance Optimization` + `RB-067 Error Boundary Hardening`
Scope: frontend/dashboard/public-surface performance and user-facing error resilience

## Outcome

R8 frontend lane implemented and validated green.

The public surface no longer hydrates the full authenticated app provider tree by default. `AppProvider` is now scoped to authenticated and auth-adjacent routes only, while the workspace shell now defers AgroGuide code until the assistant is actually opened. User-facing route and section failures now render hardened fallback copy instead of exposing raw production error text.

## Files Changed

- `apps/web/app/layout.tsx`
- `apps/web/app/app/layout.tsx`
- `apps/web/app/signin/layout.tsx`
- `apps/web/app/signup/layout.tsx`
- `apps/web/app/onboarding/layout.tsx`
- `apps/web/app/error.tsx`
- `apps/web/app/app/error.tsx`
- `apps/web/app/app/analytics/page.tsx`
- `apps/web/app/app/admin/analytics/page.tsx`
- `apps/web/app/app/finance/queue/page.tsx`
- `apps/web/app/app/fund/[id]/page.tsx`
- `apps/web/app/manifest.ts`
- `apps/web/components/error-state.tsx`
- `apps/web/components/error-boundary.tsx`
- `apps/web/components/error-boundary.test.tsx`
- `apps/web/components/layout/app-shell.tsx`

## What Changed

### RB-064 Performance Optimization

- Moved `AppProvider` off the global root layout and into:
  - `app/app/layout.tsx`
  - `app/signin/layout.tsx`
  - `app/signup/layout.tsx`
  - `app/onboarding/layout.tsx`
- This keeps auth/session/queue/telemetry/route-guard client work off the unauthenticated marketing pages.
- Deferred AgroGuide workspace UI with `next/dynamic` and only mounts the assistant panel when opened.

### RB-067 Error Boundary Hardening

- Added shared `ErrorState` with:
  - production-safe messaging
  - network failure copy
  - chunk-load failure copy
  - digest/reference display when present
  - retry + recovery navigation
- Replaced raw-message route fallbacks in:
  - `app/error.tsx`
  - `app/app/error.tsx`
- Added section-level `ErrorBoundary` wrapping to:
  - `/app/analytics`
  - `/app/admin/analytics`
  - `/app/finance/queue`

### Validation Drift Fixed During Lane

- Updated `app/app/fund/[id]/page.tsx` for Next 15 promise-style `params`.
- Tightened `app/manifest.ts` icon typing so the full typecheck/build pipeline stays green.

## Checks Run

- `corepack pnpm exec vitest run components/error-boundary.test.tsx`
  - PASS
- `corepack pnpm typecheck`
  - PASS
- `corepack pnpm build`
  - PASS

## Metrics / Findings

Production build output:

- `/` size `1.52 kB`, first load JS `107 kB`
- `/about` size `1.52 kB`, first load JS `107 kB`
- `/features` size `1.52 kB`, first load JS `107 kB`
- `/contact` size `7.06 kB`, first load JS `113 kB`
- `/signin` size `3.8 kB`, first load JS `137 kB`
- `/signup` size `8.15 kB`, first load JS `141 kB`
- `/app` size `167 B`, first load JS `102 kB`
- `/app/analytics` size `1.12 kB`, first load JS `155 kB`
- `/app/admin/analytics` size `5.17 kB`, first load JS `156 kB`
- `/app/finance/queue` size `5.19 kB`, first load JS `138 kB`
- shared first-load JS baseline: `102 kB`

Interpretation:

- Marketing routes now avoid the authenticated provider tree entirely; auth-bound client work stays scoped to sign-in, sign-up, onboarding, and protected app routes.
- Dashboard shell no longer eagerly ships the AgroGuide assistant panel code on initial workspace render.
- High-risk live-data dashboards now fail closed with recovery UI instead of leaking raw runtime messages in production.

## R8 Gate Readiness

Status: READY

Gate notes:

- Live data wiring preserved; no runtime API contracts were changed.
- Protected-route behavior preserved; provider scoping only moved where client state is initialized.
- Error boundaries now degrade safely at global route, workspace route, and selected live-dashboard section levels.
- Validation stack is green on targeted tests, full typecheck, and production build.
