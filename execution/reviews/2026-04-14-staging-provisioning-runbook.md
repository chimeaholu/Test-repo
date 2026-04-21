# Agrodomain Staging Provisioning Runbook

Date: 2026-04-14  
Project: `/mnt/vault/MWH/Projects/Agrodomain`

## Verdict

Status: `FAIL - EXTERNAL PROVISIONING BLOCKED`

The staging scaffold is present and locally runnable, but Railway provisioning still could not be completed from this environment because the currently loaded `RAILWAY_TOKEN` is rejected by Railway CLI/API.

Observed failure:

```text
Unauthorized. Please check that your RAILWAY_TOKEN is valid and has access to the resource you're trying to use.
Invalid RAILWAY_TOKEN. Please check that it is valid and has access to the resource you're trying to use.
```

## 2026-04-14 Rerun Attempt (Post-Token-Refresh Request)

Commands executed:

```bash
cd /mnt/vault/MWH/Projects/Agrodomain
npx -y @railway/cli@latest --version
RAILWAY_TOKEN="$RAILWAY_TOKEN" npx -y @railway/cli@latest whoami
RAILWAY_TOKEN="$RAILWAY_TOKEN" npx -y @railway/cli@latest project list --json
RAILWAY_TOKEN="$RAILWAY_TOKEN" npx -y @railway/cli@latest status --json
```

Result:

- CLI reachable (`railway 4.36.1`)
- Auth still fails (`Unauthorized` / `Invalid RAILWAY_TOKEN`)
- No project/environment/service/domain operations could be performed

Runtime environment check:

- `RAILWAY_TOKEN` is present in this container (`len=36`)
- token value currently available to this task is not accepted by Railway

## 2026-04-14 Rerun Attempt #2 (Second Token-Refresh Request)

Commands executed:

```bash
cd /mnt/vault/MWH/Projects/Agrodomain
npx -y @railway/cli@latest --version
echo "len=${#RAILWAY_TOKEN}"
RAILWAY_TOKEN="$RAILWAY_TOKEN" npx -y @railway/cli@latest whoami
RAILWAY_TOKEN="$RAILWAY_TOKEN" npx -y @railway/cli@latest project list --json
env | grep -Ei '^RAILWAY_' 
```

Result:

- CLI reachable (`railway 4.36.1`)
- `RAILWAY_TOKEN` still length `36`
- Auth still fails (`Unauthorized`)
- Env confirms only `RAILWAY_TOKEN` is present in this runtime
- No Railway project/service/environment/domain actions possible

Current loaded token in this runtime:

```text
RAILWAY_TOKEN=dd5d8486-07df-4cb9-86ea-ae42d94b980b
```

## 2026-04-14 Rerun Attempt #3 (Forced In-Command Token Override)

Root-cause addressed:

- The runtime has a pre-set `RAILWAY_TOKEN` that can override expected credential sources.
- To avoid env precedence issues, Railway token was forced inline per command.

Commands executed:

```bash
cd /mnt/vault/MWH/Projects/Agrodomain
RAILWAY_TOKEN='***redacted***' npx -y @railway/cli@latest whoami
RAILWAY_TOKEN='***redacted***' npx -y @railway/cli@latest project list --json
```

Result:

- Both commands still fail with `Unauthorized`
- This confirms the current forced token value itself is not authorized for the target Railway account/workspace from this runtime
- Provisioning/deploy/domain/smoke on Railway remains blocked until a valid token is provided

## What Was Verified

### Staging scaffold present

- `railway.json` uses Dockerfile-based build and `/healthz` healthcheck.
- `Dockerfile` starts `python -m agro_v2.staging_runtime` on port `8000`.
- `pyproject.toml` packages the staging runtime with `fastapi` and `uvicorn`.
- `src/agro_v2/staging_runtime.py` provides:
  - `/healthz`
  - `/signin`
  - `/auth/test-login`
  - `/api/e2e/seed`
  - `/api/e2e/state/checks`
  - protected `/app/*` routes
- Playwright staging suite exists at `tests/e2e/critical-journeys.spec.ts`.

### Local validation

