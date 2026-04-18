# Agrodomain Frontend User-Journey Test Plan

Date: 2026-04-13
Track: Frontend Phase A
Scope: critical, error, responsive, and data-integrity journeys for the first frontend implementation wave

## Test Strategy
- Critical journeys prove the platform can complete its highest-value user tasks.
- Error journeys prove recovery is explicit, deterministic, and user-safe.
- Responsive journeys prove role surfaces remain usable across mobile and desktop breakpoints.
- Data-integrity journeys prove UI state does not drift from backend contract truth during retries, approvals, or evidence review.

## Journey Matrix
| ID | Class | Scenario | Entry Path | Expected Assertion |
| --- | --- | --- | --- | --- |
| `FJ-C01` | `critical` | Farmer onboarding and consent | Sign-in -> consent -> workspace home | Consent state and language preference persist correctly |
| `FJ-C02` | `critical` | Listing draft to publish | Farmer home -> listing wizard -> listing detail | Published listing reflects correct version and status |
| `FJ-C03` | `critical` | Buyer offer to confirmation | Listing detail -> negotiation thread -> confirmation | Thread state reaches accepted or rejected deterministically |
| `FJ-C04` | `critical` | Escrow funding happy path | Negotiation accepted -> escrow center -> funded state | Ledger-derived status renders without duplicate commits |
| `FJ-C05` | `critical` | Advisory request to cited answer | Advisory composer -> answer detail -> citations | Citation count, labels, and freshness render correctly |
| `FJ-C06` | `critical` | Climate alert review | Alert center -> detail -> follow-up action | Severity, threshold, and provenance remain visible |
| `FJ-C07` | `critical` | Finance reviewer approval flow | Finance queue -> detail -> approve/reject | Queue state and audit trail update safely |
| `FJ-C08` | `critical` | Traceability evidence review | Traceability timeline -> evidence gallery | Attachment/event relationships remain intact |
| `FJ-E01` | `error` | Network loss during listing publish | Create listing offline or mid-drop | Action moves to outbox and user sees retry path |
| `FJ-E02` | `error` | Conflict during offer replay | Negotiation write replay encounters conflict | Conflict view explains winning version and next action |
| `FJ-E03` | `error` | Policy-blocked escrow release | Escrow release denied by policy | UI shows block reason and escalates safely |
| `FJ-E04` | `error` | Partner timeout on funding | Escrow funding timeout | UI shows pending, not false failure |
| `FJ-E05` | `error` | Filtered-empty finance queue | Filters remove all visible queue items | UI differentiates filtered empty from no work |
| `FJ-E06` | `error` | Evidence upload validation failure | Invalid file type or size | UI preserves metadata and asks for valid replacement |
| `FJ-R01` | `responsive` | Farmer home at 320px | Open farmer queue on low-end mobile width | No horizontal scroll, primary CTA visible |
| `FJ-R02` | `responsive` | Listing detail at 375px | Inspect listing and open offer | Trust markers remain visible above fold |
| `FJ-R03` | `responsive` | Negotiation thread at tablet width | Open active thread on 768px | Timeline and composer remain usable |
| `FJ-R04` | `responsive` | Finance queue at desktop width | Review queue on 1440px | Split-pane density improves throughput |
| `FJ-R05` | `responsive` | Analytics cockpit fallback on mobile | Open analytics on 375px | Summary KPIs appear instead of broken charts |
| `FJ-D01` | `data-integrity` | Consent revocation reflects immediately | Profile -> revoke consent | Route guards and status badges update correctly |
| `FJ-D02` | `data-integrity` | Queued write replay stays idempotent | Retry listing or offer mutation | No duplicate object or duplicate state transition |
| `FJ-D03` | `data-integrity` | Escrow timeline matches server state | Refresh during pending/funded/released states | Timeline never contradicts backend state |
| `FJ-D04` | `data-integrity` | Finance queue filter state preserved | Filter, review, return | Queue state and selection do not drift |
| `FJ-D05` | `data-integrity` | Evidence gallery ordering preserved | Open consignment with many attachments | Events remain chronological and attached to correct stage |
| `FJ-D06` | `data-integrity` | Analytics anonymization preserved | Inspect enterprise row details | No raw seller or listing identifiers leak to UI |

## Required Assertions by Category
### Critical Journeys
- `FJ-C01` Farmer onboarding and consent: Consent state and language preference persist correctly.
- `FJ-C02` Listing draft to publish: Published listing reflects correct version and status.
- `FJ-C03` Buyer offer to confirmation: Thread state reaches accepted or rejected deterministically.
- `FJ-C04` Escrow funding happy path: Ledger-derived status renders without duplicate commits.
- `FJ-C05` Advisory request to cited answer: Citation count, labels, and freshness render correctly.
- `FJ-C06` Climate alert review: Severity, threshold, and provenance remain visible.
- `FJ-C07` Finance reviewer approval flow: Queue state and audit trail update safely.
- `FJ-C08` Traceability evidence review: Attachment/event relationships remain intact.

### Error Journeys
- `FJ-E01` Network loss during listing publish: Action moves to outbox and user sees retry path.
- `FJ-E02` Conflict during offer replay: Conflict view explains winning version and next action.
- `FJ-E03` Policy-blocked escrow release: UI shows block reason and escalates safely.
- `FJ-E04` Partner timeout on funding: UI shows pending, not false failure.
- `FJ-E05` Filtered-empty finance queue: UI differentiates filtered empty from no work.
- `FJ-E06` Evidence upload validation failure: UI preserves metadata and asks for valid replacement.

### Responsive Journeys
- `FJ-R01` Farmer home at 320px: No horizontal scroll, primary CTA visible.
- `FJ-R02` Listing detail at 375px: Trust markers remain visible above fold.
- `FJ-R03` Negotiation thread at tablet width: Timeline and composer remain usable.
- `FJ-R04` Finance queue at desktop width: Split-pane density improves throughput.
- `FJ-R05` Analytics cockpit fallback on mobile: Summary KPIs appear instead of broken charts.

### Data-Integrity Journeys
- `FJ-D01` Consent revocation reflects immediately: Route guards and status badges update correctly.
- `FJ-D02` Queued write replay stays idempotent: No duplicate object or duplicate state transition.
- `FJ-D03` Escrow timeline matches server state: Timeline never contradicts backend state.
- `FJ-D04` Finance queue filter state preserved: Queue state and selection do not drift.
- `FJ-D05` Evidence gallery ordering preserved: Events remain chronological and attached to correct stage.
- `FJ-D06` Analytics anonymization preserved: No raw seller or listing identifiers leak to UI.

## Test Environment Notes
- Desktop reference viewport: 1440 x 1200.
- Mobile reference viewport: 375 x 812, with an additional 320px survival check for farmer-critical flows.
- Connectivity profiles: normal broadband, unstable 3G, offline, and replay-after-resume.
- Role fixtures: farmer, buyer, cooperative operator, advisor, finance reviewer, and admin.
- Accessibility checks run on the same routes with keyboard-only completion and focus order assertions.
