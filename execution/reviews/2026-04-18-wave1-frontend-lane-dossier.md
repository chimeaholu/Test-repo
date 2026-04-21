# Agrodomain Wave 1 Frontend Lane Dossier

Date: 2026-04-18
Lane: Frontend specialist
Scope: `apps/web` UI architecture, role-aware IA, consent UX, offline-first state framing, accessibility states, mobile-first field interactions
Coordination target: task `89150647` web lane

## 1. Coordination and Lane Boundary

- This lane stayed inside `apps/web` and `execution/reviews`.
- No edits were made to `apps/api`, `apps/worker`, or `packages/contracts`.
- The implementation assumes task `89150647` continues to own the broader Wave 1 vertical slice, while this lane hardens the frontend interaction grammar and shell UX that the web lane can keep building on.
- To reduce conflict risk, the changes focused on reusable UI primitives, shell/navigation behavior, page-level state framing, and CSS tokens rather than reworking backend seams or contract shapes.

## 2. Frontend Reference Invocation

### Internal references explicitly used

1. `roles/frontend.md`
   - Used as the specialist posture for mobile-first, focus-visible, reduced-motion, and design-token discipline.
2. `/home/node/.codex/skills/plugins/SKILL.md`
   - Used as the available plugin-management reference in this environment.
3. Prior Agrodomain frontend artifacts:
   - `execution/reviews/2026-04-13-frontend-research-brief.md`
   - `execution/reviews/2026-04-13-frontend-architecture-ux-plan.md`
   - `execution/reviews/2026-04-13-frontend-convergence-decision.md`
4. Wave 0 architecture packet:
   - `execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md`

### UI UX ProMax / frontend plugin note

- I explicitly searched the workspace, `/home/node/.codex`, and local Claude settings surfaces for `UI UX Pro Max`, `UI UX ProMax`, and `frontend-design`.
- No local artifact or installable plugin entry for those exact names was present in this container.
- Because the artifact was unavailable, I used the closest available frontend references above plus the existing Agrodomain frontend research corpus as the effective internal exemplar set.

## 3. External Research Findings

### Accessibility and mobile control sizing

1. W3C WCAG 2.2 Target Size Minimum says undersized targets should be offset by spacing, and targets below `24x24 CSS px` are undersized.
   - Source: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
2. USWDS accessibility guidance reinforces semantic landmarks, predictable keyboard focus, page-state announcements, and never using visual elements alone for meaning.
   - Source: https://designsystem.digital.gov/documentation/accessibility/

### Offline and degraded-connectivity UX

3. web.dev offline UX guidance says users must be informed whether the app is ready for offline use, should be told clearly what is available offline, and should receive reassurance and feedback during state changes.
   - Source: https://web.dev/articles/offline-ux-design-guidelines
4. web.dev PWA offline-data guidance reinforces storage-backed offline state as a first-class design requirement rather than an afterthought.
   - Source: https://web.dev/learn/pwa/offline-data/

### Mobile-first navigation ergonomics

5. Material Design guidance says bottom navigation is primarily for mobile, best for `3-5` top-level destinations, and larger displays should shift to side navigation or rail patterns.
   - Source: https://m1.material.io/components/bottom-navigation.html

### Agri product pattern references

6. Plantix positions crop diagnosis, treatment advice, and farming knowledge around a strongly task-first farmer flow.
   - Source: https://plantix.net/en/
7. Apollo Agriculture frames financing, training, repayment, and insurance as one integrated farmer service journey rather than separate tools.
   - Source: https://www.apolloagriculture.com/farmer
8. Pula positions traceability, farmer registration, climate resilience, and insurance proof as explicit product artifacts tied to business and compliance outcomes.
   - Sources:
     - https://www.pula-advisors.com/
     - https://www.pula-advisors.com/productsandservices

## 4. Research to UI Rationale Matrix

| Research finding | Source | Concrete UI decision | Implemented in |
| --- | --- | --- | --- |
| Bottom navigation should stay to `3-5` top-level destinations on mobile, with side navigation on larger displays. | Material Design bottom navigation | Kept the mobile shell to `Home`, `Market`, `Inbox`, `Alerts`, `Profile`; preserved a desktop rail for larger viewports. | `apps/web/components/shell.tsx`, `apps/web/features/shell/model.ts`, `apps/web/app/globals.css` |
| Offline readiness must be explicit, stateful, and reassuring. | web.dev offline UX guidelines | Promoted connectivity, handoff channel, queue depth, and conflict count into the shell banner rather than hiding them inside a single outbox page. | `apps/web/components/shell.tsx`, `apps/web/app/app/offline/outbox/page.tsx` |
| Offline experiences need storage-backed state and clear recovery controls. | web.dev offline data | Preserved queue replay, dismiss, and conflict details as first-class surfaces, with summary info and deterministic recovery guidance. | `apps/web/app/app/offline/outbox/page.tsx`, `apps/web/app/app/offline/conflicts/[id]/page.tsx` |
| Keyboard focus, landmarks, and non-color-only meaning are required. | WCAG 2.2, USWDS | Added skip links, global focus-visible ring styling, semantic section headings, visible state pills, and alert roles for form errors. | `apps/web/app/layout.tsx`, `apps/web/app/globals.css`, `apps/web/app/signin/page.tsx`, `apps/web/app/onboarding/consent/page.tsx`, `apps/web/app/app/profile/page.tsx` |
| Farmer-facing agri tools work best with one dominant task instead of dashboard overload. | Plantix, internal 2026-04-13 research brief | Refactored role home into dominant-action hero + next actions + trust state, rather than static placeholder cards. | `apps/web/components/role-home.tsx`, `apps/web/features/shell/content.ts` |
| Financing/insurance products build trust by keeping repayment, insurance, and support context visible. | Apollo Agriculture | Framed consent state, protected-action status, policy version, and safe-next-step posture visibly on role home and profile pages. | `apps/web/components/role-home.tsx`, `apps/web/app/app/profile/page.tsx` |
| Traceability/compliance products need proof, ownership, and readiness cues inline. | Pula, internal architecture plan | Added proof/trust callouts, role posture notes, and explicit evidence-oriented copy throughout shell and role home. | `apps/web/components/shell.tsx`, `apps/web/components/role-home.tsx` |
| Prior Agrodomain plan said `queue before dashboard`, `proof before trust`, `offline is a normal state`, and `mobile thumb economy`. | `execution/reviews/2026-04-13-frontend-architecture-ux-plan.md` | Anchored the UI architecture around tokenized surfaces, queue-first home modules, short CTA labels, and reduced-motion, mobile-first behavior. | `apps/web/app/globals.css`, `apps/web/components/ui-primitives.tsx`, `apps/web/components/role-home.tsx` |

