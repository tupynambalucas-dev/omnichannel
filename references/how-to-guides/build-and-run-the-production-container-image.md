# How-To Guide: Build and Run the Production Container Image

While local development runs directly on the host without Docker, [`api/Dockerfile`](../../api/Dockerfile) provides a multi-stage production container image using `turbo prune` and `pnpm deploy` for cloud container runtimes (Kubernetes, Cloud Run, ECS, Fly.io).

---

## 1. Build the Image from the Monorepo Root

Because `api/Dockerfile` prunes the monorepo workspace graph (`core` + `api`), the Docker build context **must** be the monorepo root (`.`):

```bash
docker build -f api/Dockerfile -t tupynambalucas/omnichannel-api:1.0.0 .
```

### Multi-Stage Build Pipeline

1. **`pruner` (`node:22-slim`)**: Runs `turbo prune @tupynambalucas-dev/omnichannel-api --docker` to isolate only the manifests and sources needed by `api` and `core`.
2. **`builder`**: Installs frozen lockfile dependencies (`pnpm install --frozen-lockfile`) and compiles TypeScript (`pnpm --filter @tupynambalucas-dev/omnichannel-api... build`).
3. **`deployer`**: Extracts a production-only deployment directory via `pnpm --filter @tupynambalucas-dev/omnichannel-api --prod deploy --legacy /prod/api`.
4. **`prod` (`node:22-slim`)**: Runs as non-root user `fastify` (`uid: 1001`), exposes port `3000`, and executes `node dist/index.js`.

---

## 2. Run the Production Container

Supply your cloud PostgreSQL and Redis URLs (or inject via Infisical / Kubernetes `InfisicalSecret`):

```bash
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e SERVER_HOST=0.0.0.0 \
  -e SERVER_PORT=3000 \
  -e META_APP_SECRET="<YOUR_META_APP_SECRET>" \
  -e META_WEBHOOK_VERIFY_TOKEN="<YOUR_META_WEBHOOK_VERIFY_TOKEN>" \
  -e META_GRAPH_ACCESS_TOKEN="<YOUR_META_GRAPH_ACCESS_TOKEN>" \
  -e DATABASE_URL="<YOUR_DATABASE_URL>" \
  -e REDIS_QUEUE_URL="<YOUR_REDIS_QUEUE_URL>" \
  -e REDIS_STATE_URL="<YOUR_REDIS_STATE_URL>" \
  tupynambalucas/omnichannel-api:1.0.0
```

Verify container readiness:

```bash
curl http://localhost:3000/health
```

---

## Canonical Upstream Sources

- Turborepo Docker Pruning Guide (`turbo prune --docker`): `https://turborepo.com/docs/guides/tools/docker` (retrieved 2026-11-17)
- pnpm Deploy Command (`pnpm deploy`): `https://pnpm.io/cli/deploy` (retrieved 2026-11-17)
