FROM node:22-bookworm-slim

WORKDIR /app

RUN corepack enable

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_AGRO_API_BASE_URL=https://api-prod-n6-production.up.railway.app

RUN corepack pnpm install --no-frozen-lockfile --prod=false
RUN corepack pnpm --filter @agrodomain/contracts build || true
RUN corepack pnpm --filter @agrodomain/config build || true
RUN corepack pnpm --filter @agrodomain/web exec next build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["corepack", "pnpm", "--filter", "@agrodomain/web", "exec", "next", "start", "-p", "3000", "-H", "0.0.0.0"]
