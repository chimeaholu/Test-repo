# AGRODOMAIN ENHANCED REMEDIATION — CODEX-ONLY SWARM EXECUTION PLAN

**Document Version:** 1.0
**Date:** 2026-04-23
**Classification:** Internal — Swarm Orchestration Blueprint (Codex-Only)
**Prerequisite:** AGRODOMAIN-ENHANCED-REMEDIATION-PRD.md (Sections A-C remain unchanged)
**Purpose:** This document replaces Section D of the Enhanced Remediation PRD. It reassigns all 72 beads from a dual Claude+Codex swarm to a **Codex-only swarm** using GPT 5.4 with high reasoning. All bead specifications, acceptance criteria, file boundaries, and quality gates remain identical — only worker assignments and coordination rules change.

---

## WHY CODEX-ONLY

Claude Opus credits are exhausted. Rather than wait for credit renewal, the entire 9-wave build transitions to Codex CLI agents running GPT 5.4 with high reasoning effort. The Codex agents have identical MCP server access (Notion, Supabase, Firecrawl, Cloudinary, N8N, Playwright, GDrive, Otter, QMD) and the same file system visibility inside the Docker container.

---

## AGENT ROSTER (CODEX-ONLY)

| Original Worker | New Worker | Session Name | Role |
|----------------|------------|-------------|------|
| @architect | **@codex-architect** | `codex-architect` | System design, API client architecture, PRD interpretation |
| @frontend | **@codex-frontend** | `codex-frontend` | React/Next.js UI implementation, component design |
| @builder | **@codex-builder** | `codex-builder` | Full-stack implementation, backend wiring, seeding |
| @claude-dev-1 | **@codex-dev-1** | `codex-dev-1` | Swarm implementation worker 1 |
| @claude-dev-2 | **@codex-dev-2** | `codex-dev-2` | Swarm implementation worker 2 |
| @qa-engineer | **@codex-qa-engineer** | `codex-qa-engineer` | E2E testing, Playwright, QA gates |
| @review-code | **@codex-code-reviewer** | `codex-code-reviewer` | Adversarial code review |
| @review-arch | **@codex-arch-reviewer** | `codex-arch-reviewer` | Architecture review, security audit |
| @review-plan | **@codex-plan-reviewer** | `codex-plan-reviewer` | Plan convergence gate |

**Total active workers:** 8 unique Codex sessions (codex-architect, codex-frontend, codex-builder, codex-dev-1, codex-dev-2, codex-qa-engineer, codex-code-reviewer, codex-arch-reviewer)

**Consolidation note:** In the original dual-swarm plan, @claude-dev-1 and @claude-dev-2 were separate from @codex-dev-1 and @codex-dev-2 (4 implementation workers). In this Codex-only plan, we consolidate to 2 implementation workers (@codex-dev-1, @codex-dev-2) who absorb the work of all 4. Beads previously assigned to @claude-dev-1 are reassigned to @codex-dev-1. Beads previously assigned to @claude-dev-2 are reassigned to @codex-dev-2. This maintains the same parallelism lanes with 2 workers instead of 4, which is appropriate given that each Codex session runs GPT 5.4 with high reasoning (equivalent capability per agent).

---

## COMPLETE BEAD ASSIGNMENT TABLE (ALL 72 BEADS)

### WAVE R0: WIRE FRONTEND TO BACKEND (13 beads, 33 pts, 2 weeks)

> **Goal:** Replace the 84KB mock-client.ts with a real API client. Wire every page to the real FastAPI backend. This is the single highest-leverage change.

| Bead | Title | Worker | Complexity | Dependencies |
|------|-------|--------|-----------|-------------|
| RB-001 | API Client Module — Core HTTP Layer | **@codex-architect** | L | None |
| RB-002 | API Client — Domain Service Modules | **@codex-architect** | XL | RB-001 |
| RB-003 | Auth Integration — Real Session Flow | **@codex-frontend** | L | RB-001 |
| RB-004 | Consent and Profile — Real API Integration | **@codex-frontend** | M | RB-003 |
| RB-005 | Marketplace Pages — Wire to Real API | **@codex-dev-1** | L | RB-002, RB-003 |
| RB-006 | Wallet Pages — Wire to Real API | **@codex-dev-2** | L | RB-002, RB-003 |
| RB-007 | Climate/Advisory/Trace/Notif — Wire to API | **@codex-dev-1** | L | RB-002, RB-003 |
| RB-008 | Finance/Coop/Offline — Wire to Real API | **@codex-dev-2** | L | RB-002, RB-003 |
| RB-009 | Database Demo Seeding Script | **@codex-builder** | M | None |
| RB-010 | Error Handling and Loading States | **@codex-frontend** | M | RB-003 |
| RB-011 | Remove mock-client.ts | **@codex-frontend** | S | RB-005 through RB-008 |
| RB-012 | R0 E2E Smoke Test Suite | **@codex-qa-engineer** | L | RB-005 through RB-009 |
| RB-013 | App Provider Consolidation | **@codex-frontend** | M | RB-003 |

