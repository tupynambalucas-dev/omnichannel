# Explanation: Multi-Tenancy, Row-Level Security, and the Secret-Reference Model

This document explains how `@tupynambalucas-dev/omnichannel` isolates tenant data in Cloud PostgreSQL using `FORCE ROW LEVEL SECURITY` (`RLS`) and how the secret-reference model (`accessTokenSecretRef`) eliminates plaintext credential storage.

---

## 1. Defense-in-Depth Multi-Tenant Isolation with PostgreSQL RLS

In shared-schema multi-tenant SaaS architectures, relying solely on application-level `WHERE tenant_id = $1` clauses creates a single point of failure: one omitted predicate in a repository query can leak records across tenants.

`@tupynambalucas-dev/omnichannel` enforces isolation at both the application layer and the database storage engine:

1. **Transaction-Scoped Context (`withTenantContext`)**:
   In [`api/src/config/postgresConfig.ts`](../../api/src/config/postgresConfig.ts), every tenant-scoped repository operation checks out a dedicated `pg.PoolClient`, begins a transaction (`BEGIN`), and binds the tenant UUID to a transaction-local PostgreSQL configuration parameter:
   ```sql
   SELECT set_config('app.current_tenant_id', $1, true)
   ```
   Because the third argument (`is_local`) is `true`, the setting automatically resets when the transaction commits or rolls back, making it safe for connection pooling (including PgBouncer in transaction mode).
2. **Mandatory Engine Policies (`FORCE ROW LEVEL SECURITY`)**:
   Tables `workflow_definitions`, `tenant_channels`, `conversation_sessions`, and `opt_in_audit_trail` enable both `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` with policies checking `tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`.
3. **Non-Superuser Runtime Role (`NOBYPASSRLS`)**:
   Cloud migrations run under the database owner role, while the Fastify application connects as a least-privilege runtime role created with `NOBYPASSRLS`.

---

## 2. Why `tenant_channels` Stores `accessTokenSecretRef` Instead of Raw Tokens

Meta System User access tokens grant full messaging and account management permissions for a tenant's WhatsApp Business Account or Instagram Professional account. Storing those tokens in database columns (even encrypted at rest) exposes them to SQL injection, accidental query logging, backup snapshots, and analytical replicas.

Instead, `@tupynambalucas-dev/omnichannel` uses **Secret Reference Resolution**:

1. **Immutable Reference String**: When registering a channel (`POST /api/v1/tenants/:tenantId/channels`), the caller supplies `accessTokenSecretRef` (for example, `"META_GRAPH_ACCESS_TOKEN"` or `"META_TOKEN_ACME_WA"`), which is persisted in `tenant_channels.access_token_secret_ref`.
2. **Infisical / Environment Injection**: The actual Meta System User token is managed in Infisical Cloud and injected into the Node.js process environment (`infisical run -- ...`).
3. **Just-in-Time Resolution**: At outbound dispatch time, [`MetaGraphClient.resolveAccessToken()`](../../api/src/domains/compiler/meta-graph.client.ts) reads `process.env[secretRef]` in memory immediately before calling `fetch()` against `graph.facebook.com`.

---

## Canonical Upstream Sources

- PostgreSQL 16 Documentation — Row Security Policies: `https://www.postgresql.org/docs/current/ddl-rowsecurity.html` (retrieved 2026-11-17)
- PostgreSQL 16 Documentation — `set_config` & `current_setting` Functions: `https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET` (retrieved 2026-11-17)
- Infisical Documentation — Secret Reference & CLI Injection: `https://infisical.com/docs/cli/commands/run` (retrieved 2026-11-17)
