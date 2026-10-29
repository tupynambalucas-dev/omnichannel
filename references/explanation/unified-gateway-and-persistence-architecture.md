# Explanation: Unified Gateway and Persistence Architecture

This document explains the core architectural decisions behind `@tupynambalucas-dev/omnichannel`: why WhatsApp and Instagram share a single stateless Fastify edge, why UI components are stored abstractly and compiled polymorphically, why transitions never match button display text, and why PostgreSQL + Dual Redis was selected over MongoDB Replica Sets.

---

## 1. Why Consolidate WhatsApp and Instagram in One Stateless Fastify Gateway?

Following Meta's retirement of the legacy WhatsApp On-Premises API in October 2025, both **WhatsApp Cloud API** and **Instagram Messaging API** operate on the unified Meta Graph infrastructure (`graph.facebook.com`) with identical operational invariants:

1. **Identical Handshake Protocol**: Both channels verify webhooks via `GET` requests carrying `hub.mode=subscribe`, `hub.verify_token`, and `hub.challenge`.
2. **Identical Cryptographic Authenticity**: Both sign raw HTTP payloads using `X-Hub-Signature-256` (`HMAC-SHA256` keyed with the Meta App Secret).
3. **Identical Edge SLA**: Both require HTTP `200 OK` within 3 seconds before triggering exponential retry storms lasting up to 7 days.

Splitting WhatsApp and Instagram into separate edge microservices duplicates TLS ingress routing, webhook secret rotation, Prometheus metrics, and BullMQ producer connections without adding fault isolation. Instead, Fastify's encapsulated plugin architecture isolates raw-buffer signature validation on `/webhooks/meta`, delegates channel-specific JSON normalization to pure **Ingress Adapters** (`whatsapp.adapter.ts` and `instagram.adapter.ts`), enqueues a **Canonical Inbound Envelope**, and returns `200 OK` in milliseconds.

---

## 2. Why Route Exclusively on Immutable `payload` IDs Instead of Button Titles?

A widespread defect in commercial chat integrations is storing or matching the visible `title` of an interactive button (such as `"Confirm"`, `"Yes"`, or `"Back"`) rather than its hidden programmatic identifier (`interactive.button_reply.id` in WhatsApp or `quick_reply.payload` / `postback.payload` in Instagram).

Relying on display text introduces three failure modes:

- Multiple workflow branches frequently reuse identical human labels (`"Yes"` / `"No"`).
- Tenant copywriters editing a button label from `"2nd Copy"` to `"Open Invoice"` silently break downstream transition conditions.
- Localization across languages requires duplicating business logic.

In `@tupynambalucas-dev/omnichannel`, `CanonicalInboundEnvelope` separates `payload` (the immutable machine ID) from `text` (human display copy), and `ASK_INTERACTIVE` transitions evaluate `input.payload` exclusively.

---

## 3. Why Abstract UI Blocks and Polymorphic Outbound Compilation?

WhatsApp and Instagram enforce incompatible interactive limits:

- Presenting **5 options** on WhatsApp using Reply Buttons fails with `HTTP 400` because Reply Buttons cap at **3**; WhatsApp requires promoting 4–10 choices into an **Interactive List** (`interactive.type: "list"`).
- Presenting **5 options** on Instagram cannot use WhatsApp's `list` object, but fits natively inside Instagram **Quick Replies** (which support up to **13** horizontal pills).
- External URLs require `cta_url` on WhatsApp versus a `button` or `generic` template on Instagram.

By persisting channel-agnostic `AbstractUiComponent` blocks inside `workflow_versions.definition_schema`, a tenant authors **one** conversational workflow and `OutboundChannelCompiler` synthesizes valid channel-native Graph API payloads at dispatch time.

---

## 4. Why PostgreSQL (JSONB + RLS) + Dual Redis Over MongoDB Replica Sets?

While Redis provides sub-millisecond reads and locks during active conversations, durable ACID storage is required for tenant credentials, workflow versions, session rehydration, and regulatory opt-in/opt-out audit trails.

PostgreSQL 16+ was chosen over MongoDB Replica Sets as the primary database for four engineering reasons:

1. **Database-Enforced Multi-Tenant Isolation (`RLS`)**: PostgreSQL natively enforces `FORCE ROW LEVEL SECURITY` in the storage engine via `current_setting('app.current_tenant_id')`. Even if an application query omits a `WHERE tenant_id = ...` predicate, cross-tenant data leakage is blocked by PostgreSQL itself. MongoDB lacks native engine-level RLS on shared collections.
2. **Low-Contention MVCC Transactions**: Updating `conversation_sessions`, appending `messages_log`, and recording `opt_in_audit_trails` inside a single ACID transaction leverages PostgreSQL MVCC without the multi-document transaction lock overhead of MongoDB Replica Sets.
3. **Indexed Binary `JSONB` Parity**: Dynamic workflow graphs (`definition_schema`) and session variables (`context_variables`) enjoy schema flexibility inside `JSONB` columns while retaining strict foreign-key referential integrity against `tenants` and `workflow_versions`.
4. **Optional Cold Archiving Only for MongoDB**: For teams wishing to retain raw unparsed webhook payloads in a separate document store, `@tupynambalucas-dev/omnichannel-api` exposes an opt-in `mongoArchivePlugin` (`MONGODB_ARCHIVE_ENABLED=true`) backed by MongoDB Atlas without coupling core state transitions to MongoDB.

---

## Canonical Upstream Sources

- Omnichannel Architectural Masterplan (Sections 1–6): [`references/omnichannel-master-plan.md`](../omnichannel-master-plan.md)
- PostgreSQL Documentation — Row Security Policies & MVCC: `https://www.postgresql.org/docs/current/mvcc.html`
- BullMQ Production Architecture: Context7 `/websites/bullmq_io`