**R0 Lane Diagram (Codex-Only):**

```
Lane 1 (@codex-architect):    RB-001 --> RB-002 ------------------------------------->
                                [API Client]  [Domain Services]
                                               |
Lane 2 (@codex-frontend):              RB-003 --> RB-004 --> RB-013 --> RB-010 --> RB-011
                                         [Auth]     [Consent]   [AppProv]  [Errors]   [Remove Mock]
                                                     |
Lane 3 (@codex-dev-1):                              +---> RB-005 (marketplace) ------->
                                                     |    --> RB-007 (climate/adv) --->
                                                     |
Lane 4 (@codex-dev-2):                              +---> RB-006 (wallet) ----------->
                                                     |    --> RB-008 (finance/coop) -->
                                                     |
Lane 5 (@codex-builder):     RB-009 ----------------+ (can start immediately)
                              [DB Seeding]

Lane 6 (@codex-qa-engineer):                                         RB-012 ---------->
                                                                      [E2E Smoke]
                                                                      (after RB-005..RB-009)
```

**File Boundaries (R0):**

| Bead | Worker | Exclusive Files |
|------|--------|----------------|
| RB-001 | @codex-architect | apps/web/lib/api-client.ts, api-client.test.ts, api-types.ts, .env.* |
| RB-002 | @codex-architect | apps/web/lib/api/*.ts (entire directory) |
| RB-003 | @codex-frontend | apps/web/app/signin/page.tsx, auth-context.tsx, auth-provider.tsx, middleware.ts |
| RB-004 | @codex-frontend | apps/web/app/onboarding/consent/page.tsx, profile/page.tsx |
| RB-005 | @codex-dev-1 | apps/web/features/listing-slice.tsx, negotiation-inbox.tsx, app/market/** |
| RB-006 | @codex-dev-2 | apps/web/features/wallet-dashboard.tsx, wallet-workspace.tsx, app/payments/** |
| RB-007 | @codex-dev-1 | apps/web/features/climate-dashboard.tsx, conversation-workspace.tsx, traceability-workspace.tsx, notification-center.tsx, app/climate/**, app/advisory/**, app/advisor/**, app/traceability/**, app/notifications/** |
| RB-008 | @codex-dev-2 | apps/web/features/finance-review-console.tsx, cooperative-dispatch-board.tsx, app/finance/**, app/cooperative/**, app/offline/** |
| RB-009 | @codex-builder | apps/api/app/seed_demo_data.py, apps/api/scripts/seed.sh |
| RB-010 | @codex-frontend | apps/web/components/error-boundary.tsx, lib/hooks/use-api-query.ts, use-api-mutation.ts, components/api-error-display.tsx, app/**/error.tsx, app/**/loading.tsx |
| RB-011 | @codex-frontend | apps/web/lib/mock-client.ts (DELETE) |
| RB-012 | @codex-qa-engineer | tests/e2e/r0-smoke.spec.ts |
| RB-013 | @codex-frontend | apps/web/lib/app-provider.tsx |

---

### WAVE R1: VISUAL IDENTITY AND DESIGN SYSTEM (8 beads, 24 pts, 2 weeks)

> **Goal:** Establish the complete design token system and reusable component library.

| Bead | Title | Worker | Complexity | Dependencies |
|------|-------|--------|-----------|-------------|
| RB-014 | Design Token CSS Variables | **@codex-frontend** | L | R0 complete |
| RB-015 | Typography Scale System | **@codex-frontend** | M | RB-014 |
| RB-016 | Atom Components (Button, Input, Badge, etc.) | **@codex-dev-1** | XL | RB-014 |
| RB-017 | Layout Components (Header, Sidebar, Shell) | **@codex-dev-2** | L | RB-014, RB-016 |
| RB-018 | Data Display Components (Table, Card, Stat) | **@codex-dev-1** | L | RB-016 |
| RB-019 | Form Components (Select, DatePicker, FileUpload) | **@codex-frontend** | L | RB-016 |
| RB-020 | Design System Documentation and Storybook | **@codex-arch-reviewer** | M | RB-016 through RB-019 |
| RB-021 | Responsive and Dark Mode Token Variants | **@codex-frontend** | M | RB-014 |

