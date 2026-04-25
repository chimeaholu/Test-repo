# Agrodomain UI System Spec

Date: 2026-04-19
Status: implemented in Batch 1-3 foundation layer, ready for deeper component expansion

## 1. Design principles

1. Trust before action
   Every protected flow shows status, policy, confidence, or fallback posture before the main mutation.

2. Field and desk parity
   The same interaction grammar must hold at 320px mobile and desktop without hiding critical state.

3. Command and evidence separation
   Primary action modules, runtime summaries, and audit/evidence panels should be visually distinct.

4. Dense, not cluttered
   Prefer compact summary bands, pills, and info lists over sprawling decorative sections.

5. Role-aware continuity
   The shell should always frame role, queue, identity, and connectivity posture.

## 2. Tokens

### Color

- `--bg-canvas`: warm agricultural canvas
- `--bg-panel`, `--bg-panel-strong`, `--bg-panel-soft`: translucent layered surfaces
- `--ink-strong`, `--ink`, `--ink-soft`, `--ink-muted`: text hierarchy
- `--brand`, `--brand-strong`, `--brand-soft`: primary operational green
- `--accent`, `--accent-strong`, `--accent-soft`: commerce and caution accent
- `--danger`, `--danger-soft`: terminal or risk states
- `--warning`, `--warning-soft`: degraded and review states

### Typography

- `--font-display`: expressive serif for headlines and major section titles
- `--font-body`: practical sans stack for body, controls, lists, and metadata
- Headline treatment: tight tracking, short line length, high contrast
- Body treatment: moderate line height with subdued secondary tone

### Radius

- `--radius-3xl` and `--radius-2xl`: page-level and surface-level cards
- `--radius-xl`, `--radius-lg`: list items, callouts, control modules
- `--radius-md`: form fields

### Elevation

- `--shadow-strong`: primary hero and sticky control emphasis
- `--shadow-soft`: default elevated surfaces
- `--shadow-quiet`: list items and pills

### Spacing

8px-derived scale:

- small: `--space-1` to `--space-3`
- component: `--space-4` to `--space-5`
- layout: `--space-6` to `--space-9`

## 3. Core primitives

### Surface types

- `hero-card`
  Use for entry points and page-defining context.

- `surface-card`
  Default structured section container.

- `queue-card`
  Operational panel for lists, timelines, and command groups.

- `metric-card`
  Tight numeric summary or KPI card.

- `signal-card` and `stat-chip`
  Small explanatory or summary units.

### Status language

- `status-pill.online`
- `status-pill.degraded`
- `status-pill.offline`
- `status-pill.neutral`

Rules:

- never use color alone to communicate state
- every pill includes text
- degraded states should appear before supporting explanation, not after

### Buttons

- `button-primary`: single best next action
- `button-secondary`: valid alternative or adjacent system action
- `button-ghost`: navigation, secondary review, or non-destructive supporting action

### Lists and info patterns

- `info-list`: key/value operational metadata
- `queue-list`: action queue, notifications, cards, or ledger rows
- `timeline`: sequence with explicit markers and visible status transition
- `stat-strip`: compressed summary band for route-level runtime posture

## 4. Page patterns

### A. Public entry pattern

Used for home, sign-in, consent.

- hero-first
- one dominant CTA group
- supporting signal/stat modules below or beside the hero
- form panel visually separated from narrative context

### B. Role home pattern

- shell context first
- summary band with consent, queue, and protected-route posture
- quick-action cards
- no chart-heavy clutter

### C. Feed/detail pattern

Used for buyer listings, advisory queue, climate alert center.

- left list or card feed
- right detail pane
- state pills visible in both list and detail
- summary strip at top

### D. Command/evidence pattern

Used for listings owner edit, negotiation, wallet actions.

- command surface on the left or top
- evidence/audit surface adjacent
- mutation receipts grouped separately from active controls

### E. Runtime summary pattern

Used for admin, finance, notifications, dispatch.

- route-level status and counts in first screenful
- operational details below
- empty states remain explicit

## 5. Motion rules

- subtle `fade-up` entry for major surfaces
- hover lift only for clearly interactive cards and buttons
- no large motion for critical decision controls
- honor `prefers-reduced-motion`

## 6. Empty, loading, and error states

### Empty

- must say whether the route is live and currently empty, or blocked/fallback
- should suggest the next safe action where possible

### Loading

- short sentence explaining what is being restored or loaded
- loading copy should reference the relevant system seam, not generic “please wait”

### Error

- render inline inside the same surface type as the blocked workflow
- keep route structure visible behind the error where possible

## 7. Accessibility rules

- visible focus states on all actionable controls
- preserve explicit labels for inputs
- avoid adding ARIA labels that collide with testable form labels
- mobile buttons should hit minimum tappable size
- status remains readable in text without relying on hue

## 8. Trust UX rules

- policy and consent state always precede protected actions
- wallet and escrow always show delivery/fallback posture near transition state
- buyer views never leak owner-only controls
- advisory and climate always show confidence or degraded-mode signals near the main answer
- admin surfaces reflect runtime truth, not optimistic placeholders
