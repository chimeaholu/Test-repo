# Agrodomain R8 PWA Release Readiness

**Date:** 2026-04-25  
**Wave:** R8  
**Beads:** RB-065, RB-071

## Scope shipped

- Installable web app manifest with standalone display mode and production icon set.
- Service worker registration wired through the root layout so installability does not depend on page-specific logic.
- Offline fallback route for shell-level continuity when the network is unavailable.
- Explicit cache boundaries:
  - HTML navigations: network first, cached fallback, then offline page.
  - Same-origin static assets: cache-first with background refresh.
  - API traffic: still network-backed; no fake offline data layer was introduced.

## Runtime contract

### What works offline

- Manifest and install prompt eligibility.
- The offline fallback screen at `/offline`.
- Recently visited HTML screens already stored by the service worker.
- Same-origin scripts, styles, fonts, and images that were previously fetched.
- Existing browser-local session, consent, and queue snapshots already managed by the web client.

### What still requires connectivity

- Server-authenticated sign-in completion.
- Live API reads and mutations.
- Queue replay against the backend.
- Any data freshness guarantee beyond cached shell assets.

## Deploy notes

1. Deploy the web app as normal; no extra server runtime is required for the service worker.
2. Do not place a CDN rule in front of `/sw.js` that prevents updates from reaching clients.
3. When changing cache behavior, bump the cache version strings in `apps/web/public/sw.js`.
4. Preserve `public/` assets:
   - `icon-192.png`
   - `icon-512.png`
   - `apple-touch-icon.png`
   - `sw.js`

## API and component implications

- API modules remain the source of truth for live data. The service worker intentionally does not cache API responses to avoid stale authenticated state leaks.
- The existing offline queue reducer remains the mutation continuity mechanism. This R8 work improves shell resilience, not backend sync semantics.
- `PwaProvider` is the only registration touchpoint for the service worker, keeping PWA startup concerns out of feature components and route files.

## Validation checklist

- Manifest route returns standalone metadata with 192px and 512px icons.
- Production-only service worker registration path is covered by unit tests.
- Offline fallback screen renders as a standalone public route.
- Web typecheck/build pass with the new PWA files included.

## Release stance

`RB-065` is release-ready for the current app shape.

`RB-071` is satisfied for this lane through:

- deploy/runtime documentation in this file,
- README updates for operator discovery,
- the lane artifact documenting files changed, checks run, and readiness notes.
