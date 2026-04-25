# R3 Frontend Artifact

Date: 2026-04-24
Scope: RB-028 Farmer Dashboard, RB-034 Global Navigation Implementation

## Delivered

- Wired the active protected app shell to the R3 shared navigation path.
- Added responsive desktop sidebar, mobile drawer, and mobile bottom navigation.
- Added role-aware navigation sections using only live app routes.
- Added the farmer-specific dashboard at `/app/farmer` with live marketplace, wallet, climate, advisory, and offline queue signals.
- Preserved existing R0/R2 route guards, session handling, and sync banner behavior.

## Files Changed

- `apps/web/app/app/[role]/page.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/design-system.css`
- `apps/web/components/shell.tsx`
- `apps/web/components/layout/app-shell.tsx`
- `apps/web/components/layout/sidebar.tsx`
- `apps/web/components/layout/top-bar.tsx`
- `apps/web/components/layout/bottom-nav.tsx`
- `apps/web/components/layout/nav-items.ts`
- `apps/web/components/dashboards/farmer-dashboard.tsx`
- `apps/web/components/dashboards/agent-dashboard.tsx`
- `apps/web/components/dashboards/buyer-dashboard.tsx`
- `apps/web/components/dashboards/cooperative-dashboard.tsx`
- `apps/web/components/dashboards/transporter-dashboard.tsx`

## Checks Run

- `corepack pnpm run typecheck` from `apps/web` — passed
- `corepack pnpm run build` from `apps/web` — passed

## Readiness Notes

- Global navigation is now shared across desktop and mobile and uses route-safe links only. No dead `/app/settings` entry was introduced.
- Farmer dashboard data is grounded in existing live/fallback APIs and keeps offline recovery state visible.
- Notification badge counts currently use an offline conflict/handoff proxy because there is no dedicated unread notifications API in the current backend surface.
- Additional dashboard files were adjusted only to resolve existing frontend type drift uncovered by the R3 validation pass.
