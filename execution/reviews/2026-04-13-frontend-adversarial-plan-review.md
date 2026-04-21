# Agrodomain Frontend Adversarial Plan Review

Date: 2026-04-13
Reviewer: `engineering`
Verdict: `PASS WITH CONDITIONS`

## Highest-Severity Findings

1. Scope pressure is real.
The plan covers six roles and three channel postures. If implementation starts by chasing visual parity across all of them, the wave will stall. Mitigation: execute the bead package in the proposed waves and hold the launch bar on farmer/buyer/advisory/finance critical journeys first.

2. Offline UX can still be under-built despite strong backend seams.
The repo has robust queue and conflict contracts, but teams often defer visible outbox and conflict routes until late. That would break the product promise for unstable networks. Mitigation: keep `F-017` in the first two implementation waves instead of treating it as polish.

3. Contract drift risk is non-trivial.
Backend state names and frontend component states will diverge quickly unless a typed adapter layer exists. Mitigation: make `F-022` and `F-023` non-optional foundation work, not cleanup work.

4. Finance and traceability trust patterns must not be reduced to badges.
The current plan is correct to require evidence, ownership, and rationale rows. If later design work turns those into hidden drawers or tiny pills, the frontend will fail the trust requirement. Mitigation: keep proof rails visible on first render for all high-stakes routes.

5. Analytics could consume disproportionate effort.
Enterprise/admin surfaces are valuable but should not displace critical operational workflows. Mitigation: ship mobile fallback summaries and limit the first admin wave to essential metrics and health views.

## Medium-Severity Findings

- Localization is acknowledged but still depends on disciplined copy-token usage from day one.
- Media/evidence upload UX will need a clear storage and transformation posture during implementation.
- Role switching needs guardrails so users do not land in routes where they lack context or permissions.
- Design-system work must stay coupled to real flows; otherwise the team can produce a beautiful but unproven component layer.

## What the Plan Gets Right

- It is anchored to the actual backend contracts rather than speculative frontend abstractions.
- It treats mobile, offline, and trust as structural requirements.
- It uses routed beads with explicit owners, dependencies, and test obligations.
- It avoids the common failure mode of building analytics-heavy shells before action-complete task flows.

## Required Conditions Before Step 8 Launch

1. Preserve the wave sequence from the bead package.
2. Keep offline outbox/conflict work in-scope before finance and admin expansion.
3. Require the contract adapter package before page proliferation.
4. Gate all high-stakes surfaces on visible proof rows, not hidden metadata.
5. Run rolling architecture review once Wave F2 reaches around 50 percent completion.

## Decision

Proceed to Step `8` when the implementation team commits to the routed bead order and treats offline, contract fidelity, and proof visibility as non-negotiable.
