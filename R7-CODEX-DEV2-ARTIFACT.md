# R7 Codex Dev 2 Artifact

Date: 2026-04-25
Scope: `RB-061` analytics dashboard delivery plus `RB-062` R7 E2E-adjacent analytics/admin UI-state support in the codex-only adaptation

## Delivered

- Added a canonical protected analytics destination at `apps/web/app/app/analytics/page.tsx` with a shared layout and a working `/app/insights` alias for PRD route continuity.
- Built a shared analytics dashboard on top of the existing marketplace, wallet, climate, and advisory flows with no new backend dependency, including:
  - role-aware overview metrics
  - date-range switching
  - derived trend and regional charts
  - CSV/PDF export
  - explicit loading, partial-data, error, and empty states
- Reworked the admin analytics surface to use the same live seams first and layer in optional admin control-plane reads when present, while preserving rollout mutation behavior and degrading cleanly when dedicated admin metrics endpoints are absent.
- Added stable selectors and UI-state coverage for downstream R7 gate work across the user analytics and admin analytics surfaces.
- Updated analytics copy to satisfy the product-copy guard without changing functional behavior.

## Files Changed

- `apps/web/app/app/admin/analytics/page.tsx`
- `apps/web/app/app/analytics/layout.tsx`
- `apps/web/app/app/analytics/page.tsx`
- `apps/web/app/app/insights/page.tsx`
- `apps/web/app/globals.css`
- `apps/web/components/analytics/chart-card.tsx`
- `apps/web/components/analytics/date-range-picker.tsx`
- `apps/web/components/analytics/export-button.tsx`
- `apps/web/components/analytics/metric-dashboard.tsx`
- `apps/web/components/ui-primitives.tsx`
- `apps/web/features/admin/admin-analytics-workspace.test.tsx`
- `apps/web/features/admin/admin-analytics-workspace.tsx`
- `apps/web/features/analytics/analytics-dashboard.test.tsx`
- `apps/web/features/analytics/analytics-dashboard.tsx`
- `apps/web/features/analytics/model.ts`

## Validation

- `corepack pnpm --dir /mnt/vault/MWH/Projects/Agrodomain/apps/web exec vitest run /mnt/vault/MWH/Projects/Agrodomain/apps/web/features/analytics/analytics-dashboard.test.tsx /mnt/vault/MWH/Projects/Agrodomain/apps/web/features/admin/admin-analytics-workspace.test.tsx` ✅
- `corepack pnpm --dir /mnt/vault/MWH/Projects/Agrodomain/apps/web typecheck` ✅
- Targeted `tsc --noEmit` grep over the touched analytics/admin/shared-primitive files returned no matching lane-local type errors. ✅

## R7 Readiness Notes

- `RB-061` is ready for gate review on this lane.
- `/app/analytics` is the canonical protected analytics route and `/app/insights` resolves through the same experience for compatibility with the PRD route wording.
- The dashboard intentionally derives analytics from the existing marketplace, wallet, climate, and advisory seams; no dedicated analytics backend was introduced.
- `/app/admin/analytics` now remains useful even when optional admin metrics endpoints are unavailable, because it falls back to derived live-platform data and still preserves rollout-control behavior.
- The analytics/admin surfaces now expose explicit empty/error/partial-data states and stable selectors suitable for the R7 E2E-adjacent gate.
