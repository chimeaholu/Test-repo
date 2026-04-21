# Wave 1 Web Lane Evidence

Date: `2026-04-18`
Branch: `feat/wave1-web-shell-consent-offline`
Workspace: `/ductor/agents/engineering/workspace/worktrees/agrodomain-wave1-web-copy`

## Scope

- `W-001` authenticated role-aware shell
- `W-002` identity and consent flows
- `W-003` offline queue seam

## Implementation Summary

- Added shared client-safe DTOs in `packages/contracts` for envelope, identity, offline queue, and telemetry seams.
- Replaced the placeholder web app with a Next.js shell that includes public routes, protected role routes, desktop rail, mobile nav, trace chips, and sync status UX.
- Implemented sign-in, onboarding consent capture, consent review/revoke, and protected-action gating using a contract-backed mock API client.
- Implemented persistent offline queue state, deterministic conflict presentation, retry/dismiss controls, and envelope metadata visibility.
- Added unit and integration coverage for route guards, validation, mock client flow, and offline reducer behavior.

## Verification

- Contracts typecheck: `output_to_user/agrodomain-wave1-web-2026-04-18/contracts-typecheck.txt`
- Web typecheck: `output_to_user/agrodomain-wave1-web-2026-04-18/web-typecheck.txt`
- Web tests: `output_to_user/agrodomain-wave1-web-2026-04-18/web-test.txt`
- Web production build: `output_to_user/agrodomain-wave1-web-2026-04-18/web-build.txt`

## Screenshot Evidence

- Desktop sign-in: `output_to_user/agrodomain-wave1-web-2026-04-18/desktop-signin.png`
- Desktop consent: `output_to_user/agrodomain-wave1-web-2026-04-18/desktop-consent.png`
- Desktop role home: `output_to_user/agrodomain-wave1-web-2026-04-18/desktop-role-home.png`
- Desktop outbox: `output_to_user/agrodomain-wave1-web-2026-04-18/desktop-outbox.png`
- Desktop conflict drawer route: `output_to_user/agrodomain-wave1-web-2026-04-18/desktop-conflict.png`
- Mobile outbox: `output_to_user/agrodomain-wave1-web-2026-04-18/mobile-outbox.png`

## Notes

- The source repository at `/mnt/vault/MWH/Projects/Agrodomain` has a corrupt shared git object store, which prevented `git worktree add`. Work proceeded in an isolated filesystem copy initialized as a separate git repository to preserve branch isolation and commit history for this task.
