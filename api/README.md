# `@tupynambalucas-dev/omnichannel-api`

Stateless Fastify v5 unified webhook gateway, polymorphic WhatsApp/Instagram outbound compiler, and BullMQ-backed deterministic Finite State Machine (FSM) engine.

---

## Overview

`@tupynambalucas-dev/omnichannel-api` exposes the unified `/webhooks/meta` edge for WhatsApp Cloud API and Instagram Messaging API alongside multi-tenant onboarding and workflow publication endpoints under `/api/v1/tenants`. It operates natively against cloud-hosted PostgreSQL, dual-role TLS Redis, and optional MongoDB Atlas without requiring local Docker containers.

---

## HTTP Endpoints

| Method | Path                                          | Description                                                                                                                |
| :----- | :-------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/health`                                     | Readiness and datastore connectivity report (`postgresql`, `redisState`, `redisQueue`, `mongoArchive`).                    |
| `GET`  | `/metrics`                                    | Prometheus metrics endpoint exposed via `fastify-metrics`.                                                                 |
| `GET`  | `/webhooks/meta`                              | Meta App Dashboard webhook subscription verification (`hub.challenge` handshake).                                          |
| `POST` | `/webhooks/meta`                              | Unified WhatsApp & Instagram webhook receiver with raw-byte `X-Hub-Signature-256` verification and 24h deduplication.      |
| `GET`  | `/api/v1/tenants`                             | Lists registered tenants.                                                                                                  |
| `POST` | `/api/v1/tenants`                             | Provisions a new tenant (`slug`, `displayName`, `timezone`).                                                               |
| `POST` | `/api/v1/tenants/:tenantId/channels`          | Binds a WhatsApp `phone_number_id` or Instagram `ig_business_account_id` with an `accessTokenSecretRef`.                   |
| `POST` | `/api/v1/tenants/:tenantId/workflows`         | Publishes an immutable `WorkflowDefinition` version and optionally activates it on channels.                               |
| `POST` | `/api/v1/tenants/:tenantId/workflows/starter` | Publishes and activates a ready-made omnichannel triage workflow (`ASK_INTERACTIVE` + `CPF` validation + `HUMAN_HANDOFF`). |

---

## Configuration

| Variable                    | Required   | Default                                       | Description                                                                                                      |
| :-------------------------- | :--------- | :-------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                  | Yes        | `development`                                 | Runtime environment (`development`, `production`, `test`).                                                       |
| `SERVER_HOST`               | Yes        | `0.0.0.0`                                     | Bind interface address.                                                                                          |
| `SERVER_PORT`               | Yes        | `3000`                                        | HTTP listening port.                                                                                             |
| `LOG_LEVEL`                 | No         | `info`                                        | Pino log verbosity (`fatal`, `error`, `warn`, `info`, `debug`, `trace`).                                         |
| `CORS_ALLOWED_ORIGINS`      | No         | `http://localhost:3000,http://localhost:5173` | Comma-separated list of allowed CORS origins.                                                                    |
| `META_GRAPH_BASE_URL`       | No         | `https://graph.facebook.com`                  | Base URL for Meta Graph API calls.                                                                               |
| `META_GRAPH_API_VERSION`    | No         | `v22.0`                                       | Target Meta Graph API version.                                                                                   |
| `META_WEBHOOK_VERIFY_TOKEN` | Yes (Prod) | `dev-verify-token`                            | Shared token verified during `GET /webhooks/meta` challenge handshake.                                           |
| `META_APP_SECRET`           | Yes (Prod) | `""`                                          | Meta App Secret used to verify `X-Hub-Signature-256` HMAC-SHA256 digests.                                        |
| `DATABASE_URL`              | Yes (Prod) | `""`                                          | Cloud PostgreSQL connection string (`?sslmode=require`). Uses memory fallback if empty in dev.                   |
| `DATABASE_SSL_ENABLED`      | No         | `true`                                        | Enforces TLS certificate validation on PostgreSQL connections.                                                   |
| `DATABASE_POOL_MAX`         | No         | `20`                                          | Maximum concurrent connections in `pg.Pool`.                                                                     |
| `REDIS_QUEUE_URL`           | Yes (Prod) | `""`                                          | Cloud Redis URL (`rediss://...`) with `noeviction` policy for BullMQ queues.                                     |
| `REDIS_STATE_URL`           | Yes (Prod) | `""`                                          | Cloud Redis URL (`rediss://...`) with `volatile-ttl` policy for deduplication, mutex locks, and FSM checkpoints. |
| `MONGODB_ARCHIVE_ENABLED`   | No         | `false`                                       | Enables optional unstructured webhook telemetry archival to MongoDB Atlas.                                       |
| `MONGODB_URI`               | No         | `""`                                          | Cloud MongoDB Atlas `mongodb+srv://...` connection string.                                                       |
| `SENTRY_DSN`                | No         | `""`                                          | Optional Sentry DSN for `5xx` unhandled exception reporting.                                                     |

---

## Building and Running

```bash
# Development server with file watcher (loads ../.env if present)
pnpm --filter @tupynambalucas-dev/omnichannel-api dev

# Production TypeScript build
pnpm --filter @tupynambalucas-dev/omnichannel-api build

# Start compiled production bundle
pnpm --filter @tupynambalucas-dev/omnichannel-api start

# Typecheck and lint
pnpm --filter @tupynambalucas-dev/omnichannel-api typecheck
pnpm --filter @tupynambalucas-dev/omnichannel-api lint
```

---

## Navigation

- Parent Workspace: [Omnichannel Monorepo Root](../README.md)
- Shared Contracts: [`@tupynambalucas-dev/omnichannel-core`](../core/README.md)
- Security & Queue Runbooks:
  - [Webhook HMAC Security and Deduplication](../references/how-to-guides/webhook-hmac-security-and-deduplication.md)
  - [Per-Conversation FIFO Ordering and Checkpointing](../references/how-to-guides/per-conversation-fifo-and-checkpointing.md)
