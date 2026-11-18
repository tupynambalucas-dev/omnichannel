-- ============================================================================
-- @tupynambalucas-dev/omnichannel - PostgreSQL 16+ Initial Schema & RLS
-- ============================================================================

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
