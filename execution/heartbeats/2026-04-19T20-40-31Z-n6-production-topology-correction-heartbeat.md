# Heartbeat: N6 Production Topology Correction

Timestamp (UTC): 2026-04-19T20:40:31Z

Status: `DONE`

Completed:
- Confirmed shim origin in `aa8ebc1734faa49e1e317bffa0a33f56b22d4914` (`apps/api/app/api/routes/system.py`) adding placeholder HTML routes.
- Deployed real Next frontend on production service `web-prod-n6` using `railway.web.json` + `apps/web/Dockerfile`.
- Introduced dedicated production API service `api-prod-n6` and domain `api-prod-n6-production.up.railway.app`.
- Wired frontend API base URL to production API domain.
- Fixed API runtime blockers (CORS + sqlite schema bootstrap) so sign-in session flow succeeds.
- Validated live click-through and route/content smokes.
- Published evidence at:
  - `execution/reviews/2026-04-19T20-40-31Z-n6-prod-topology-correction/`

Final production frontend URL:
- `https://web-prod-n6-production.up.railway.app`

