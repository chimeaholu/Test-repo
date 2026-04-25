# RB-068 Security Audit Artifact

Date: 2026-04-25
Project: Agrodomain
Scope: Current app, API, and deployment-facing code paths in `apps/web`, `apps/api`, Dockerfiles, and Railway manifests
Auditor: Engineering background task agent

## Executive Outcome

Result: Conditional PASS for the R8 security lane.

Meaning:
- The directly exploitable production-facing issues identified in this pass were remediated.
- The current deployment can be considered security-gated for R8 if production keeps demo auth disabled and deploys from the updated lockfile/images.
- The product is still not real-auth complete. A production launch that requires live end-user authentication remains conditional on replacing the demo-token/localStorage auth model.

## Checks Performed

1. Adversarial code review of:
   - `apps/api/app/api/routes/*`
   - `apps/api/app/core/*`
   - `apps/web/lib/auth/*`
   - `apps/web/lib/api-client.ts`
   - `apps/web/middleware.ts`
   - `apps/web/next.config.ts`
   - `apps/api/Dockerfile`
   - `apps/web/Dockerfile`
   - root `Dockerfile`
   - `railway.json`, `railway.web.json`

2. Targeted API verification:
   - `python3 -m pytest apps/api/tests/integration/test_app_boot.py apps/api/tests/unit/test_system.py`
   - Outcome: `6 passed`

3. Web verification:
   - `corepack pnpm --dir apps/web typecheck`
   - Outcome: passed
   - `corepack pnpm --dir apps/web build`
   - Outcome: passed

4. Dependency audit:
   - `corepack pnpm --dir apps/web audit --prod --json`
   - Initial outcome: 1 moderate advisory in `postcss` via `next`
   - Remediation applied: root `pnpm` override to `postcss ^8.5.10`, lockfile refreshed
   - Final outcome: `0` JS production vulnerabilities
   - `python3 -m pip_audit /mnt/vault/MWH/Projects/Agrodomain/apps/api --format json`
   - Outcome: no known Python vulnerabilities

## Findings

### 1. Critical - Demo auth could mint live sessions from email + role + country with no real authentication

Status: Remediated

Evidence:
- `apps/api/app/api/routes/identity.py:57-86` previously issued sessions from self-asserted identity data.

Impact:
- Any caller could create a valid session without password, OTP, or federated proof.
- The API also accepted arbitrary role strings, which made privileged role/session creation possible by direct API POST even if the UI did not expose those roles.

Fix:
- Restricted self-service sign-in roles to a narrow allowlist in `apps/api/app/api/routes/identity.py:18-34`.
- Added a production guard in `apps/api/app/api/routes/identity.py:57-67`.
- Added environment-aware controls in `apps/api/app/core/config.py:36-69`.

Outcome:
- In production mode, `/api/v1/identity/session` now returns `403 demo_auth_disabled`.
- Direct privileged self-registration through the sign-in route is blocked by schema-level role restriction.

### 2. Medium - Reflected XSS on API preview fallback

Status: Remediated

Evidence:
- `apps/api/app/api/routes/preview.py` interpolated `request.url.path` directly into HTML.

Impact:
- Crafted paths containing HTML/script delimiters could break context and execute script in the API preview page.

Fix:
- Escaped the reflected path at `apps/api/app/api/routes/preview.py:11-13`.
- Added preview-specific hardening headers at `apps/api/app/api/routes/preview.py:126-141`, including CSP and `no-store`.

Outcome:
- Verified with test coverage in `apps/api/tests/integration/test_app_boot.py:59-69`.

### 3. Medium - Missing baseline security headers and production docs exposure

Status: Remediated

Evidence:
- API app boot previously exposed docs/openapi in all environments and did not set baseline hardening headers.
- Web app did not emit consistent security headers or `no-store` on protected/auth surfaces.

Fix:
- Added API security middleware in `apps/api/app/core/security.py:1-42`.
- Wired middleware and production-only docs gating in `apps/api/app/core/application.py:27-45`.
- Added web headers and protected-route cache controls in `apps/web/next.config.ts:1-43`.
- Added anonymous `/app/*` redirect middleware in `apps/web/middleware.ts:1-22`.

Outcome:
- Health responses now include hardening headers.
- Production docs route is no longer exposed; it falls through to the 503 preview page.
- `/app/*`, `/signin`, `/signup`, and `/onboarding/*` now emit `no-store`/`noindex` controls where appropriate.

### 4. Medium - Containers ran as root

Status: Remediated

Evidence:
- API and web runtime images defaulted to root.

Fix:
- Dropped runtime privileges in:
  - `apps/api/Dockerfile:13-20`
  - `apps/web/Dockerfile:37-45`
  - root `Dockerfile:13-20`

Outcome:
- API now runs as system user `agrodomain`.
- Web runner now copies runtime files with `node` ownership and runs as `node`.

### 5. Moderate - Vulnerable transitive `postcss` in production dependency graph

Status: Remediated

Evidence:
- Initial `pnpm audit` reported `GHSA-qx2v-qp2m-jg93` / `CVE-2026-41305` on `postcss` through `next`.

Fix:
- Added `pnpm` override in `package.json:22-26`.
- Refreshed `pnpm-lock.yaml` with `pnpm install --lockfile-only`.

Outcome:
- Follow-up `pnpm audit --prod --json` returned zero production vulnerabilities.

## Residual Risk

1. Authentication is still demo-model based in non-production.
   - Web sessions and access tokens are still localStorage-backed.
   - This is acceptable for gated dev/test use, but not equivalent to production-grade auth.

2. Protected web routes still render as application shells in the Next build.
   - Anonymous access is now redirected server-side by middleware and protected responses are marked `no-store`.
   - Full server-authoritative session enforcement still requires replacing the current client/localStorage auth model with HttpOnly cookie or equivalent server-managed auth.

3. No rate limiting was introduced on the sign-in route when demo auth is explicitly enabled.
   - This is acceptable for non-production demo environments.
   - Production should keep demo auth disabled.

## Gate Readiness Notes

R8 Security Lane: PASS, conditional on deployment discipline.

Required deployment conditions:
- Production must keep `AGRO_API_ALLOW_INSECURE_DEMO_AUTH` unset or `false`.
- Production images must be rebuilt from the updated Dockerfiles and lockfile.
- Web deploys must pick up the new middleware and header configuration.

Not a blocker for the R8 lane:
- Demo auth remains available in `development` and `test`.

Still a blocker for a true production auth launch:
- Replace localStorage/demo-token auth with real server-managed authentication before enabling live end-user sign-in on a production domain.

## Files Changed In This Lane

- `apps/api/app/core/config.py`
- `apps/api/app/core/application.py`
- `apps/api/app/core/security.py`
- `apps/api/app/api/routes/identity.py`
- `apps/api/app/api/routes/preview.py`
- `apps/api/tests/integration/test_app_boot.py`
- `apps/api/tests/unit/test_system.py`
- `apps/web/next.config.ts`
- `apps/web/middleware.ts`
- `apps/web/lib/auth/auth-provider.tsx`
- `apps/web/app/signin/page.tsx`
- `package.json`
- `pnpm-lock.yaml`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `Dockerfile`