- `python3 -m pytest -q tests/test_staging_runtime.py` -> `3 passed in 1.20s`
- Runtime started locally on `http://127.0.0.1:8011`
- `GET /healthz` returned `200 OK`

### Local smoke risks discovered

- If `AGRODOMAIN_E2E_VERIFY_KEY` is set, the current Playwright suite fails with `401` because the suite does not send `X-E2E-Verify-Key` on verification requests.
- `GET /api/e2e/state/checks/full-critical` on an unseeded runtime currently returns `500` due to an empty traceability event list.

These are app-level smoke issues, not platform provisioning issues, but they matter once staging is live.

## Canonical Staging Naming Convention

Use this consistently:

- Railway project: `agrodomain-staging`
- Railway service: `web`
- Railway environment: `staging`

Canonical public host strategy:

- Stable preferred hostname: `https://staging.<owned-domain>`
- Railway-provided fallback host format: `https://<generated-subdomain>.up.railway.app`

Because Railway auth failed before project creation, there is no provisioned final host yet.

## Exact Staging URL

Final staging URL: `NOT PROVISIONED`

URL format to reserve if staying Railway-only:

```text
https://<generated-subdomain>.up.railway.app
```

Stable URL to reserve if DNS is available:

```text
https://staging.<owned-domain>
```

## Missing Inputs Required From User / Account Owner

### Required to unblock Railway provisioning

- A valid Railway login or fresh `RAILWAY_TOKEN` with access to the target workspace

### Required non-prod secrets

- `AGRODOMAIN_AUTH_SECRET`
- `AGRODOMAIN_E2E_VERIFY_KEY`

Recommended generation:

```bash
python3 - <<'PY'
import secrets
print("AGRODOMAIN_AUTH_SECRET=" + secrets.token_urlsafe(48))
print("AGRODOMAIN_E2E_VERIFY_KEY=" + secrets.token_urlsafe(48))
PY
```

Temporary values can be generated at provisioning time and set directly through Railway CLI using the commands below after auth is fixed.

### Optional integration values if staging must hit real services

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `AUTH_URL`
- `AUTH_SECRET`
- `ESCROW_API_KEY`
- `WHATSAPP_TOKEN`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`

### Derived after provisioning

- `AGRODOMAIN_STAGING_URL`
- `STAGING_BASE_URL`
- `PLAYWRIGHT_BASE_URL`

## Provisioning Commands To Run After Railway Access Is Fixed

Run from:

```bash
cd /mnt/vault/MWH/Projects/Agrodomain
```

### 1. Authenticate Railway

Option A:

```bash
export RAILWAY_TOKEN='<fresh-valid-token>'
RAILWAY_TOKEN="$RAILWAY_TOKEN" npx -y @railway/cli@latest whoami
```

Option B:

```bash
npx -y @railway/cli@latest login
```

### 2. Create and link the staging project

```bash
npx -y @railway/cli@latest init --name agrodomain-staging
npx -y @railway/cli@latest add --service web
npx -y @railway/cli@latest environment new staging
npx -y @railway/cli@latest environment link staging
```

### 3. Inject minimum staging variables

If you want the current Playwright suite to work unchanged, do not set `AGRODOMAIN_E2E_VERIFY_KEY` yet.

```bash
npx -y @railway/cli@latest variable set -s web -e staging AGRODOMAIN_STAGING_HOST=0.0.0.0
npx -y @railway/cli@latest variable set -s web -e staging AGRODOMAIN_STAGING_PORT=8000
npx -y @railway/cli@latest variable set -s web -e staging AGRODOMAIN_STAGING_PROFILE=e2e-critical
npx -y @railway/cli@latest variable set -s web -e staging AGRODOMAIN_STATE_PATH=.staging/runtime-state.json
npx -y @railway/cli@latest variable set -s web -e staging AGRODOMAIN_AUTH_SECRET="$(python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(48))
PY
)"
```

If you are also hardening the verification API now:

```bash
npx -y @railway/cli@latest variable set -s web -e staging AGRODOMAIN_E2E_VERIFY_KEY="$(python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(48))
PY
)"
```

Optional service bindings:

```bash
npx -y @railway/cli@latest variable set -s web -e staging SUPABASE_URL='<value>' SUPABASE_ANON_KEY='<value>' SUPABASE_SERVICE_ROLE_KEY='<value>'
npx -y @railway/cli@latest variable set -s web -e staging NEXT_PUBLIC_SUPABASE_URL='<value>' NEXT_PUBLIC_SUPABASE_ANON_KEY='<value>'
npx -y @railway/cli@latest variable set -s web -e staging AUTH_URL='<value>' AUTH_SECRET='<value>'
npx -y @railway/cli@latest variable set -s web -e staging ESCROW_API_KEY='<value>' WHATSAPP_TOKEN='<value>' TWILIO_ACCOUNT_SID='<value>' TWILIO_AUTH_TOKEN='<value>'
```

### 4. Deploy

```bash
npx -y @railway/cli@latest up --service web --environment staging --ci
```

### 5. Generate the Railway host

```bash
npx -y @railway/cli@latest domain --service web --port 8000 --json
```

Record the returned `https://<generated-subdomain>.up.railway.app` value as:

