# `@tupynambalucas-dev/omnichannel` — Monorepo Root Agent Context

This document is the Layer-1 context router for AI agents operating inside the `tupynambalucas-dev/omnichannel` enterprise multi-tenant omnichannel messaging repository.

## Workspace Navigation

- [README.md](./README.md): Primary developer documentation, architecture overview, and pipeline runbook.
- [.agents/AGENTS.md](./.agents/AGENTS.md): Organizational AI plugin bindings (`plugins.json`) and customization guardrails.
- [core/AGENTS.md](./core/AGENTS.md): Shared Zod v4 contracts (`@tupynambalucas-dev/omnichannel-core`), Canonical Inbound Envelope, Polymorphic UI Blocks, and FSM Workflow schemas.
- [api/AGENTS.md](./api/AGENTS.md): Unified Fastify v5 Webhook Gateway (`@tupynambalucas-dev/omnichannel-api`), Polymorphic Channel Compiler, BullMQ Workers, and PostgreSQL RLS repositories.
- [references/README.md](./references/README.md): Diátaxis architectural documentation hub, Meta for Developers tutorials, and cloud database setup guides.

## Architectural Invariants

1. **Unified Stateless Webhook Edge**:
   - Both WhatsApp Cloud API (`whatsapp_business_account`) and Instagram Messaging API (`instagram`) webhooks terminate at `/webhooks/meta`.
   - `X-Hub-Signature-256` HMAC-SHA256 verification MUST always run against raw unparsed request bytes (`request.rawBody`) using `crypto.timingSafeEqual`.
2. **Deterministic FSM Engine**:
   - Conversation flows execute strictly through Zod-validated JSONB Finite State Machine nodes (`SEND_MESSAGE`, `ASK_INTERACTIVE`, `ASK_TEXT_VALIDATED`, `HTTP_REQUEST`, `CONDITION_SWITCH`, `DELAY_TIMER`, `HUMAN_HANDOFF`).
   - Interactive choices route exclusively on immutable `payloadId` strings, never brittle localized button titles.
   - `HTTP_REQUEST` nodes MUST checkpoint session state prior to executing outbound external HTTP calls.
3. **Cloud-First Persistence (Zero Local Docker Requirement)**:
   - Primary transactional state lives in Cloud PostgreSQL (Neon / Supabase) with `FORCE ROW LEVEL SECURITY` scoped via `SELECT set_config('app.current_tenant_id', $1, true)`.
   - Queue brokering (`REDIS_QUEUE_URL`, `noeviction`) and hot session/deduplication state (`REDIS_STATE_URL`, `volatile-ttl`) connect over TLS (`rediss://`) to cloud Redis providers.
   - MongoDB Atlas (`MONGODB_ARCHIVE_ENABLED=true`) is strictly opt-in for unstructured raw webhook telemetry archiving.
4. **Monorepo & Governance Standards**:
   - All dependencies MUST resolve from `pnpm-workspace.yaml` catalogs (`catalog:`, `catalog:tooling-stack`, `catalog:shared-stack`, `catalog:api-stack`, `catalog:plugins-stack`).
   - TypeScript builds use native Solution Project References (`tsconfig.base.json`, `tsconfig.json`, `tsconfig.node.json`, `core/tsconfig.json`, `api/tsconfig.json`). Legacy `tsconfig.build.json` files are prohibited.
   - All commits MUST follow Conventional Commits v1.0.0 and be cryptographically signed with SSH (`git commit -S -m "..."`).
   - Emojis are strictly forbidden across code, logs, documentation, commit messages, and agent responses.

## Required Skills

- **`monorepo-architect`**: Active when modifying `pnpm-workspace.yaml`, `package.json`, `turbo.json`, or `tsconfig*.json`.
- **`router-architect`**: Active when creating or updating any `AGENTS.md` file.
- **`readme-architect`**: Active when creating or updating any `README.md` file.
- **`github-flow-operator`**: Active when staging, signing commits, or opening pull requests.
