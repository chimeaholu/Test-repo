# Agrodomain SOP 15 Compliance Delta

Date: 2026-04-13
Baseline artifact: `execution/reviews/2026-04-13-sop15-compliance-assessment.md`
Scope: delta generated after `B-010` remediation, formal QA refresh, Step `9d` snapshot, and `B-035` delivery

## Executive Delta

- Baseline score: `63.5%`
- Updated score: `65.4%`
- Net change: `+1.9 points`

Scoring basis remains the same as the baseline artifact:

- `Compliant = 1.0`
- `Partially Compliant = 0.5`
- `Non-Compliant = 0.0`
- Baseline: `16.5 / 26`
- Updated: `17.0 / 26`

## Changed Controls

| Control | Baseline | Updated | Delta |
| --- | --- | --- | --- |
| Step `13` test-results gate | `Partially Compliant` | `Compliant` | `B-010` exact-SHA failure was remediated, commit-pinned rerun passed, and the refreshed built-bead formal QA sweep now ends `PASS` instead of `FAIL`. |
| Step `9d` wave state snapshot | `Not separately evidenced` | `Evidenced` | New artifact: `2026-04-13T05-56-30Z-wave-state-snapshot.md`. This is supplemental evidence and not counted as an extra control because the baseline matrix tracked 26 controls only. |

## Execution Metrics Delta

| Metric | Baseline | Updated |
| --- | --- | --- |
| Built bead count | `10` | `11` |
| Formally QA-cleared built beads | `8` | `10` |
| QA-cleared / plan beads | `14.81%` | `18.52%` |
| QA-cleared / built beads | `80.00%` | `90.91%` |

## Closed Risk

- `B-010` exact-SHA formal QA failure is closed.

## Remaining High-Risk Gaps

- No Step `9c` mid-swarm architecture checkpoint artifact
- No Step `11` UBS static-analysis artifact
- No Step `12` Playwright desktop/mobile E2E proof package
- No Step `14` full project test-results report
- No documented Don approval/acceptance evidence
- No Agent Mail reservation/coordination evidence
- `.planning/STATE.md` and `.planning/ROADMAP.md` still lag actual execution maturity

## Delta Conclusion

This cycle materially improved execution quality and evidence density, but it did not close the major late-SOP governance and release gates. Agrodomain is still execution-partial under SOP 15, with the next leverage point being `B-012` / `B-015` delivery plus missing Step `9c` / `11` / `12` / `14` controls.