```bash
export AGRODOMAIN_STAGING_URL='https://<generated-subdomain>.up.railway.app'
export STAGING_BASE_URL="$AGRODOMAIN_STAGING_URL"
export PLAYWRIGHT_BASE_URL="$AGRODOMAIN_STAGING_URL"
```

## Smoke Verification Commands After Deploy

### Basic health

```bash
curl -fsSL "$AGRODOMAIN_STAGING_URL/healthz"
```

### Seed the staging harness

```bash
curl -fsSL -X POST "$AGRODOMAIN_STAGING_URL/api/e2e/seed?profile=e2e-critical"
```

### API verification

If `AGRODOMAIN_E2E_VERIFY_KEY` is not set:

```bash
PYTHONPATH=src PLAYWRIGHT_BASE_URL="$AGRODOMAIN_STAGING_URL" python3 scripts/verify_staging_state.py --source api --check auth-onboarding
```

If `AGRODOMAIN_E2E_VERIFY_KEY` is set:

```bash
AGRODOMAIN_E2E_VERIFY_KEY='<user-supplied-verify-key>' \
PYTHONPATH=src PLAYWRIGHT_BASE_URL="$AGRODOMAIN_STAGING_URL" \
python3 scripts/verify_staging_state.py --source api --check auth-onboarding
```

### Browser smoke

Current caveat: the present Playwright suite does not send `X-E2E-Verify-Key`, so it will fail if that variable is enforced server-side.

```bash
PLAYWRIGHT_BASE_URL="$AGRODOMAIN_STAGING_URL" \
PLAYWRIGHT_ARTIFACT_DIR=execution/reviews/2026-04-14-staging-e2e-evidence \
npx playwright test
```

## Precise Unblock Steps

1. Ensure the updated token is actually loaded in this task/runtime environment, then confirm with `RAILWAY_TOKEN="$RAILWAY_TOKEN" npx -y @railway/cli@latest whoami`.
2. If token auth still fails, run `npx -y @railway/cli@latest login --browserless` and complete CLI login for this runtime user.
3. Re-run auth check, then run the provisioning sequence above to create `agrodomain-staging` and service `web`.
4. Set `AGRODOMAIN_AUTH_SECRET` immediately.
5. Decide whether to enforce `AGRODOMAIN_E2E_VERIFY_KEY` now or after patching the Playwright suite.
6. Deploy with `railway up`.
7. Generate the Railway domain and write back the exact `https://<generated-subdomain>.up.railway.app` host.
8. Run `/healthz`, seed, API verification, and the Playwright suite against that host.

## Next Actions

- `BLOCKING`: obtain valid Railway credentials
- `THEN`: provision `agrodomain-staging` / `web` / `staging`
- `THEN`: set minimum secrets and deploy
- `THEN`: capture the actual Railway URL
- `THEN`: rerun smoke verification on the live host
- `FOLLOW-UP`: patch the Playwright suite to send `X-E2E-Verify-Key` before enforcing that secret in staging
