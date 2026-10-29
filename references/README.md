# Omnichannel Engineering Reference Hub (Diátaxis)

Authoritative architectural specifications, cloud onboarding tutorials, operational runbooks, and protocol schemas for `@tupynambalucas-dev/omnichannel`.

All technical documents in this directory follow the **Diátaxis Framework** and enforce strict source attribution against official upstream specifications.

---

## Foundational Blueprint

- [Omnichannel Architectural Masterplan](./omnichannel-master-plan.md): Original multi-tenant system design specification covering unified Fastify webhook ingestion, deterministic JSONB finite state machines, partitioned BullMQ queues, and PostgreSQL Row-Level Security.

---

## 1. Tutorials (Learning-Oriented)

Step-by-step onboarding guides for configuring external cloud platforms from scratch without local Docker dependencies:

| Document                                                                                                             | Scope                                                                                                                                                                                            |
| :------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Meta for Developers Registration and Channel Onboarding](./tutorials/meta-developer-app-and-channels-onboarding.md) | Creating a Meta Developer account, Business Portfolio, Business App, System User permanent tokens, WhatsApp Cloud API, Instagram API with Instagram Login, and webhook verification.             |
| [Cloud Databases Provisioning Without Docker](./tutorials/cloud-databases-provisioning-without-docker.md)            | Provisioning Neon/Supabase PostgreSQL (with `NOBYPASSRLS` runtime role), dual TLS Redis instances on Upstash/Redis Cloud (`noeviction` vs `volatile-ttl`), and optional MongoDB Atlas archiving. |

---

## 2. How-To Guides (Task-Oriented)

Focused implementation runbooks for critical reliability and security workflows:

| Document                                                                                                             | Scope                                                                                                                                                                               |
| :------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Webhook HMAC Security and Two-Layer Deduplication](./how-to-guides/webhook-hmac-security-and-deduplication.md)      | Capturing raw byte buffers in Fastify 5, verifying `X-Hub-Signature-256` in constant time, filtering Instagram `is_echo` events, and enforcing Redis + BullMQ idempotency.          |
| [Per-Conversation FIFO Ordering and State Checkpointing](./how-to-guides/per-conversation-fifo-and-checkpointing.md) | Preventing race conditions on rapid user clicks via partitioned session locks, checkpointing before external ERP HTTP calls, rate-limit pacing, and PostgreSQL session rehydration. |

---

## 3. Reference (Information-Oriented)

Exact wire protocols, JSON schemas, platform limits, error codes, and SQL DDL contracts:

| Document                                                                                                       | Scope                                                                                                                                                                                                                           |
| :------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Meta Messaging Payloads, Limits, and Error Codes](./reference/meta-messaging-payloads-and-limits.md)          | WhatsApp Cloud API and Instagram Graph API inbound webhook structures, interactive outbound schemas (`button`, `list`, `cta_url`, `quick_replies`, `generic`), character caps, and error codes (`130429`, `131026`, `2534022`). |
| [Declarative FSM Workflow Schema Specification](./reference/declarative-fsm-workflow-schema.md)                | Complete JSONB Workflow Schema v2.0 contract, `globalKeywords` opt-out compliance, all 7 deterministic node handlers, transition expressions, and context interpolation rules.                                                  |
| [PostgreSQL Multi-Tenant DDL and Row-Level Security Schema](./reference/postgresql-rls-multi-tenant-schema.md) | Production SQL DDL for `tenants`, `tenant_channels`, `workflow_versions`, `conversation_sessions`, range-partitioned `messages_log`, `opt_in_audit_trails`, UUIDv7 keys, and `FORCE ROW LEVEL SECURITY` policies.               |

---

## 4. Explanation (Understanding-Oriented)

Architectural trade-offs and design decisions:

| Document                                                                                                      | Scope                                                                                                                                                                                                                           |
| :------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Unified Gateway and Persistence Architecture](./explanation/unified-gateway-and-persistence-architecture.md) | Rationale behind unifying WhatsApp and Instagram in a single stateless Fastify edge, polymorphic UI compilation, immutable payload-ID routing, and selecting PostgreSQL (JSONB + MVCC + RLS) + Redis over MongoDB Replica Sets. |

---

## Navigation

- Parent Workspace: [Omnichannel Monorepo Root](../README.md)
