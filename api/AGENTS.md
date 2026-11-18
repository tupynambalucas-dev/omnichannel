<context-hierarchy>
  <parent src="../AGENTS.md" type="global-rules" />
  <system-instruction>
    AGENT: You are operating in the api bounded context (@tupynambalucas-dev/omnichannel-api). If you have not read ../AGENTS.md in this session, stop now and read it using your file-reading tools before proceeding.
  </system-instruction>
</context-hierarchy>

# Local Context: Omnichannel API (`@tupynambalucas-dev/omnichannel-api`)

Stateless Fastify v5 HTTP gateway, polymorphic Meta Graph channel compiler, deterministic FSM workflow engine, and BullMQ worker runtime for `@tupynambalucas-dev/omnichannel`.

## Directory Layout

- [README.md](./README.md): Service configuration, HTTP endpoints, environment variables, testing, and runbook.
- [package.json](./package.json) / [tsconfig.json](./tsconfig.json): Service manifest and composite TypeScript configuration referencing `../core`.
- [Dockerfile](./Dockerfile) / [.dockerignore](./.dockerignore): Multi-stage production container image using `turbo prune` and `pnpm deploy`.
- [migrations/0001_initial_schema.sql](./migrations/0001_initial_schema.sql): Authoritative PostgreSQL 16+ DDL migration with `FORCE ROW LEVEL SECURITY`.
- [src/index.ts](./src/index.ts): Server bootstrap and graceful `SIGINT`/`SIGTERM` shutdown handler.
- [src/config/](./src/config/): Environment schema (`envConfig.ts`), Fastify logger (`fastifyInstanceConfig.ts`), Cloud PostgreSQL RLS transaction helper (`postgresConfig.ts`), and Cloud TLS Redis / BullMQ connection parser (`redisConfig.ts`).
- [src/plugins/](./src/plugins/): Fastify plugins (`registryPlugin.ts`, `errorHandlerPlugin.ts`, `sentryPlugin.ts`, `postgresPlugin.ts`, `redisPlugin.ts`, `mongoArchivePlugin.ts`, `queuePlugin.ts`).
- [src/domains/webhooks/](./src/domains/webhooks/): Raw-buffer `X-Hub-Signature-256` verification, WhatsApp & Instagram adapters (`is_echo` filter, `statuses` separation), and 24-hour `SET NX EX` deduplication.
- [src/domains/compiler/](./src/domains/compiler/): Variable template interpolator (`template-interpolator.ts`), polymorphic WhatsApp/Instagram payload compiler (`outbound.compiler.ts`), and `MetaGraphClient` (`meta-graph.client.ts`).
- [src/domains/workflow/](./src/domains/workflow/): Deterministic `WorkflowEngine` (`workflow.engine.ts`), `SessionStateRepository` (`session-state.repository.ts`), and `condition-evaluator.ts`.
- [src/domains/tenants/](./src/domains/tenants/): Multi-tenant onboarding, channel binding, workflow publication, starter/guided/standard workflow bootstrap, and `/api/v1/tenants` REST routes.
- [src/queues/](./src/queues/): BullMQ workers enforcing per-conversation Redis mutex locking (`inbound-webhook.worker.ts`) and rate-limited outbound delivery (`outbound-dispatch.worker.ts`).
- [src/types/fastify.d.ts](./src/types/fastify.d.ts) / [src/utils/AppError.ts](./src/utils/AppError.ts): Fastify instance type augmentations and structured HTTP error class.
- [test/](./test/): Multi-turn workflow simulation and webhook integration suites (`guided-prototype-simulation.test.ts`, `standard-onboarding-simulation.test.ts`, `documentation-alignment.test.ts`).

## Architecture & Pipeline

1. **Plugin Registration (`registryPlugin.ts`)**:
   - Registers `@fastify/env`, Zod validator/serializer compilers, error handler, Sentry, `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit` (`600` requests/min), Prometheus `/metrics`, PostgreSQL pool, State Redis, optional MongoDB archive, BullMQ queues/workers, auto-bootstrap of `tupynamba-lucas-enterprise` (when `DEFAULT_TENANT_AUTO_BOOTSTRAP=true`), `/health`, `/webhooks/meta`, and `/api/v1/tenants`.
2. **Webhook Ingestion & Deduplication (`domains/webhooks/`)**:
   - Captures `request.rawBody` inside the encapsulated `/webhooks` scope, verifies `X-Hub-Signature-256` in constant time, normalizes payloads into `CanonicalInboundEnvelope` (`conversationKey` formatted as `wa:{phoneNumberId}:{fromWaId}` or `ig:{recipientId}:{senderId}`), claims `dedup:msg:{channel}:{providerMessageId}` (`EX 86400 NX`), and enqueues to `omnichannel-inbound-events`.
3. **FIFO Worker & FSM Execution (`queues/inbound-webhook.worker.ts`, `domains/workflow/`)**:
   - Acquires `lock:conv:{conversationKey}` (`EX 30 NX`), rescheduling contended jobs by `250ms` via `job.moveToDelayed()`.
   - Rehydrates or initializes `ConversationSession`, checks 24-hour window expiry and global keywords, steps through the workflow graph, checkpoints prior to `HTTP_REQUEST` calls, and enqueues outbound UI components.
4. **Outbound Compilation & Delivery (`domains/compiler/`, `queues/outbound-dispatch.worker.ts`)**:
   - Resolves tenant channel context, reads `process.env[accessTokenSecretRef]`, compiles abstract UI blocks into provider-native JSON requests, dispatches to Meta Graph API, pauses `outboundQueue` via `outboundQueue.rateLimit()` on rate-limit errors (`130429`, `131056`, HTTP `429`), and throws `UnrecoverableError` on permanent policy/window errors (`131026`, `131047`, Instagram `10`/`2534022`).

## Operational & Security Guardrails

1. **Webhook Latency Budget (`< 50ms`)**: `/webhooks/meta` MUST NEVER call external HTTP APIs or execute multi-step workflows synchronously when `REDIS_QUEUE_URL` is configured; verify HMAC, deduplicate, enqueue to `omnichannel-inbound-events`, and return `200 OK`.
2. **Encapsulated Raw Body Parser**: Keep the `{ parseAs: 'buffer' }` JSON parser encapsulated inside `webhook.routes.ts` so standard JSON parsing on `/api/v1/*` remains unaffected.
3. **Tenant Isolation**: Every tenant-scoped PostgreSQL query MUST execute through `withTenantContext(pool, tenantId, fn)` so `app.current_tenant_id` enforces Row-Level Security.
4. **Secret Reference Resolution**: Never persist plaintext Meta tokens in PostgreSQL. Store only `access_token_secret_ref` (e.g. `META_GRAPH_ACCESS_TOKEN`) and resolve from `process.env` at outbound dispatch time.
5. **Package Boundary & Testing Discipline**:
   - Import shared contracts exclusively from `@tupynambalucas-dev/omnichannel-core` (deep `../core/src/*` imports are forbidden by `eslint.config.ts`).
   - Tests in `test/` use deterministic in-memory repository fallbacks (`null` pool and Redis) and must never include real tokens or spawn child `AGENTS.md` / `README.md` files.

## Required Skills

- **`monorepo-architect`**: Active when modifying `package.json` or `tsconfig.json`.
- **`documentation-researcher`**: Active when verifying Fastify v5, BullMQ v6, `pg`, or `ioredis` APIs.
- **`infisical-vault-operator`**: Active when configuring runtime secret injection.
- **`readme-architect` / `router-architect`**: Active when updating `api/README.md` or `api/AGENTS.md`.