## 5. Implemented Changes

### Design tokens and primitives

- Added a reusable UI layer:
  - `apps/web/components/ui-primitives.tsx`
- Added role-content metadata for consistent role-aware copy and task posture:
  - `apps/web/features/shell/content.ts`
- Reworked `apps/web/app/globals.css` into a more explicit token and state system:
  - semantic color tokens
  - focus ring token
  - reduced-motion handling
  - role-home/dashboard/task-card/layout utility classes
  - mobile and desktop navigation behavior

### Role-aware shell and IA

- Upgraded the shell to:
  - expose connectivity and handoff state prominently
  - keep desktop rail and mobile bottom nav aligned
  - add skip links and better heading structure
  - make trust posture explicit by role
- Files:
  - `apps/web/components/shell.tsx`
  - `apps/web/features/shell/model.ts`

### Sign-in, consent, and offline recovery UX

- Reworked sign-in and consent screens to:
  - use shorter, field-safe copy
  - explain why each step exists
  - expose policy and scope data before submission
  - provide better form help and error semantics
- Reworked outbox, conflict, and profile routes to:
  - present recovery posture, not just raw placeholder text
  - keep queue and consent state legible and inspectable
- Files:
  - `apps/web/app/signin/page.tsx`
  - `apps/web/app/onboarding/consent/page.tsx`
  - `apps/web/app/app/offline/outbox/page.tsx`
  - `apps/web/app/app/offline/conflicts/[id]/page.tsx`
  - `apps/web/app/app/profile/page.tsx`

### Runtime polish

- Added `apps/web/app/icon.svg` to remove the missing favicon runtime error seen in the first browser smoke.
- Fixed a real React issue in the consent page by moving `ensureConsentPending()` out of render and into `useEffect`.

## 6. Quality Gate Evidence

### Static gates

- `corepack pnpm --filter @agrodomain/web typecheck`
  - PASS
- `corepack pnpm --filter @agrodomain/web test`
  - PASS
  - `4` test files passed
  - `9` tests passed
- `corepack pnpm --filter @agrodomain/web build`
  - PASS

### Build output evidence

- Next build generated these relevant route budgets:
  - `/` first load JS: `105 kB`
  - `/app/[role]` first load JS: `112 kB`
  - `/app/offline/outbox` first load JS: `110 kB`
  - `/signin` first load JS: `123 kB`
  - `/onboarding/consent` first load JS: `123 kB`

### Browser smoke evidence

Local runtime used:
- `./node_modules/.bin/next dev --hostname 127.0.0.1 --port 3001`

Verified routes:
1. `/signin`
2. `/onboarding/consent`
3. `/app/farmer`

Artifacts captured by Playwright:
- Sign-in mobile screenshot:
  - `.playwright-mcp/page-2026-04-18T03-55-22-736Z.png`
- Consent mobile screenshot:
  - `.playwright-mcp/page-2026-04-18T03-55-43-450Z.png`
- Farmer role-home mobile screenshot:
  - `.playwright-mcp/page-2026-04-18T03-56-04-783Z.png`

Runtime console state after fixes:
- `/signin`: no console errors
- `/onboarding/consent`: no console errors
- `/app/farmer`: no console errors

### Defect found and fixed during gate

- Issue:
  - `ConsentPage` called `ensureConsentPending()` during render, causing a React state update warning.
- Fix:
  - moved the state transition into `useEffect`.
- File:
  - `apps/web/app/onboarding/consent/page.tsx`

## 7. Suggested Handoff to Task 89150647

- Keep building the Wave 1 vertical slice on top of this shell and primitive layer rather than introducing a second styling grammar.
- Reuse `ROLE_EXPERIENCE`, `SectionHeading`, `SurfaceCard`, `InfoList`, and `StatusPill` for the next marketplace and role-detail surfaces to minimize churn.
- Preserve the queue-first, proof-before-trust rule when implementing deeper listing, negotiation, and finance screens.