---

### WAVE R2: PUBLIC PAGES AND ONBOARDING (6 beads, 16 pts, 1 week)

> **Goal:** Build all public-facing pages and the complete onboarding flow.

| Bead | Title | Worker | Complexity | Dependencies |
|------|-------|--------|-----------|-------------|
| RB-022 | Landing Page | **@codex-frontend** | L | R1 atoms complete |
| RB-023 | Sign In / Sign Up Pages | **@codex-frontend** | M | RB-022 |
| RB-024 | Onboarding Wizard (4-step) | **@codex-dev-1** | L | RB-023 |
| RB-025 | About / Features / Contact Pages | **@codex-dev-2** | M | RB-022 |
| RB-026 | R2 E2E Tests (Onboarding Journey) | **@codex-qa-engineer** | M | RB-024 |
| RB-027 | R2 Visual Regression Baseline | **@codex-frontend** | S | RB-022 through RB-025 |

---

### WAVE R3: ROLE DASHBOARDS AND NAVIGATION (9 beads, 20 pts, 2 weeks)

> **Goal:** Build all 6 role-specific dashboards with real data, plus navigation/notifications/settings.

| Bead | Title | Worker | Complexity | Dependencies |
|------|-------|--------|-----------|-------------|
| RB-028 | Farmer Dashboard | **@codex-frontend** | L | R2 complete |
| RB-029 | Buyer Dashboard | **@codex-dev-1** | M | R2 complete |
| RB-030 | Cooperative Dashboard | **@codex-dev-2** | M | R2 complete |
| RB-031 | Transporter Dashboard | **@codex-dev-1** | M | R2 complete |
| RB-032 | Investor Dashboard | **@codex-dev-2** | M | R2 complete |
| RB-033 | Extension Agent Dashboard | **@codex-dev-1** | M | R2 complete |
| RB-034 | Navigation System and Role Switching | **@codex-frontend** | M | RB-028 |
| RB-035 | Notifications and Settings Pages | **@codex-dev-2** | M | RB-034 |
| RB-036 | R3 E2E Tests (Dashboard Journeys) | **@codex-qa-engineer** | L | RB-028 through RB-035 |

---

### WAVE R4: AGROMARKET — COMPLETE MARKETPLACE (8 beads, 24 pts, 2 weeks)

> **Goal:** Full marketplace with listing CRUD, search, negotiation, and quality attestation.

| Bead | Title | Worker | Complexity | Dependencies |
|------|-------|--------|-----------|-------------|
| RB-037 | Marketplace Home and Search | **@codex-frontend** | L | R3 complete |
| RB-038 | Listing Creation Wizard (4-step) | **@codex-dev-1** | L | RB-037 |
| RB-039 | Listing Detail Page | **@codex-dev-2** | M | RB-037 |
| RB-040 | Listing Edit and Management | **@codex-dev-1** | M | RB-038 |
| RB-041 | Negotiation System | **@codex-dev-2** | L | RB-039 |
| RB-042 | Quality Attestation Module | **@codex-dev-1** | M | RB-039 |
| RB-043 | Marketplace R4 E2E Tests | **@codex-qa-engineer** | L | RB-037 through RB-042 |
| RB-044 | Marketplace Performance Optimization | **@codex-frontend** | M | RB-043 |

---

### WAVE R5: AGROWALLET AND AGROFUND (8 beads, 24 pts, 2 weeks — parallel with R4)

> **Goal:** Complete wallet operations, escrow, and crowdfunding portal.

| Bead | Title | Worker | Complexity | Dependencies |
|------|-------|--------|-----------|-------------|
| RB-045 | Wallet Home and Balance Display | **@codex-frontend** | M | R3 complete |
| RB-046 | Add Funds Flow | **@codex-dev-1** | L | RB-045 |
| RB-047 | Send Money and P2P Transfer | **@codex-dev-2** | L | RB-045 |
| RB-048 | Escrow Integration | **@codex-dev-1** | L | RB-047 |
| RB-049 | AgroFund Portal Home | **@codex-dev-2** | M | R3 complete |
| RB-050 | Fund-a-Farm and Investment Detail | **@codex-dev-1** | L | RB-049 |
| RB-051 | My Investments and Returns Tracking | **@codex-dev-2** | M | RB-050 |
| RB-052 | R5 E2E Tests (Wallet and Fund Journeys) | **@codex-qa-engineer** | L | RB-045 through RB-051 |

---

