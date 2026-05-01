# Agrodomain Recovery Deploy Topology

Date: `2026-04-19`
Status: `active recovery topology`

## Canonical Topology

Agrodomain recovery uses two public runtimes:

1. `web`
   - source: `apps/web`
   - deploy config: `apps/web/Dockerfile` or `railway.web.json`
   - purpose: real Next.js browser runtime
   - health: `/healthz`
2. `api`
   - source: `apps/api`
   - deploy config: `apps/api/Dockerfile` and root `railway.json`
   - purpose: authenticated API, workflow commands, health, readiness
   - health: `/readyz`

## Required Routing

- Public product domain must point to the `web` service.
- `NEXT_PUBLIC_AGRO_API_BASE_URL` on the web service must point to the `api` service origin.
- The API service must not be positioned as a browser entry point.
- If the API service is opened directly in a browser, it should return the limited-preview holding page for non-API paths.

## Recovery Rules

- `/signin`, `/onboarding/consent`, and `/app/*` only count as valid when served by the Next.js runtime.
- API-service HTML shims are forbidden.
- Route reachability alone is not evidence of readiness.
- Promotion is blocked until the release gate passes `corepack pnpm release:verify`.

## Deployment Mapping

### API service

- config: `railway.json`
- dockerfile: `apps/api/Dockerfile`
- env:
  - `AGRO_API_DATABASE_URL`
  - `AGRO_API_ENVIRONMENT`
  - `AGRO_API_CORS_ALLOWED_ORIGINS`

### Web service

- config: `railway.web.json`
- dockerfile: `apps/web/Dockerfile`
- env:
  - `NEXT_PUBLIC_AGRO_API_BASE_URL`

## Cutover Sequence

1. Deploy API service and verify `/readyz`.
2. Deploy web service and verify `/healthz`, `/signin`, `/onboarding/consent`, and core `/app/*` routes.
3. Switch public product domain to the web service only after the release gate is green.
4. Keep the API domain separate for operational access and machine clients.
