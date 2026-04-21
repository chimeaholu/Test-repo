# Agrodomain Frontend Quality Gate

This checklist blocks low-quality UI from entering production. If any item below fails, the work is not ready for merge or deploy.

## 1. Visual Direction
- A page must use the shared token system for color, typography, radius, spacing, and elevation.
- A page must show a clear hierarchy: eyebrow, page title, page summary, then action area.
- A page must preserve the Agrodomain visual language: grounded surfaces, earthy accent palette, and deliberate serif-plus-sans type pairing.
- New UI must not introduce ad hoc colors, spacing values, or one-off border radii in component files.

## 2. Responsive Quality
- Every page must be usable at 360px, 768px, 1024px, and 1440px widths without horizontal scroll.
- Primary actions must stay visible or easily reachable on mobile without requiring deep scroll hunts.
- Dense desktop layouts must add useful parallel context, not simply stretch single-column content across wide screens.
- Bottom navigation and desktop rail must keep the same information scent across breakpoints.

## 3. Accessibility
- Skip link, heading order, landmark usage, and keyboard focus must work on every route.
- Interactive controls must meet a 44px minimum hit target on touch layouts.
- Text contrast must remain readable against all surfaces and gradients.
- Form fields require a visible label, helper text where needed, and non-color-only state indication.
- Status, queue priority, and risk posture cannot rely on color alone.

## 4. Information Architecture
- Role home pages must begin with actionable work, not charts or empty feature menus.
- Proof, evidence, or policy context must be visible before a user commits to a meaningful decision.
- Notifications must deep-link into canonical workflows instead of becoming parallel mini apps.
- Cross-role navigation must remain in the shell; role switching inside page content is a smell and should be challenged.

## 5. Production Readiness
- Components must be composed from shared primitives or elevate new primitives into the shared layer.
- Page copy must stay concrete and operational. Avoid vague dashboard filler language.
- Customer-facing routes must not ship internal rollout or engineering lexicon such as `Wave`, `W-001`, `recovery seam`, `internal contract`, or similar internal-only labels.
- Offline, retry, empty, and error states must be designed intentionally for any workflow with network dependence.
- Route implementation must stay contract-first. Do not invent unsupported business states for visual convenience.
- `corepack pnpm --filter @agrodomain/web typecheck` and `corepack pnpm --filter @agrodomain/web build` must pass before handoff.
- Release evidence must include desktop and mobile acceptance screenshots for `/`, `/signin`, `/onboarding/consent`, and the default role home. Missing proof blocks release.

## 6. Review Prompts
- What is the first urgent action for this role, and is it obvious in under five seconds?
- Where does the user see proof before trusting the outcome?
- What changes between mobile and desktop, and does each difference improve task completion?
- Which part of this UI would fail first on a low-end Android device, and how was that risk reduced?
