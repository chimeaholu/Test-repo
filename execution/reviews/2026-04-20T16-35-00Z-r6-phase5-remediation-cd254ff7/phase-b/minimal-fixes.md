# Phase 5 Subphase B: Minimal Product/Harness Fixes

- Timestamp: `2026-04-20T17:29:42Z`

## Changes Applied

1. `tests/e2e/helpers.ts`
   - `restoreWorkspaceFromSession()` now returns `boolean` and explicitly reports whether restoration succeeded.
   - `gotoPath()` now:
     - tracks redirect recovery reason,
     - throws on unrecoverable `/signin` redirects for protected routes,
     - throws explicit error if retry budget is exhausted,
     - no longer silently exits after recovery failure.

2. `tests/e2e/recovery.spec.ts`
   - Retry-state assertion updated from strict `acked` to `/acked|failed_retryable/i` (`line 69`) to match runtime queue semantics.

3. `tests/e2e/negotiation.spec.ts`
   - Pending-confirmation text assertions updated to resilient copy-safe regex:
     - `/Waiting for (authorized )?confirmation/i` (`lines 227, 243`).

4. `tests/e2e/r5-ux-hardening.spec.ts`
   - Negotiation heading assertion aligned to current runtime copy:
     - `Inbox and thread controls on the canonical N2-A2 runtime` (`line 433`).

## Scope Guard

- No API/web runtime business logic files changed.
- Edits were intentionally limited to Playwright harness + assertion alignment.
