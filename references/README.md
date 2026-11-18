# Omnichannel Engineering Reference Hub (Diátaxis)

Authoritative architectural specifications, onboarding tutorials, operational runbooks, and protocol references for `@tupynambalucas-dev/omnichannel`.

All technical documents in this hub are organized strictly across the four **Diátaxis** quadrants (`tutorials/`, `how-to-guides/`, `reference/`, `explanation/`) and verified against [`core/src/`](../core/src/) and [`api/src/`](../api/src/).

---

## 1. Tutorials (Learning-Oriented)

Step-by-step lessons with concrete checkpoints for running and onboarding the platform from scratch:

| Document                                                                                                             | Scope                                                                                                                                                                                         |
| :------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Run Your First Conversation Locally (Zero-Config Mode)](./tutorials/run-first-conversation-locally.md)              | Booting the gateway with in-memory repositories and inline queues, inspecting `/health` and `/api/v1/tenants`, and running the 7-turn conversational simulation suites.                       |
| [Meta for Developers Registration and Channel Onboarding](./tutorials/meta-developer-app-and-channels-onboarding.md) | Registering a Meta Business Portfolio and unified App, configuring WhatsApp Cloud API and Instagram Login, exporting a System User token via `accessTokenSecretRef`, and verifying webhooks.  |
| [Cloud Databases Provisioning Without Docker](./tutorials/cloud-databases-provisioning-without-docker.md)            | Provisioning Neon/Supabase PostgreSQL (`app_runtime` with `NOBYPASSRLS`), applying `api/migrations/0001_initial_schema.sql`, and configuring dual TLS Redis (`noeviction` vs `volatile-ttl`). |

---

## 2. How-To Guides (Task-Oriented)

Practical runbooks directing competent engineers through specific operational and development tasks:

| Document                                                                                                                    | Scope                                                                                                                                                          |
| :-------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Verify and Replay Signed Meta Webhooks](./how-to-guides/verify-and-replay-meta-webhooks.md)                                | Testing `GET /webhooks/meta` challenges, computing raw-byte `X-Hub-Signature-256` HMAC digests, and replaying signed WhatsApp/Instagram events.                |
| [Publish a Custom Workflow via REST](./how-to-guides/publish-a-custom-workflow-via-rest.md)                                 | Validating graph rules, publishing immutable workflow versions via `POST /api/v1/tenants/:tenantId/workflows`, and rolling out zero-downtime version upgrades. |
| [Register and Rotate Channel Access Tokens](./how-to-guides/register-and-rotate-channel-access-tokens.md)                   | Binding WhatsApp/Instagram channels with `accessTokenSecretRef` and rotating Meta System User tokens via Infisical without database downtime.                  |
| [Diagnose Duplicate, Stuck, or Dropped Conversations](./how-to-guides/diagnose-duplicate-stuck-or-dropped-conversations.md) | Inspecting `dedup:msg:*`, `lock:conv:*`, and `session:*` keys in State Redis and troubleshooting `MetaGraphDispatchError` codes.                               |
| [Add a Workflow Node Type or Channel Limit](./how-to-guides/add-a-workflow-node-type-or-channel-limit.md)                   | Extending `WORKFLOW_NODE_TYPES` and `WorkflowNodeSchema` in `core` and implementing exhaustive handlers in `WorkflowEngine`.                                   |
| [Build and Run the Production Container Image](./how-to-guides/build-and-run-the-production-container-image.md)             | Building the multi-stage `api/Dockerfile` (`turbo prune` + `pnpm deploy`) from the monorepo root and running the production container.                         |

---

## 3. Reference (Information-Oriented)

Exact HTTP API contracts, environment schemas, JSONB workflow schemas, queue/Redis key tables, wire payloads, and PostgreSQL DDL:

