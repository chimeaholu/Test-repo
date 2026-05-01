# Agrodomain Production Rebuild

This repository is locked to the Wave 0 production rebuild topology defined in:

- `execution/specs/2026-04-18-wave0-production-rebuild-architecture-packet.md`
- `docs/architecture/2026-04-18-wave0-topology-lock.md`

Production entrypoints now live in:

- `apps/web`
- `apps/api`
- `apps/worker`
- `packages/contracts`
- `packages/config`

Legacy staging harness assets are preserved under `legacy/staging-runtime` as read-only reference material. They are not the production deploy target.

## Workspace commands

```bash
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

## Production entrypoints

```bash
corepack pnpm --dir apps/web dev
uvicorn app.main:app --app-dir apps/api --reload
cd apps/api && python3 -m app.main
```

## R8 launch-readiness docs

- PWA and deploy readiness: `docs/deployment/2026-04-25-pwa-release-readiness.md`

## PWA surface

- Manifest route: `apps/web/app/manifest.ts`
- Service worker: `apps/web/public/sw.js`
- Offline fallback: `apps/web/app/offline/page.tsx`
