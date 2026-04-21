# Frontend Swarm Launch Checklist (Agrodomain)

Date: 2026-04-13  
Scope: Frontend-specific implementation waves under SOP 15

## Trigger Rule
- If the upcoming frontend tranche has `>= 4` beads, launch a parallel swarm (minimum `2` implementation workers + `1` QA integration lane).

## Pre-Launch Inputs (required)
- Latest frontend Step 9d snapshot
- Frontend bead package with route/dependency map
- Frontend architecture + UX plan
- Frontend journey test plan
- Latest frontend SOP delta

## Worker Split Rule
- Split frontend beads into non-overlapping subsets before launch.
- Assign each worker explicit bead IDs.
- Use isolated worktrees per worker.
- Disallow shared-file editing across workers in the same tranche.

## Required Lanes
- `Frontend Worker A`: first subset
- `Frontend Worker B`: second subset
- `QA Integrator Lane`: commit-pinned QA + integration checks + conflict tracking

## Worker Output Contract
- For each worker:
  - commit SHA(s)
  - per-bead test evidence
  - changed-file manifest
  - cherry-pick order and conflict notes
  - unresolved risks

## QA Integrator Responsibilities
- Integrate worker commits in deterministic order
- Run commit-pinned QA for each bead and integrated regression slice
- Publish:
  - rolling review
  - architecture check
  - refreshed Step 9d snapshot
  - frontend SOP delta

## Go/No-Go Gate
- Do not advance to next frontend wave unless:
  - all tranche beads are implemented
  - all tranche beads pass commit-pinned QA
  - Step 9d snapshot is published
  - SOP delta is updated

## Escalation Conditions
- Cross-worker merge conflicts affecting contract boundaries
- Failing critical journey tests
- Unclear bead ownership after split
- Evidence gaps blocking Step 9d publication
