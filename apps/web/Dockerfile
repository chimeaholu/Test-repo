FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN corepack enable

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_AGRO_API_BASE_URL=https://api-prod-n6-production.up.railway.app

RUN corepack pnpm install --frozen-lockfile --prod=false
RUN corepack pnpm --filter @agrodomain/contracts build || true
RUN corepack pnpm --filter @agrodomain/web exec next build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_AGRO_API_BASE_URL=https://api-prod-n6-production.up.railway.app
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
