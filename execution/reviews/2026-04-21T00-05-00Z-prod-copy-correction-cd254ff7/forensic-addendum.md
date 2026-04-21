# Forensic Addendum

- Timestamp (UTC): `2026-04-21T00:05:00Z`
- Scope: production copy/design regression against frontend-upgrade closeout deliverables
- Working tree under correction: `worktrees/agrodomain-n5-web-cd254ff7`
- Git-backed source mirror used for deployable edits: `/mnt/vault/MWH/Projects/Agrodomain`
- Production commit under investigation: `ec7e7fb61063aeab140aecb8c008cf8ac1438513`
- Frontend closeout reference branch/commit: `integration/frontend-compat-closeout-20260419` @ `45cf1e5c`
- Release status in this addendum: `NO-PASS`

## Core finding

Production and canary evidence do not match the April 19 frontend closeout deliverables.

The April 19 closeout evidence pack and patch establish a customer-facing entry experience, including:

- homepage/sign-in copy centered on marketplace product value
- explicit trust/consent framing without internal rollout labels
- mobile and desktop screenshots published as acceptance artifacts

Live production evidence on `https://web-prod-n6-production.up.railway.app/` still exposes internal terminology:

- `Wave 1 web lane`
- `W-001 Authenticated shell`
- `W-002 Consent and identity`
- `W-003 Offline outbox`
- `deterministic queue seam`
- `platform contracts`

Live canary evidence on `https://web-staging-29cd.up.railway.app/` is not even the same product surface. It still renders the staging auth harness (`Agrodomain staging signin`) instead of the customer-facing marketplace entry flow.

## Artifact contradictions

The repo already contains conflicting R7 records:

- `execution/reviews/2026-04-20T23-12-24Z-r7-graphql-promotion-cd254ff7/r7-graphql-promotion-report.md`
  - correctly records `NO-GO`
  - documents red post-deploy quality gates
- `execution/reviews/2026-04-20T23-31-30Z-r7-go-closure-addendum/r7-go-closure-addendum.md`
  - asserts `GO`
  - is contradicted by the surviving live UI, failed parity assumptions, and flawed screenshot capture

The original R7 screenshot set is not reliable as release proof:

- `production-01-signin.png` and `production-02-app_onboarding_consent.png` are not evidence of separate flows
- the production homepage screenshot visibly preserves internal copy
- the canary route surface differs materially from production and from the closeout target

## Railway deployment state recovered from prior evidence

- Canary deploy ID: `535a7a4a-90cb-4d6f-917b-7a2bc0a738ce`
- Production deploy ID: `5867b1f6-3858-4ff6-bf73-6025108ea245`
- Previous stable production rollback pointer: `bc00a49a-ef4d-4d48-a300-1915d246891c`

These IDs are from prior R7 evidence only. No new deploy IDs were created in this correction pass.

## Current redeploy blocker

GraphQL-only Railway promotion could not be re-executed from this runtime.

Observed behavior:

- `RAILWAY_TOKEN` is present in environment
- requests to `https://backboard.railway.com/graphql/v2`
- and `https://backboard.railway.app/graphql/v2`
- return Cloudflare `403` with error code `1010`

Result:

- no canary redeploy mutation executed
- no production redeploy mutation executed
- no new live after-state deploy IDs available

This addendum therefore remains an evidence-and-correction package, not a release closeout.
