# R8 Codex-Dev-1 Artifact

**Lane:** `codex-dev-1`  
**Scope:** `RB-065 PWA Configuration`, `RB-071 Documentation`  
**Date:** 2026-04-25

## Files Changed

- `apps/web/app/layout.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/manifest.ts`
- `apps/web/app/manifest.test.ts`
- `apps/web/app/offline/page.tsx`
- `apps/web/components/pwa/pwa-provider.tsx`
- `apps/web/lib/pwa/config.ts`
- `apps/web/lib/pwa/service-worker.ts`
- `apps/web/lib/pwa/service-worker.test.ts`
- `apps/web/public/sw.js`
- `apps/web/public/icon-192.png`
- `apps/web/public/icon-512.png`
- `apps/web/public/apple-touch-icon.png`
- `docs/deployment/2026-04-25-pwa-release-readiness.md`
- `README.md`

## What Landed

- Added a production-safe PWA substrate for the current Next.js app:
  - web app manifest
  - install icons
  - service worker registration
  - offline fallback route
- Kept offline scope honest to the current app shape:
  - cached shell/documents/assets for resilience
  - no API response caching for authenticated data
  - no fake offline mutation replay beyond the existing browser queue model
- Wired release-readiness documentation for deploy/runtime expectations and surfaced it from the repository README.

## Validation

- `corepack pnpm exec vitest run app/manifest.test.ts lib/pwa/service-worker.test.ts`
- `corepack pnpm --filter @agrodomain/web typecheck`
- `corepack pnpm --filter @agrodomain/web build`
  - Fresh production output observed in `.next/BUILD_ID`, `routes-manifest.json`, and `required-server-files.json` dated `2026-04-25 05:16-05:17 UTC`
  - This runtime intermittently terminated wrapper sessions while `next build` was running, so build evidence is artifact-based rather than a clean captured stdout footer

## R8 Readiness Notes

- `RB-065` is ready for release review for the current web surface.
- Installability now has the required manifest, icons, and service worker wiring.
- Offline support is intentionally limited to shell continuity and cached static assets; live authenticated API behavior still requires network access.
- `RB-071` deliverables for this lane are complete through the deploy/runtime doc, README surfacing, and this artifact.
