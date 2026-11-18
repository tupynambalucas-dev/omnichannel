# `@tupynambalucas-dev/omnichannel` — Monorepo Root Agent Context

This document is the Layer-1 context router for AI agents operating inside the `tupynambalucas-dev/omnichannel` enterprise multi-tenant omnichannel messaging repository.

## Directory Layout

- [README.md](./README.md): Primary developer documentation, architecture overview, and pipeline runbook.
- [package.json](./package.json): Root workspace manifest, scripts, and tooling dependencies.
- [pnpm-workspace.yaml](./pnpm-workspace.yaml): Centralized pnpm catalogs (`catalog:`, `tooling-stack`, `shared-stack`, `api-stack`, `plugins-stack`).
- [eslint.config.ts](./eslint.config.ts): Flat-config `strictTypeChecked` ESLint ruleset and package boundary enforcement.
- [turbo.json](./turbo.json): Turborepo build, lint, typecheck, and test task graph.
- [tsconfig.base.json](./tsconfig.base.json) / [tsconfig.json](./tsconfig.json) / [tsconfig.node.json](./tsconfig.node.json): Solution-style TypeScript Project References.
- [.env.example](./.env.example): Authoritative environment configuration template.
- [.agents/AGENTS.md](./.agents/AGENTS.md): Layer-2 router for organizational AI plugin bindings (`plugins.json`) and local plans (`.agents/plans/`).
- [core/AGENTS.md](./core/AGENTS.md): Layer-2 router for `@tupynambalucas-dev/omnichannel-core` (Zod v4 schemas, constants, validators, and FSM workflows).
- [api/AGENTS.md](./api/AGENTS.md): Layer-2 router for `@tupynambalucas-dev/omnichannel-api` (Fastify v5 gateway, compiler, BullMQ workers, and PostgreSQL RLS repositories).
- [references/AGENTS.md](./references/AGENTS.md): Layer-2 router for the Diátaxis engineering documentation hub (`references/`).

## Architecture & Pipeline

1. **Webhook Edge Ingestion (`POST /webhooks/meta`)**:
   - Encapsulated raw-buffer content parser in [`api/src/domains/webhooks/webhook.routes.ts`](./api/src/domains/webhooks/webhook.routes.ts) captures unparsed UTF-8 bytes on `request.rawBody`.
   - [`verifyMetaHmacSignature`](./api/src/domains/webhooks/webhook.security.ts) verifies `X-Hub-Signature-256` via constant-time `crypto.timingSafeEqual`.
   - Channel adapters ([`whatsapp.adapter.ts`](./api/src/domains/webhooks/adapters/whatsapp.adapter.ts), [`instagram.adapter.ts`](./api/src/domains/webhooks/adapters/instagram.adapter.ts)) filter Instagram `is_echo` events, separate delivery `statuses`, and normalize inbound events into `CanonicalInboundEnvelope`.
2. **Two-Layer Deduplication & Queue Dispatch**:
   - [`WebhookService`](./api/src/domains/webhooks/webhook.service.ts) claims a 24-hour idempotency key (`SET dedup:msg:{channel}:{providerMessageId} 1 EX 86400 NX`) in State Redis and enqueues the envelope to `omnichannel-inbound-events` with BullMQ job deduplication.
3. **Per-Conversation FIFO & Deterministic FSM Execution**:
   - [`inbound-webhook.worker.ts`](./api/src/queues/inbound-webhook.worker.ts) acquires a per-conversation Redis mutex (`lock:conv:{conversationKey}`) and reschedules contended jobs by `250ms` via `job.moveToDelayed()`.
   - [`WorkflowEngine`](./api/src/domains/workflow/workflow.engine.ts) loads or rehydrates `ConversationSession` from State Redis / Cloud PostgreSQL (scoped via `SELECT set_config('app.current_tenant_id', $1, true)`), evaluates global opt-out/reset/handoff keywords, executes deterministic nodes (`SEND_MESSAGE`, `ASK_INTERACTIVE`, `ASK_TEXT_VALIDATED`, `HTTP_REQUEST`, `CONDITION_SWITCH`, `DELAY_TIMER`, `HUMAN_HANDOFF`), and checkpoints state before outbound HTTP calls.
4. **Polymorphic Compilation & Rate-Limited Delivery**:
   - [`outbound.compiler.ts`](./api/src/domains/compiler/outbound.compiler.ts) compiles channel-neutral UI blocks (`TEXT`, `QUICK_CHOICES`, `MENU_CHOICES`, `CTA_URL`, `CAROUSEL_CARDS`) into native WhatsApp Cloud API or Instagram Messaging API payloads.
   - [`outbound-dispatch.worker.ts`](./api/src/queues/outbound-dispatch.worker.ts) resolves tenant tokens at runtime from `process.env[accessTokenSecretRef]`, paces delivery, pauses the queue via `outboundQueue.rateLimit()` on error `130429`/`131056`/HTTP `429`, and halts permanently on `131026`, `131047`, or Instagram subcode `2534022`.

## Operational & Security Guardrails

1. **Strict Package Boundaries**: `core` has zero infrastructure coupling (enforced by `no-restricted-imports` and `no-restricted-properties` in `eslint.config.ts`); `api` imports `core` strictly through `@tupynambalucas-dev/omnichannel-core`.
2. **Cloud-First Persistence with Zero-Config Fallback**: Production connects to Cloud PostgreSQL (with `FORCE ROW LEVEL SECURITY`) and dual TLS Redis instances (`REDIS_QUEUE_URL` with `noeviction`; `REDIS_STATE_URL` with `volatile-ttl`). Leaving datastore URLs blank in development activates deterministic in-memory repositories and inline queue execution.
3. **Secret Reference Resolution**: Never store plaintext tokens in PostgreSQL (`tenant_channels.access_token_secret_ref` stores only the environment variable name).
4. **Architectural Plans Dual-Storage Standard**:
   - Blueprints, technical analyses, and audit plans reside in `.agents/plans/<artifact-slug>.md` (Topology 1) or `.agents/plans/<artifact-slug>/` (Topology 2).
   - Every plan artifact created in `<appDataDir>/brain/<conversation-id>/` MUST be mirrored identically in `.agents/plans/`.
   - `.agents/plans/` is ignored by `.gitignore` and un-ignored in `.ignore` and `.rgignore` (`!.agents/plans/`, `!.agents/plans/**`) with `"search.useIgnoreFiles": false` in `.vscode/settings.json`.

## Required Skills

- **`monorepo-architect`**: Active when modifying `pnpm-workspace.yaml`, `package.json`, `turbo.json`, or `tsconfig*.json`.
- **`router-architect`**: Active when creating or updating any `AGENTS.md` file within the 3-layer ceiling.
- **`readme-architect`**: Active when creating or updating any `README.md` file.
- **`docusaurus-architect` / `docusaurus-mdx-architect` / `docusaurus-auditor`**: Active when maintaining Diátaxis documentation in `references/`.
- **`github-standards-architect` / `github-flow-operator`**: Active when maintaining `.github/` workflows, staging changes, signing commits, or opening pull requests.
