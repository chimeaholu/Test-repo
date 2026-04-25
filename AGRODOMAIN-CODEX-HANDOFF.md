# AGRODOMAIN PROJECT HANDOFF — CODEX SWARM TRANSITION

**Date:** 2026-04-23
**From:** Don Aholu (via Claude Opus session)
**To:** All Codex agents on VPS (@MWH_Engineering cluster)
**Project:** Agrodomain v2 Enhanced Remediation Build
**Priority:** High — Resume immediately

---

## EXECUTIVE SUMMARY

The Agrodomain Enhanced Remediation build is transitioning from a dual Claude+Codex swarm to a **Codex-only swarm**. Claude Opus credits are exhausted. All Codex agents are now running GPT 5.4 with high reasoning effort. The project plan, bead specifications, and quality gates remain unchanged — only the worker assignments shift to Codex sessions.

**Key fact: NONE of the 72 new remediation beads (RB-001 through RB-072) have been started.** The enhanced remediation PRD was finalized on April 23, 2026 and the build had not yet kicked off when credits ran out. You are starting from scratch on the new plan.

---

## WHAT IS AGRODOMAIN

Agrodomain is an AI-first agricultural super-platform targeting West Africa and the Caribbean. It combines 8 integrated modules into a single platform:

| Module | Purpose |
|--------|---------|
| **AgroMarket** | Commodity marketplace (listing, negotiation, quality attestation) |
| **AgroWallet** | Payments, escrow, P2P transfers |
| **AgroFund** | Crowdfunding, investment portal, fund-a-farm |
| **AgroFarm** | Farm management, field tracking, input management |
| **AgroShield** | Parametric crop insurance |
| **AgroWeather** | Climate intelligence, weather forecasts, crop advice |
| **AgroTrucker** | Transport logistics, shipment tracking, proof of delivery |
| **AgroGuide** | AI advisory assistant (floating panel) |

**6 user roles:** Farmer, Buyer, Cooperative, Transporter, Investor, Extension Agent, plus Admin.

---

## WHAT HAS ALREADY BEEN BUILT (PRIOR BUILD CYCLE)

A complete prior build cycle executed tranches N1 through N6 and frontend beads F1 through F4:

### Backend (COMPLETE — production-grade)
- **54/54 backend beads** (B-001 to B-054) built and QA-cleared
- FastAPI with 15 Alembic database migrations
- 28 command handlers with full CQRS pattern
- Complete RBAC/auth system with session management
- Idempotency keys, audit trail, transactional outbox pattern
- Real Postgres persistence with proper domain modeling
- All API endpoints have real business logic

### Frontend (COMPLETE — but mock-data-driven)
- **27/27 frontend beads** (F-001 to F-027) built and QA-cleared
- Next.js app with all pages/routes created
- Functional UI for all 8 modules
- **CRITICAL GAP:** An 84KB mock-client.ts generates all data in-browser via localStorage
- Only the admin analytics workspace makes real API calls
- Everything else runs on fake, browser-generated data

### External Integrations (NOT DONE)
- No payment processors (Stripe/Flutterwave/M-Pesa)
- No weather APIs connected
- No LLM integration for AgroGuide advisory
- No insurance provider APIs

### Deployment (LIVE but showing internal copy)
- Web: https://web-prod-n6-production.up.railway.app (returning 200)
- API: https://api-prod-n6-production.up.railway.app (returning 200)
- Production UI shows engineering terminology ("Wave 1 web lane", "seam", "contracts") instead of user-facing copy
- Railway deploy credentials may be expired/blocked

---

## WHAT THE NEW PLAN DOES (YOUR MISSION)

The Enhanced Remediation PRD prescribes 72 beads across 9 waves to:

1. **Wave R0 (FIRST PRIORITY):** Replace mock-client.ts with real API client, wire ALL 21 pages to the real FastAPI backend
2. **Wave R1:** Build a proper design token system and component library
3. **Wave R2:** Rebuild public pages (landing, signin, signup, onboarding) with real copy
4. **Wave R3:** Build 6 role-specific dashboards with real data
5. **Wave R4:** Complete marketplace with real CRUD, search, negotiation
6. **Wave R5:** Wallet operations and crowdfunding (parallel with R4)
7. **Wave R6:** Farm management, insurance, weather modules
8. **Wave R7:** Transport, AI advisory, analytics modules
9. **Wave R8:** Polish — accessibility, performance, PWA, SEO, security, docs

**Estimated timeline:** 14 weeks / 98 calendar days

---

## KEY FILES AND LOCATIONS

### Planning Documents (READ THESE FIRST)

| File | Location | Purpose |
|------|----------|---------|
| **CODEX-ONLY-SWARM-PLAN.md** | /home/mwh/vault/MWH/Projects/Agrodomain/ | YOUR primary execution document — all 72 beads with Codex worker assignments |
| **AGRODOMAIN-ENHANCED-REMEDIATION-PRD.md** | /home/mwh/.ductor/agents/engineering/workspace/output_to_user/ | Full 16,854-line spec — page designs, acceptance criteria, test specs |
| **AGRODOMAIN-COMPREHENSIVE-AUDIT-AND-REMEDIATION.md** | Same directory | Audit + gap analysis explaining why this remediation is needed |
| **AGRODOMAIN-GAP-ANALYSIS-2026-04-22.md** | Same directory | CEO-level summary of what is broken |

### Codebase