| Document                                                                                                       | Scope                                                                                                                                                             |
| :------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [HTTP API Specification](./reference/http-api.md)                                                              | Complete request/response specification for `/health`, `/metrics`, `/webhooks/meta`, all 8 `/api/v1/tenants` routes, and the `AppError` envelope.                 |
| [Environment Variables and Secret References](./reference/environment-variables-and-secret-references.md)      | All 19 `EnvConfig` variables (`envSchema`), defaults, and the runtime `accessTokenSecretRef` resolution contract.                                                 |
| [Declarative FSM Workflow Schema Specification](./reference/declarative-fsm-workflow-schema.md)                | `WorkflowDefinitionSchema` contract, `globalKeywords` rules, all 7 deterministic node types, condition operators, and a validated canonical JSON example.         |
| [Queues, Redis Keys, and Retry Policies](./reference/queues-redis-keys-and-retry-policies.md)                  | `QUEUE_NAMES`, worker concurrency, exponential backoff/jitter, `outboundQueue.rateLimit()`, `REDIS_TTL_SECONDS`, and `conversationKey` formats.                   |
| [PostgreSQL Multi-Tenant DDL and Row-Level Security Schema](./reference/postgresql-rls-multi-tenant-schema.md) | Production SQL DDL (`tenants`, `workflow_definitions`, `tenant_channels`, `conversation_sessions`, `opt_in_audit_trail`) and `FORCE ROW LEVEL SECURITY` policies. |
| [Meta Messaging Payloads, Limits, and Error Codes](./reference/meta-messaging-payloads-and-limits.md)          | `WHATSAPP_LIMITS`, `INSTAGRAM_LIMITS`, outbound wire payloads (`button`, `list`, `cta_url`, `quick_replies`), inbound extraction mapping, and `META_ERROR_CODES`. |

---

## 4. Explanation (Understanding-Oriented)

Architectural rationale, concurrency trade-offs, security models, and Meta compliance design:

| Document                                                                                                                              | Scope                                                                                                                                                                       |
| :------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Unified Gateway and Persistence Architecture](./explanation/unified-gateway-and-persistence-architecture.md)                         | Why WhatsApp and Instagram share one stateless Fastify edge, why transitions route on immutable `payloadId`, polymorphic UI compilation, and PostgreSQL + Redis vs MongoDB. |
| [Webhook Ingestion and Idempotency Pipeline](./explanation/webhook-ingestion-and-idempotency-pipeline.md)                             | Why raw buffers must be preserved for `X-Hub-Signature-256`, why Instagram `is_echo` and WhatsApp `statuses` are filtered at ingress, and two-layer deduplication.          |
| [Conversation State, FIFO Ordering, and Checkpointing](./explanation/conversation-state-fifo-ordering-and-checkpointing.md)           | How `lock:conv:${conversationKey}` prevents per-user race conditions, why Queue Redis and State Redis are isolated, and pre-HTTP state checkpointing.                       |
| [Deterministic FSM Design and Workflow Versioning](./explanation/deterministic-fsm-design-and-workflow-versioning.md)                 | Why deterministic JSONB state machines are used over first-tier generative AI, and how immutable `workflow_definitions` rows protect in-flight sessions.                    |
| [Multi-Tenancy, Row-Level Security, and Secret References](./explanation/multi-tenancy-rls-and-secret-reference-model.md)             | How `withTenantContext` binds `app.current_tenant_id` for `FORCE ROW LEVEL SECURITY` and why `accessTokenSecretRef` replaces database-stored tokens.                        |
| [Meta Compliance, 24-Hour Messaging Window, and Quality Rating](./explanation/meta-compliance-messaging-window-and-quality-rating.md) | How the 24-hour window, global opt-out audit trails (`opt_in_audit_trail`), and rate-limit backoff protect Meta account quality ratings.                                    |

---

## Navigation

- Local Agent Context Router: [references/AGENTS.md](./AGENTS.md)
- Parent Workspace: [Omnichannel Monorepo Root](../README.md)
- Core Contracts Package: [`@tupynambalucas-dev/omnichannel-core`](../core/README.md)
- API Gateway Package: [`@tupynambalucas-dev/omnichannel-api`](../api/README.md)
