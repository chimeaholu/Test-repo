# Agrodomain Frontend Implementation Roadmap

Date: 2026-04-19
Status: initial upgrade completed, roadmap remains the sequencing guide for follow-on work

## Journey prioritization

### P0: onboarding and shell

Scope:

- landing page
- sign-in
- consent
- role home
- persistent shell, topbar, sync banner, rail, mobile nav

Acceptance criteria:

- user can immediately distinguish identity, consent, queue, and protected-route posture
- mobile and desktop retain the same action order
- shell feels stable and productized rather than recovery scaffolding
- auth-consent E2E flow passes

Before checkpoint:

- public entry and protected entry had a good base but uneven hierarchy
- trust-critical content and supporting content competed visually

After checkpoint:

- stronger hero hierarchy
- compressed summary bands
- clearer shell framing
- more explicit trust and recovery posture

### P0: buyer discovery, listings, offers, negotiation

Scope:

- buyer discovery feed
- owner listing creation and detail
- buyer-safe detail
- negotiation inbox and thread detail

Acceptance criteria:

- marketplace cards scan cleanly on desktop and mobile
- owner vs buyer-safe boundaries are visually explicit
- negotiation state and checkpoint posture are readable before action
- no regressions to route titles, button names, or listing form labels

Before checkpoint:

- data existed, but route summaries were less differentiated
- some screens read like route scaffolds

After checkpoint:

- route-level summary bands
- stronger split between command surfaces and evidence panels
- clearer marketplace posture and negotiation context

### P0: wallet, escrow, traceability

Scope:

- wallet summary
- escrow list and detail
- participant notification state
- traceability summary and timeline

Acceptance criteria:

- settlement state, fallback posture, and actionability are visible above the fold
- timeline and ledger read as one coherent system
- traceability keeps linkage counts obvious
- wallet and traceability route headings remain unchanged for existing tests

### P1: advisory, climate, notifications

Scope:

- advisory queue/detail
- citation drawer surface
- climate alert triage and MRV evidence
- notifications center

Acceptance criteria:

- confidence, reviewer posture, acknowledgement state, and degraded-source posture stay visible without scrolling into secondary panels
- advisory/climate E2E diagnostics pass

### P1: finance, cooperative, admin

Scope:

- finance queue
- cooperative dispatch
- admin analytics

Acceptance criteria:

- each route shows runtime truth in the first screenful
- no “implied work” through placeholders when runtime is empty
- counts and state summaries are immediately scannable

## Completed tranche summary

### Batch 1

- rebuilt global visual tokens and page-shell hierarchy
- upgraded landing, sign-in, consent, and role-home entry surfaces
- tightened shell, sync banner, rail, button, card, and motion language
- verified with `auth-consent.spec.ts`

### Batch 2

- upgraded marketplace and negotiation summary patterns
- improved wallet, escrow, and traceability route posture
- added compressed route-level summary bands for dense workflows
- checked against broad core section coverage

### Batch 3

- extended summary hierarchy across advisory, climate, notifications, finance, dispatch, and admin
- kept existing textual contracts stable for Playwright coverage
- verified against advisory/climate and core sections coverage, with one selector regression discovered and fixed

## Remaining follow-on opportunities

1. Convert summary bands and queue item treatments into explicit React primitives rather than CSS-only composition.
2. Introduce route-specific skeleton states instead of text-only loading copy.
3. Add visual regression snapshots for shell, sign-in, listings, wallet, and advisory.
4. Add finer-grained marketplace and wallet typography tuning for very large desktop widths.
5. Expand mobile evidence pack for authenticated pages after a seeded-session screenshot harness is added.
