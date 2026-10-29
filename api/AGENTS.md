<context-hierarchy>
  <parent src="../AGENTS.md" type="global-rules" />
  <system-instruction>
    AGENT: You are operating in the api bounded context (@tupynambalucas-dev/omnichannel-api). If you have not read ../AGENTS.md in this session, stop now and read it using your file-reading tools before proceeding.
  </system-instruction>
</context-hierarchy>

# Local Context: Omnichannel API (`@tupynambalucas-dev/omnichannel-api`)

Stateless Fastify v5 HTTP gateway, polymorphic Meta Graph channel compiler, deterministic FSM workflow engine, and BullMQ worker runtime for `@tupynambalucas-dev/omnichannel`.

## Directory Layout

- [README.md](./README.md): Service configuration, HTTP endpoints, environment variables, and runbook.
- [src/index.ts](./src/index.ts): Server bootstrap and graceful `SIGINT`/`SIGTERM` shutdown handler.
- [src/config/](./src/config/): Environment schema (`envConfig.ts`), Fastify logger (`fastifyInstanceConfig.ts`), Cloud PostgreSQL RLS transaction helper (`postgresConfig.ts`), and Cloud TLS Redis / BullMQ connection parser (`redisConfig.ts`).
- [src/plugins/](./src/plugins/): Fastify plugins (`registryPlugin.ts`, `errorHandlerPlugin.ts`, `sentryPlugin.ts`, `postgresPlugin.ts`, `redisPlugin.ts`, `mongoArchivePlugin.ts`, `queuePlugin.ts`).
- [src/domains/webhooks/](./src/domains/webhooks/): Raw-buffer `X-Hub-Signature-256` verification, WhatsApp & Instagram adapters (`is_echo` filter, `statuses` separation), and 24-hour `SET NX EX` deduplication.
- [src/domains/compiler/](./src/domains/compiler/): Variable template interpolator, polymorphic WhatsApp/Instagram payload compiler, and `MetaGraphClient` with error classification (`130429`, `131026`, `2534022`).
- [src/domains/workflow/](./src/domains/workflow/): Deterministic `WorkflowEngine`, `SessionStateRepository` (Redis hot checkpoint + PostgreSQL rehydration), and `condition-evaluator.ts`.
- [src/domains/tenants/](./src/domains/tenants/): Multi-tenant onboarding, channel binding, starter triage workflow generator, and `/api/v1/tenants` REST routes.
- [src/queues/](./src/queues/): BullMQ workers enforcing per-conversation Redis mutex locking (`inbound-webhook.worker.ts`) and rate-limited outbound delivery (`outbound-dispatch.worker.ts`).

## Architecture & Operational Guardrails

1. **Webhook Latency Budget (`< 50ms`)**: `/webhooks/meta` MUST NEVER call external HTTP APIs or execute multi-step workflows synchronously when `REDIS_QUEUE_URL` is configured; verify HMAC, deduplicate, enqueue to `omnichannel-inbound-events`, and return `200 OK`.
2. **Encapsulated Raw Body Parser**: Keep the `{ parseAs: 'buffer' }` JSON parser encapsulated inside `webhook.routes.ts` so standard JSON parsing on `/api/v1/*` remains unaffected.
3. **Tenant Isolation**: Every tenant-scoped PostgreSQL query MUST execute through `withTenantContext(pool, tenantId, fn)` so `app.current_tenant_id` enforces Row-Level Security.
4. **Secret Reference Resolution**: Never persist plaintext Meta tokens in PostgreSQL. Store only `access_token_secret_ref` (e.g. `META_TOKEN_ACME_WA`) and resolve from `process.env` at outbound dispatch time.

## Required Skills

- **`monorepo-architect`**: Active when modifying `package.json` or `tsconfig.json`.
- **`documentation-researcher`**: Active when verifying Fastify v5, BullMQ v6, `pg`, or `ioredis` APIs.
- **`infisical-vault-operator`**: Active when configuring runtime secret injection.
