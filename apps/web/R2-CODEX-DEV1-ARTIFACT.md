# R2 Codex-Dev-1 Artifact — RB-024 + RB-026

**Lane:** codex-dev-1
**Wave:** R2 (Support Lane)
**Date:** 2026-04-24
**Dependencies satisfied:** RB-016, RB-003, RB-017, RB-022

---

## RB-024: Sign-Up Multi-Step Flow

### Files Created (6)

| File | Size | Purpose |
|------|------|---------|
| `app/signup/page.tsx` | 11.1 KB | 3-step signup orchestrator with full validation, state management, and real API submit via `useAppState().signIn()` |
| `app/signup/layout.tsx` | 403 B | SEO metadata (title, description) |
| `components/auth/signup-step-identity.tsx` | 6.6 KB | Step 1: Role cards (6 roles), full name, email, phone with country prefix, password, country select |
| `components/auth/signup-step-profile.tsx` | 17.0 KB | Step 2: Role-specific fields (Farmer/Buyer/Cooperative/Transporter/Investor/Extension Agent) with chip selectors, radios, selects |
| `components/auth/signup-step-verification.tsx` | 3.9 KB | Step 3: OTP input (stub), Terms + Privacy consent (required), Notifications consent (required), Marketing opt-in (optional) |
| `components/auth/password-strength.tsx` | 2.0 KB | Password strength indicator (4-bar + label) |

### Acceptance Criteria Status

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Step indicator shows progress (1/3, 2/3, 3/3) | PASS — uses R1 `StepIndicator` molecule |
| 2 | Back button preserves filled data | PASS — state lifted to page, `useState` persists across steps |
| 3 | Role-specific profile fields render based on Step 1 role | PASS — 6 role variants implemented |
| 4 | Form data persists in state across steps | PASS — `identityData`, `profileData`, `verificationData` never reset on navigation |
| 5 | Final submit calls real API to create user | PASS — calls `signIn()` from `AppProvider`, which hits `/api/v1/identity/session` and navigates to `/onboarding/consent` |
| 6 | Validation runs on each step before allowing advance | PASS — `validateIdentity`, `validateProfile`, `validateVerification` block progression |

### Auth Integration

- Uses the **real** `useAppState().signIn()` from R0's `AppProvider`
- Sign-in calls the API at `/api/v1/identity/session`, stores token + session in localStorage, syncs session cookie
- On success, navigates to `/onboarding/consent` (existing R0 consent flow)
- Role mapping: `transporter` maps to `cooperative` (closest API-compatible role; full role expansion is a future bead)

### R1 Atoms/Molecules Used

- `Button` (primary, ghost variants)
- `Input` / `Textarea`
- `Select`
- `Checkbox`
- `RadioGroup`
- `FormField`
- `StepIndicator`
- Design system CSS classes: `ds-btn`, `ds-input`, `ds-form-field`, `ds-form-error`, `ds-steps`

---

## RB-026: About, Features, Contact Pages

### Files Created (3)

| File | Size | Purpose |
|------|------|---------|
| `app/about/page.tsx` | 15.3 KB | Server component. Hero, Mission/Vision cards, Problem stats (3), Focus Areas (4), Team, Careers CTA, Final CTA |
| `app/features/page.tsx` | 17.0 KB | Server component. Hero, sticky module sub-nav (8 anchors), 8 module sections with alternating layout, feature lists, use-case quotes |
| `app/contact/page.tsx` | 20.7 KB | Client component. Hero, 3 support channel cards (WhatsApp/Email/Phone), contact form with validation, FAQ accordion (8 items), 3 office locations |

### Acceptance Criteria Status

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Consistent layout with header/footer | PASS — all use `page-shell` layout from R1, rely on root layout's `AppProvider` |
| 2 | Fully responsive | PASS — `auto-fit` grids, `clamp()` font sizes, mobile-first |
| 3 | Contact form validates inputs | PASS — name, email (regex), subject, message (min 10 chars) validated before submit |
| 4 | Features page loads fast | PASS — server component, no client JS; image placeholders (lazy-loadable when real screenshots arrive) |
| 5 | SEO meta tags present | PASS — `metadata` export on About + Features (server components); Contact is client but inherits from root |

### Content Quality

- All copy is customer-facing, production-quality, Africa-focused
- Module descriptions, use-case stories, and attributions match the PRD verbatim
- FAQ answers are substantive and accurate to the platform's capabilities
- Design tokens reference `var(--color-brand-*)`, `var(--color-accent-*)`, `var(--ink)`, `var(--ink-muted)` from R1

---

## Route Safety

All new routes (`/signup`, `/about`, `/features`, `/contact`) are public — they do not start with `/app`, so `getRouteDecision()` in `features/shell/model.ts` returns `{ allowed: true }` with no redirects. No changes to the auth guard were needed.

---

## TypeScript Validation

```
tsc --noEmit: 0 errors in new files
Pre-existing errors: 2 (stale .next/types cache — unrelated)
```

---

## Readiness for RB-027 (Public Pages E2E Tests)

The following testable surfaces are ready:

1. **Sign-up flow**: Navigate to `/signup` → select role → fill identity → fill profile → enter OTP + consent → submit
2. **Step navigation**: Continue/Back buttons, validation blocking, step indicator state
3. **Role-specific fields**: 6 role variants with distinct form fields
4. **About page**: `/about` — hero, mission/vision, stats, focus areas, team, careers CTA
5. **Features page**: `/features` — hero, sticky sub-nav with 8 anchor links, 8 module sections
6. **Contact page**: `/contact` — support channels, form submission + validation + success state, FAQ accordion toggle, office locations

All pages share the root layout (`AppProvider`, fonts, CSS) and are reachable from the landing page's nav.
