# ==============================================================================
# @tupynambalucas-dev/omnichannel-api - Production Container Image
# Multi-stage build using Turborepo pruning + pnpm deploy.
# Build context: MONOREPO ROOT (../ relative to this file).
# Note: Local development runs directly against cloud data stores without Docker.
# ==============================================================================

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
RUN corepack enable pnpm

FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo@latest
COPY . .
RUN turbo prune @tupynambalucas-dev/omnichannel-api --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store-omnichannel,target=/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm --filter @tupynambalucas-dev/omnichannel-api... build

FROM base AS deployer
WORKDIR /app
COPY --from=builder /app .
RUN --mount=type=cache,id=pnpm-store-omnichannel,target=/pnpm/store \
    pnpm --filter @tupynambalucas-dev/omnichannel-api --prod deploy --legacy /prod/api

FROM node:22-slim AS prod
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 fastify

USER fastify
COPY --from=deployer --chown=fastify:nodejs /prod/api .

EXPOSE 3000
CMD ["node", "dist/index.js"]
