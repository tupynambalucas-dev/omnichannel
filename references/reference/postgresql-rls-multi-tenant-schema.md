# Reference: PostgreSQL Multi-Tenant DDL and Row-Level Security Schema

Production SQL DDL contract for `@tupynambalucas-dev/omnichannel` targeting PostgreSQL 16+ (Neon Serverless Postgres or Supabase Postgres).

Key architectural properties:

1. **Time-Ordered UUIDv7 Primary Keys**: Generated in Node.js via RFC 9562 `generateUuidV7()` to preserve B-Tree locality and maximize PostgreSQL Heap-Only Tuple (`HOT`) updates on `conversation_sessions`.
2. **Immutable Workflow Versioning**: Active conversations reference an immutable `workflow_versions.id` row so live edits never corrupt in-flight customer sessions.
3. **Mandatory Row-Level Security (`FORCE ROW LEVEL SECURITY`)**: Every tenant-scoped table enforces `tenant_id = current_setting('app.current_tenant_id', true)::uuid`, activated per transaction via `SELECT set_config('app.current_tenant_id', $1, true)`.

---

## Complete SQL Migration Script

```sql
-- ============================================================================
-- 1. TENANTS (Root Corporate Accounts - Global Lookup Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
  rate_limit_mps INT NOT NULL DEFAULT 60,
  encrypted_secrets JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. WORKFLOW VERSIONS (Immutable Declarative JSONB FSM Graphs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_versions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_slug VARCHAR(100) NOT NULL,
  version_number INT NOT NULL,
  definition_schema JSONB NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, workflow_slug, version_number)
);

CREATE INDEX IF NOT EXISTS idx_workflow_versions_tenant_slug
  ON workflow_versions (tenant_id, workflow_slug, version_number DESC);

-- ============================================================================
-- 3. TENANT CHANNELS (WhatsApp phone_number_id / Instagram ig_account_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_channels (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_type VARCHAR(20) NOT NULL
    CHECK (channel_type IN ('WHATSAPP', 'INSTAGRAM')),
  external_account_id VARCHAR(64) NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  access_token_enc TEXT NOT NULL,
  coexistence_mode BOOLEAN NOT NULL DEFAULT FALSE,
  active_workflow_version_id UUID REFERENCES workflow_versions(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_channels_external_account
  ON tenant_channels (external_account_id)
  WHERE is_active = TRUE;

-- ============================================================================
-- 4. CONVERSATION SESSIONS (UUIDv7 + Minimal Indexes for HOT Updates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES tenant_channels(id) ON DELETE CASCADE,
  channel_type VARCHAR(20) NOT NULL
    CHECK (channel_type IN ('WHATSAPP', 'INSTAGRAM')),
  contact_external_id VARCHAR(64) NOT NULL,
  contact_push_name TEXT,
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  current_node_id VARCHAR(100) NOT NULL,
  context_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  retry_count INT NOT NULL DEFAULT 0,
  sequence_number BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'WAITING_INPUT', 'HUMAN_AGENT', 'COMPLETED', 'OPTED_OUT', 'EXPIRED')),
  window_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_session_lookup
  ON conversation_sessions (tenant_id, channel_type, contact_external_id)
  WHERE status IN ('ACTIVE', 'WAITING_INPUT', 'HUMAN_AGENT');

-- ============================================================================
-- 5. MESSAGES LOG (Range-Partitioned by created_at for High-Volume Audit)
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages_log (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  session_id UUID NOT NULL,
  external_message_id VARCHAR(128) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  interaction_type VARCHAR(30) NOT NULL,
  payload_logical_id TEXT,
  payload_raw JSONB NOT NULL,
  delivery_status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS messages_log_default
  PARTITION OF messages_log DEFAULT;

CREATE INDEX IF NOT EXISTS idx_messages_log_external_id
  ON messages_log (tenant_id, external_message_id);

-- ============================================================================
-- 6. OPT-IN / OPT-OUT REGULATORY AUDIT TRAILS (Meta Compliance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS opt_in_audit_trails (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_type VARCHAR(20) NOT NULL,
  contact_external_id VARCHAR(64) NOT NULL,
  consent_granted BOOLEAN NOT NULL,
  trigger_keyword VARCHAR(64),
  source_url TEXT,
  ip_address INET,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opt_in_audit_contact
  ON opt_in_audit_trails (tenant_id, channel_type, contact_external_id, recorded_at DESC);

-- ============================================================================
-- 7. MANDATORY ROW-LEVEL SECURITY (RLS) ISOLATION POLICIES
-- ============================================================================
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions FORCE ROW LEVEL SECURITY;

ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE messages_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_log FORCE ROW LEVEL SECURITY;

ALTER TABLE opt_in_audit_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE opt_in_audit_trails FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_workflow_versions ON workflow_versions
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_conversation_sessions ON conversation_sessions
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_messages_log ON messages_log
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_opt_in_audit ON opt_in_audit_trails
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
```

---

## Canonical Upstream Sources

- PostgreSQL 16 Documentation — Row Security Policies (`ENABLE` & `FORCE ROW LEVEL SECURITY`): `https://www.postgresql.org/docs/current/ddl-rowsecurity.html`
- PostgreSQL 16 Documentation — Table Partitioning (`PARTITION BY RANGE`): `https://www.postgresql.org/docs/current/ddl-partitioning.html`
- node-postgres (`pg`) Transaction Isolation: Context7 `/brianc/node-postgres` (`docs/pages/features/transactions.mdx`)
