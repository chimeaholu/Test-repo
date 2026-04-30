# R3 Codex Dev 2 Artifact

Date: 2026-04-24
Scope: `RB-030`, `RB-032`, `RB-035`

## Delivered

- `RB-030` Cooperative dashboard now renders live cooperative KPIs, dispatch board cards, wallet summary, and member activity from marketplace and wallet APIs.
- `RB-032` Investor dashboard now renders portfolio KPIs, featured opportunities, payout history, and risk overview from marketplace, wallet, and advisory APIs.
- `RB-035` Notification Center, Settings, and Profile are redesigned and wired into the protected app shell.
- Notification badge in navigation now refreshes from the live notification feed instead of a hardcoded count.
- Investor, transporter, and extension-agent roles are normalized in contracts, sign-in, sign-up, onboarding, shell metadata, and role home routing.

## Files Changed

- `packages/contracts/src/client.ts`
- `apps/web/app/layout.tsx`
- `apps/web/app/r3-pages.css`
- `apps/web/app/signin/page.tsx`
- `apps/web/app/signup/page.tsx`
- `apps/web/app/app/profile/page.tsx`
- `apps/web/app/app/settings/page.tsx`
- `apps/web/components/app-provider.tsx`
- `apps/web/components/role-home.tsx`
- `apps/web/components/shell.tsx`
- `apps/web/components/layout/nav-items.ts`
- `apps/web/components/auth/signup-step-identity.tsx`
- `apps/web/components/auth/signup-step-profile.tsx`
- `apps/web/components/dashboards/agent-dashboard.tsx`
- `apps/web/components/dashboards/buyer-dashboard.tsx`
- `apps/web/components/dashboards/cooperative-dashboard.tsx`
- `apps/web/components/dashboards/investor-dashboard.tsx`
- `apps/web/components/dashboards/transporter-dashboard.tsx`
- `apps/web/features/shell/content.ts`
- `apps/web/features/shell/model.ts`
- `apps/web/features/notifications/model.ts`
- `apps/web/features/notifications/model.test.ts`
- `apps/web/features/notifications/notifications-center.tsx`
- `apps/web/features/profile/profile-page.tsx`
- `apps/web/features/settings/settings-page.tsx`
- `apps/web/lib/user-preferences.ts`
- `apps/web/lib/user-preferences.test.ts`

## Validation

- `corepack pnpm typecheck` ✅
- `corepack pnpm test` ✅
  - 19 test files passed
  - 65 tests passed

## Readiness Notes

- R3 lane is ready for gate review on the implemented frontend scope.
- Auth/session behavior was preserved; protected routing still uses the existing shell and app provider session flow.
- Notification badge, settings, and notification read/mute state are currently persisted in frontend local storage, not dedicated backend preference endpoints.
- `/app/settings` is now available from navigation and profile edit flows.