### WAVE R6: AGROFARM, AGROSHIELD, AGROWEATHER (5 beads, 18 pts, 2 weeks)

> **Goal:** Farm management, parametric insurance, and weather intelligence modules.

| Bead | Title | Worker | Complexity | Dependencies |
|------|-------|--------|-----------|-------------|
| RB-053 | AgroFarm — Farm Home and Field Detail | **@codex-frontend** | L | R4 + R5 complete |
| RB-054 | AgroFarm — Input Tracking and Crop Calendar | **@codex-dev-1** | L | RB-053 |
| RB-055 | AgroShield — Insurance Home and Get Coverage | **@codex-dev-2** | L | RB-053 |
| RB-056 | AgroWeather — Weather Home and Forecasts | **@codex-builder** | L | RB-053 |
| RB-057 | R6 E2E Tests | **@codex-qa-engineer** | L | RB-053 through RB-056 |

---

### WAVE R7: AGROTRUCKER, AGROGUIDE, AGROINSIGHTS (5 beads, 18 pts, 2 weeks)

> **Goal:** Transport logistics, AI advisory, and analytics modules.

| Bead | Title | Worker | Complexity | Dependencies |
|------|-------|--------|-----------|-------------|
| RB-058 | AgroTrucker — Transport Home and Post Load | **@codex-builder** | L | R6 complete |
| RB-059 | AgroTrucker — Shipment Tracking and POD | **@codex-frontend** | L | RB-058 |
| RB-060 | AgroGuide — Floating AI Advisory Panel | **@codex-dev-1** | L | R6 complete |
| RB-061 | AgroInsights — Analytics Dashboard | **@codex-dev-2** | L | R6 complete |
| RB-062 | R7 E2E Tests | **@codex-qa-engineer** | L | RB-058 through RB-061 |

---

### WAVE R8: POLISH, PERFORMANCE AND LAUNCH READINESS (10 beads, 25 pts, 2 weeks)

> **Goal:** Final quality pass — accessibility, performance, PWA, SEO, security, cross-browser, docs.

| Bead | Title | Worker | Complexity | Dependencies |
|------|-------|--------|-----------|-------------|
| RB-063 | Accessibility Audit and Fixes (WCAG 2.1 AA) | **@codex-qa-engineer** | L | All previous |
| RB-064 | Performance Optimization (Lighthouse >= 90) | **@codex-frontend** | L | All previous |
| RB-065 | PWA Configuration | **@codex-dev-1** | M | RB-064 |
| RB-066 | SEO Optimization | **@codex-dev-2** | M | RB-022, RB-026 |
| RB-067 | Error Boundary Hardening | **@codex-frontend** | M | RB-010 |
| RB-068 | Security Audit (OWASP Top 10) | **@codex-arch-reviewer** | L | All previous |
| RB-069 | Cross-Browser Testing | **@codex-qa-engineer** | M | All previous |
| RB-070 | Load Testing (k6/Artillery) | **@codex-builder** | M | All API endpoints |
| RB-071 | Documentation (API, Components, Deploy) | **@codex-dev-1** | L | All previous |
| RB-072 | Final E2E Regression Suite | **@codex-qa-engineer** | XL | All previous |

---

## WORKER LOAD DISTRIBUTION

| Worker | Total Beads | Waves Active |
|--------|------------|-------------|
| @codex-architect | 2 | R0 |
| @codex-frontend | 20 | R0, R1, R2, R3, R4, R5, R6, R7, R8 |
| @codex-builder | 5 | R0, R6, R7, R8 |
| @codex-dev-1 | 17 | R0, R1, R2, R3, R4, R5, R6, R7, R8 |
| @codex-dev-2 | 14 | R0, R1, R2, R3, R4, R5, R6, R7, R8 |
| @codex-qa-engineer | 9 | R0, R2, R3, R4, R5, R6, R7, R8 |
| @codex-arch-reviewer | 2 | R1, R8 |
| @codex-code-reviewer | per-wave | Code review gate after each wave |
| **TOTAL** | **72** | |

---

## WAVE DEPENDENCY GRAPH

```
WAVE R0: Wire Frontend to Backend
    |
    +--------------------------------------------------------------+
    |                                                              |
    v                                                              v
WAVE R1: Visual Identity & Design System          WAVE R2: Public Pages & Onboarding
    |                                                    |
    |   (R2 depends on R1 components,                    |
    |    but can start R2 layout work                    |
    |    once R1 atoms are done)                         |
    |                                                    |
    +--------------------+-------------------------------+
    |                    |
    v                    v
WAVE R3: Role Dashboards & Navigation
    |
    +------------------------------------------+
    |                                          |
    v                                          v
WAVE R4: AgroMarket                    WAVE R5: AgroWallet & AgroFund
    |                                          |
    +------------------------------------------+
    |
    v
WAVE R6: AgroFarm & AgroShield & AgroWeather
    |
    v
WAVE R7: AgroTrucker & AgroGuide & AgroInsights
    |
    v
WAVE R8: Polish, Performance & Launch Readiness
```

