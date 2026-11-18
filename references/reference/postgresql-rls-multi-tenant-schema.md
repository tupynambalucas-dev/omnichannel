# Reference: PostgreSQL Multi-Tenant DDL and Row-Level Security Schema

Production SQL DDL contract for `@tupynambalucas-dev/omnichannel` targeting PostgreSQL 16+ (Neon Serverless Postgres or Supabase Postgres), synchronized with [`api/migrations/0001_initial_schema.sql`](../../api/migrations/0001_initial_schema.sql), [`TenantRepository`](../../api/src/domains/tenants/tenant.repository.ts), and [`SessionStateRepository`](../../api/src/domains/workflow/session-state.repository.ts).

---

## 1. Architectural Properties

1. **Time-Ordered UUIDv7 Primary Keys**: Generated in Node.js via RFC 9562 `generateUuidV7()` (`core/src/utils/uuidv7.ts`) to preserve B-Tree locality and maximize PostgreSQL Heap-Only Tuple (`HOT`) updates on `conversation_sessions`.
2. **Immutable Workflow Versioning (`workflow_definitions`)**: Active channels reference an immutable `workflow_definitions.id` row (`active_workflow_id`) so publishing new workflow versions never corrupts in-flight customer sessions.
3. **Secret Reference Hygiene (`access_token_secret_ref`)**: `tenant_channels` never stores plaintext or raw Meta System User tokens. It stores only the environment variable reference (`access_token_secret_ref`), resolved at runtime from `process.env[secretRef]`.
4. **Mandatory Row-Level Security (`FORCE ROW LEVEL SECURITY`)**: Every tenant-scoped mutation executes inside `withTenantContext(pool, tenantId, fn)` (`api/src/config/postgresConfig.ts`), which opens a `BEGIN ... COMMIT` transaction and sets `SELECT set_config('app.current_tenant_id', $1, true)`.

---

## 2. Table Catalog

| Table                   | Primary Key | Unique Constraints                   | RLS Policy                                         | Repository Consumer                                                |
| :---------------------- | :---------- | :----------------------------------- | :------------------------------------------------- | :----------------------------------------------------------------- |
| `tenants`               | `id (UUID)` | `(slug)`                             | Global registry table                              | `TenantRepository.createTenant`, `listTenants`                     |
| `workflow_definitions`  | `id (UUID)` | `(tenant_id, workflow_key, version)` | Strict `tenant_id = app.current_tenant_id`         | `TenantRepository.publishWorkflow`, `getWorkflowById`              |
| `tenant_channels`       | `id (UUID)` | `(channel, channel_account_id)`      | Tenant-scoped writes; ingress channel-lookup reads | `TenantRepository.registerChannel`, `resolveInboundChannelContext` |
| `conversation_sessions` | `id (UUID)` | `(tenant_id, conversation_key)`      | Strict `tenant_id = app.current_tenant_id`         | `SessionStateRepository.getOrRehydrateSession`, `saveCheckpoint`   |
| `opt_in_audit_trail`    | `id (UUID)` | —                                    | Strict `tenant_id = app.current_tenant_id`         | `SessionStateRepository.recordOptInAudit`                          |

---

## 3. Authoritative SQL Migration (`api/migrations/0001_initial_schema.sql`)

```sql
-- 1. TENANTS (Root Corporate Accounts - Global Lookup Table)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. WORKFLOW DEFINITIONS (Immutable Declarative JSONB FSM Graphs)
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_key VARCHAR(64) NOT NULL,
  version INT NOT NULL CHECK (version > 0),
  name VARCHAR(120) NOT NULL,
  definition JSONB NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, workflow_key, version)
);

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_tenant_key
  ON workflow_definitions (tenant_id, workflow_key, version DESC);

-- 3. TENANT CHANNELS (WhatsApp phone_number_id / Instagram ig_account_id)
CREATE TABLE IF NOT EXISTS tenant_channels (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL
    CHECK (channel IN ('whatsapp', 'instagram')),
  channel_account_id VARCHAR(128) NOT NULL,
  display_handle VARCHAR(128) NOT NULL,
  access_token_secret_ref VARCHAR(256) NOT NULL,
  active_workflow_id UUID REFERENCES workflow_definitions(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel, channel_account_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_channels_lookup
  ON tenant_channels (channel, channel_account_id)
  WHERE is_active = TRUE;

-- 4. CONVERSATION SESSIONS (UUIDv7 + Checkpointed JSONB State)
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL
    CHECK (channel IN ('whatsapp', 'instagram')),
  channel_account_id VARCHAR(128) NOT NULL,
  conversation_key VARCHAR(256) NOT NULL,
  end_user_id VARCHAR(128) NOT NULL,
  end_user_name TEXT,
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id),
  workflow_version INT NOT NULL CHECK (workflow_version > 0),
  current_node_id VARCHAR(128) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'WAITING_INPUT', 'DELAYED', 'HUMAN_HANDOFF', 'COMPLETED', 'OPTED_OUT')),
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  invalid_attempts INT NOT NULL DEFAULT 0,
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_expires_at TIMESTAMPTZ NOT NULL,
  state_version INT NOT NULL DEFAULT 1,
  UNIQUE (tenant_id, conversation_key)
);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_lookup
  ON conversation_sessions (tenant_id, conversation_key);

-- 5. OPT-IN / OPT-OUT REGULATORY AUDIT TRAIL (LGPD / GDPR / Meta Compliance)
CREATE TABLE IF NOT EXISTS opt_in_audit_trail (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL
    CHECK (channel IN ('whatsapp', 'instagram')),
  end_user_id VARCHAR(128) NOT NULL,
  opted_in BOOLEAN NOT NULL,
  source VARCHAR(64) NOT NULL
    CHECK (source IN (
      'INBOUND_USER_MESSAGE',
      'CLICK_TO_WHATSAPP_AD',
      'IG_COMMENT_TRIGGER',
      'WEB_CHECKBOX_CONSENT',
      'USER_STOP_KEYWORD'
    )),
  evidence_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opt_in_audit_trail_lookup
  ON opt_in_audit_trail (tenant_id, channel, end_user_id, recorded_at DESC);

-- 6. MANDATORY ROW-LEVEL SECURITY (RLS) ISOLATION POLICIES
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_definitions FORCE ROW LEVEL SECURITY;

ALTER TABLE tenant_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_channels FORCE ROW LEVEL SECURITY;

ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE opt_in_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE opt_in_audit_trail FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_workflow_definitions ON workflow_definitions
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_tenant_channels ON tenant_channels
  FOR ALL
  USING (
    NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_conversation_sessions ON conversation_sessions
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_opt_in_audit_trail ON opt_in_audit_trail
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
```

---

## Canonical Upstream Sources

- PostgreSQL 16 Documentation — Row Security Policies (`ENABLE` & `FORCE ROW LEVEL SECURITY`): `https://www.postgresql.org/docs/current/ddl-rowsecurity.html` (retrieved 2026-11-17)
- RFC 9562 — Universally Unique IDentifiers (UUIDv7): `https://datatracker.ietf.org/doc/html/rfc9562` (retrieved 2026-11-17)
- node-postgres (`pg`) Transaction Isolation: `https://node-postgres.com/features/transactions` (Context7 `/brianc/node-postgres`, retrieved 2026-11-17)
