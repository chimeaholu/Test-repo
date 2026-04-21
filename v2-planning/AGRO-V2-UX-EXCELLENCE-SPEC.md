# AGRO-V2-UX-EXCELLENCE-SPEC

## 1) Purpose
Define a non-negotiable UX excellence gate for `[[PRODUCT_NAME]]` so generic output is blocked and world-class trust-building UX is enforced.

## 2) UX Gate Policy
- Generic UX is an automatic fail condition.
- Release eligibility requires passing measurable UX, accessibility, and performance criteria.

## 3) Visual Language Requirements
- Typography system:
  - headline/body/support scales with explicit hierarchy rules.
- Color system:
  - semantic tokens (`primary`, `accent`, `success`, `warning`, `danger`, `trust`).
- Spacing/layout:
  - tokenized spacing scale and alignment standards.
- Information hierarchy:
  - primary action dominance, readable sections, confidence cues in high-risk flows.

## 4) Interaction and Motion Standards
- Required feedback states:
  - loading
  - success
  - recoverable error
  - terminal error
  - empty state
  - offline queued state
- Motion standards:
  - purposeful transitions only
  - no distracting decorative animations in critical flows.

## 5) Accessibility and Readability (Low-Literacy/Mobile-Tuned)
- Readability constraints:
  - concise copy
  - plain-language labels
  - clear action verbs.
- Accessibility baseline:
  - contrast compliance
  - touch target minimums
  - keyboard/screen-reader support in PWA.
- Contextual trust:
  - confirmation clarity for financial operations
  - explainability snippets for AI-driven recommendations.

## 6) Mobile-First UX Performance Requirements
- Low-end Android budget requirements for critical journeys:
  - first interaction responsiveness threshold
  - action confirmation latency thresholds
  - retry/queue clarity under unstable network.

## 7) Conversion and Completion Metrics
- Required UX metrics:
  - onboarding completion
  - offer-to-settlement completion
  - advisory action follow-through
  - dispute resolution completion
- Threshold breaches trigger UX remediation backlog before release.

## 8) Design Review Gate Checklist
Pre-build signoff:
1. visual language tokens approved
2. interaction pattern library approved
3. accessibility baseline reviewed
4. trust-pattern checklist complete

Pre-release signoff:
1. usability heuristics pass
2. conversion/completion metrics within thresholds
3. low-end Android UX performance checks pass
4. generic-pattern audit confirms no template-like output.

## 9) Test and Bead Traceability
- Requirements: `FR-110..FR-115`, `NFR-016..NFR-018`.
- Beads: `B-050..B-054`.
- Tests: `UXJ-*`, `UXDI-*`, `UXG-*`.

## 10) Definition of Done
- Design-system and interaction standards codified.
- UX gate test suite integrated in release pipeline.
- Explicit pass/fail evidence captured for each release candidate.