**Parallelism Timeline:**

```
Timeline ------------------------------------------------------------------>

Week 1-2:    | R0 (Foundation Wire-Up)                                |
             |========================================================|

Week 3-4:    | R1 (Design System)        | R2 (Public/Onboarding) *  |
             |===========================|============================|
             * R2 starts after R1 atoms (RB-016) complete

Week 5-6:    | R3 (Dashboards & Navigation)                          |
             |========================================================|

Week 7-8:    | R4 (AgroMarket)           | R5 (AgroWallet/Fund)      |
             |===========================|============================|

Week 9-10:   | R6 (Farm/Insurance/Weather)                           |
             |========================================================|

Week 11-12:  | R7 (Trucker/Guide/Insights)                          |
             |========================================================|

Week 13-14:  | R8 (Polish, Perf, Launch)                             |
             |========================================================|
```

---

## COORDINATION RULES (CODEX-ONLY SWARM)

### 1. File Locking
Each bead specifies exclusive output files. No two workers touch the same file in the same wave. If a conflict is detected, the worker whose bead has the lower RB number has priority.

### 2. Inter-Agent Communication
Use Agent Mail at http://host.docker.internal:8799/interagent/send for:
- Bead completion notifications: {"from": "codex-dev-1", "to": "codex-qa-engineer", "type": "bead_complete", "bead": "RB-005"}
- Dependency unblocking: {"from": "codex-architect", "to": "ALL", "type": "dependency_ready", "bead": "RB-002"}
- Conflict alerts: {"from": "codex-dev-2", "to": "codex-dev-1", "type": "file_conflict", "file": "path/to/file"}

### 3. Git Workflow
- All work happens on the master branch in /home/mwh/vault/
- Each bead = one commit with message format: [RB-NNN] Title of bead
- Workers MUST git pull before starting any bead
- Workers MUST NOT force-push
- If merge conflict: resolve locally, do NOT skip the conflicting file

### 4. Quality Gates (Per Wave)
After all beads in a wave complete:
1. @codex-code-reviewer runs adversarial code review on all wave commits
2. @codex-qa-engineer runs the wave E2E test suite
3. Both must PASS before the next wave begins
4. If a gate fails, the responsible worker fixes the issue before proceeding

### 5. Wave Execution Order
R0 (Foundation) -> R1 + R2 (parallel after R0) -> R3 -> R4 + R5 (parallel) -> R6 -> R7 -> R8

### 6. Routing via Telegram
All commands go through the @MWH_Engineering Telegram bot. To route to Codex agents, prefix with @codex-{session}:
- @codex-architect -> codex-architect session
- @codex-frontend -> codex-frontend session
- @codex-builder -> codex-builder session
- @codex-dev-1 -> codex-dev-1 session
- @codex-dev-2 -> codex-dev-2 session
- @codex-qa-engineer -> codex-qa-engineer session
- @codex-code-reviewer -> codex-code-reviewer session
- @codex-arch-reviewer -> codex-arch-reviewer session

### 7. Progress Tracking
After completing each bead, the worker updates the bead status in this file by appending to the PROGRESS LOG section below.

---

## PROGRESS LOG

| Bead | Status | Worker | Date | Notes |
|------|--------|--------|------|-------|
| -- | -- | -- | -- | No beads started yet. Codex swarm begins from RB-001. |

---

## REFERENCE

- **Full bead specifications** (descriptions, input/output files, acceptance criteria, test requirements): See AGRODOMAIN-ENHANCED-REMEDIATION-PRD.md Section D in /home/mwh/.ductor/agents/engineering/workspace/output_to_user/
- **Page designs** (ASCII layouts, design tokens, copy, responsive specs): See Sections A and B of the same PRD
- **Test framework** (Playwright specs, API tests, component tests, CI/CD): See Section C
- **Prior build work** (B-001 to B-054, F-001 to F-027 — all complete): See git log on master
- **Gap analysis**: See AGRODOMAIN-COMPREHENSIVE-AUDIT-AND-REMEDIATION.md
- **Live deployment**: Web at https://web-prod-n6-production.up.railway.app, API at https://api-prod-n6-production.up.railway.app
