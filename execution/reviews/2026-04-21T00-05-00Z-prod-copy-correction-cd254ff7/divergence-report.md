# Divergence Report

## Reference sets

### Deployed production candidate

- commit SHA: `ec7e7fb61063aeab140aecb8c008cf8ac1438513`
- source of truth available in repo evidence:
  - `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/evidence-summary.json`
  - `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/r7-graphql-promotion-report.md`
  - live production screenshot captured in this correction pass: `output_to_user/live-production-home-before.png`

### Frontend-upgrade deliverables

- branch: `integration/frontend-compat-closeout-20260419`
- closeout commit: `45cf1e5c`
- deliverable artifacts:
  - `execution/reviews/2026-04-19-frontend-upgrade-evidence/README.md`
  - `execution/reviews/2026-04-19-frontend-upgrade-evidence/frontend-only.patch`
  - `execution/reviews/2026-04-19-frontend-upgrade-evidence/after/home-desktop.png`
  - `execution/reviews/2026-04-19-frontend-upgrade-evidence/after/home-mobile.png`
  - `execution/reviews/2026-04-19-frontend-upgrade-evidence/after/signin-desktop.png`
  - `execution/reviews/2026-04-19-frontend-upgrade-evidence/after/signin-mobile.png`
  - `docs/frontend/2026-04-19-visual-benchmark-report.md`
  - `docs/frontend/2026-04-19-ui-system-spec.md`
  - `docs/frontend/2026-04-19-implementation-roadmap.md`

## Exact divergences confirmed

### Homepage

Expected from closeout:

- customer-facing marketplace framing
- product promise first
- no rollout labels
- no wave numbering
- no internal work-package headings

Observed in production:

- eyebrow `Wave 1 web lane`
- CTA `Inspect offline seam`
- body copy references `deterministic queue seam aligned to the platform contracts`
- feature cards titled `W-001 Authenticated shell`, `W-002 Consent and identity`, `W-003 Offline outbox`

Impact:

- internal implementation taxonomy is exposed to customers
- the homepage reads like a workstream milestone deck, not a finished product

### Sign-in

Expected from closeout patch:

- heading `Open the right workspace with trust checks visible from the first screen.`
- customer-grade identity/trust framing

Observed in live canary:

- staging-only auth harness (`Agrodomain staging signin`)
- copy about Playwright and agent-driven E2E checks

Impact:

- canary is not representative release evidence for customer-facing web

### Consent

Expected:

- customer-facing access/permission review
- no internal phrasing

Observed in prior evidence set:

- screenshot separation is unreliable
- proof pack does not demonstrate a trustworthy customer-grade consent flow

### Role-home and protected sections

Expected:

- role-first marketplace operations language
- evidence, trust, and recovery stated in plain customer language

Observed in shipped/provenance strings before correction:

- `Grounded guidance with reviewer state`
- `Live alert triage with visible degraded-mode posture`
- `Inbox and thread controls on the canonical N2-A2 runtime`
- loading copy `Restoring route and contract state.`

Impact:

- internal operating vocabulary leaked into protected product surfaces and proof harnesses

## Code/doc mismatch summary

- April 19 docs and screenshots describe a productized visual system
- the deployed commit lineage proves a different artifact was promoted
- the R7 GO addendum overstated parity and should not be treated as trustworthy release proof
