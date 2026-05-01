# Legacy Staging Runtime

This directory contains the pre-production FastAPI and Playwright harness that was frozen during Wave 0.

Status:

- reference-only
- read-only for production work
- not a production deploy target

Use this path only for:

- contract extraction
- regression comparison
- UX intent review
- staging-only harness reruns

Production implementation work must target `apps/web`, `apps/api`, `apps/worker`, and `packages/contracts`.