| Component | Location |
|-----------|----------|
| Git repo root | /home/mwh/vault/ (branch: master) |
| API (FastAPI) | /home/mwh/vault/MWH/Projects/Agrodomain/apps/api/ |
| Web (Next.js) | /home/mwh/vault/MWH/Projects/Agrodomain/apps/web/ |
| Shared contracts | /home/mwh/vault/MWH/Projects/Agrodomain/packages/contracts/ |
| E2E tests | /home/mwh/vault/MWH/Projects/Agrodomain/tests/ |
| Monorepo config | /home/mwh/vault/MWH/Projects/Agrodomain/turbo.json |
| Package manager | pnpm (see pnpm-workspace.yaml) |
| Deployment config | /home/mwh/vault/MWH/Projects/Agrodomain/railway.json |

### The Mock Client (THE FILE YOU ARE REPLACING IN R0)

- **File:** /home/mwh/vault/MWH/Projects/Agrodomain/apps/web/lib/mock-client.ts
- **Size:** 84KB
- **What it does:** Generates all frontend data in-browser using localStorage. Every page reads from this instead of calling the real API.
- **Why it exists:** Was created during the prior build to unblock frontend work while backend was being built
- **Your job:** RB-001 through RB-011 replace this with real API calls. RB-011 deletes this file.

---

## AGENT SESSION MAPPING

When Don messages via the @MWH_Engineering Telegram bot, use these session prefixes:

| To reach this agent | Prefix/route |
|--------------------|-------------|
| codex-architect | @codex-architect |
| codex-frontend | @codex-frontend |
| codex-builder | @codex-builder (also default session) |
| codex-dev-1 | @codex-dev-1 |
| codex-dev-2 | @codex-dev-2 |
| codex-qa-engineer | @codex-qa-engineer |
| codex-code-reviewer | @codex-code-reviewer |
| codex-arch-reviewer | @codex-arch-reviewer |

All agents work in the same Docker container with access to:
- The full codebase at /home/mwh/vault/
- All MCP servers (Notion, Supabase, Firecrawl, Cloudinary, N8N, Playwright, GDrive, Otter, QMD)
- Agent Mail at http://host.docker.internal:8799/interagent/send
- Git on the master branch

---

## HOW TO START

### For @codex-architect (FIRST MOVER):

1. Read CODEX-ONLY-SWARM-PLAN.md in /home/mwh/vault/MWH/Projects/Agrodomain/
2. Read the full RB-001 specification in AGRODOMAIN-ENHANCED-REMEDIATION-PRD.md (line ~12780)
3. Read the existing mock-client.ts to understand the interface contract
4. Read the backend API routes in apps/api/app/routes/*.py to understand response shapes
5. Read the envelope pattern in apps/api/app/envelope.py
6. Implement RB-001: Create apps/web/lib/api-client.ts
7. After completing RB-001, notify all agents via Agent Mail and proceed to RB-002

### For @codex-builder (CAN START IN PARALLEL):

1. Read CODEX-ONLY-SWARM-PLAN.md
2. Start RB-009 immediately (no dependencies) — create the database demo seeding script
3. Read the existing database models to understand the schema

### For @codex-frontend (STARTS AFTER RB-001):

1. Read CODEX-ONLY-SWARM-PLAN.md
2. Wait for RB-001 completion notification
3. Begin RB-003: Auth integration with real session flow

### For all other agents:

1. Read CODEX-ONLY-SWARM-PLAN.md
2. Wait for your dependencies to clear (see the dependency column in the bead table)
3. When your bead is unblocked, begin work

---

## QUALITY GATES

After each wave completes:

1. **Code Review Gate:** @codex-code-reviewer reviews all wave commits adversarially
2. **QA Gate:** @codex-qa-engineer runs the wave E2E test suite
3. **Both must pass** before the next wave begins
4. Failed gates require the responsible worker to fix issues before proceeding

---

## KNOWN ISSUES AND BLOCKERS

| Issue | Impact | Mitigation |
|-------|--------|-----------|
| Railway deploy credentials may be expired | Cannot deploy new builds | Check deploy access early in R0; if blocked, set up fresh Railway project |
| Production UI shows internal engineering copy | Users see "Wave 1 web lane" etc. | Fixed by R2 (public pages rebuild with real copy) |
| 5 stale git worktrees exist | Potential confusion | Ignore them — work on master branch only |
| 20+ stale branches | Clutter | Ignore — all work is on master |
| No external integrations | Payment, weather, LLM not connected | Addressed in R4-R7 with stub/mock integrations for MVP |

---

## COMMUNICATION PROTOCOL

- **Bead complete:** Post to Agent Mail with type "bead_complete"
- **Blocked:** Post to Agent Mail with type "blocked" and reason
- **Conflict:** Post to Agent Mail with type "file_conflict" and affected file path
- **Wave gate ready:** QA posts to Agent Mail with type "wave_gate_result"
- **Escalation to Don:** Send message via @MWH_Engineering Telegram bot (default session)

---

## SUCCESS CRITERIA

The remediation is complete when:

1. mock-client.ts is deleted and all pages call the real API (Wave R0)
2. All pages match the design specs in the PRD (Waves R1-R7)
3. No internal engineering terminology visible to users
4. All critical journey E2E tests pass (15 tests across CJ-001 to CJ-015)
5. Lighthouse Performance >= 85 on all pages
6. WCAG 2.1 AA compliant
7. PWA installable on mobile
8. Documentation complete (API docs, component Storybook, deploy guide)

---

## REMEMBER

- The backend is DONE and production-grade. Do not rewrite it.
- The contracts package is the source of truth for types. Use it.
- Every bead has explicit file boundaries. Do NOT touch files outside your bead assignment.
- git pull before every bead. Commit with format: [RB-NNN] Title
- If in doubt about a spec, read the Enhanced Remediation PRD — it has pixel-level detail for every page.
- Report progress in the PROGRESS LOG section of CODEX-ONLY-SWARM-PLAN.md after each bead.
