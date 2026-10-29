import { generateUuidV7, WorkflowDefinitionSchema } from '@tupynambalucas-dev/omnichannel-core';
import type {
  CreateTenantRequest,
  OmnichannelChannel,
  PublishWorkflowRequest,
  RegisterChannelRequest,
  TenantChannelRecord,
  TenantRecord,
  WorkflowDefinition,
  WorkflowVersionRecord,
} from '@tupynambalucas-dev/omnichannel-core';
import type { Pool } from 'pg';
import { withTenantContext } from '../../config/postgresConfig.js';
import { AppError } from '../../utils/AppError.js';

interface TenantChannelLookup {
  channelRecord: TenantChannelRecord;
  workflowRecord: WorkflowVersionRecord | null;
}

/**
 * Dual-mode Tenant & Workflow Repository:
 * - Production / Cloud mode: executes parameterized queries inside `withTenantContext` RLS transactions.
 * - Unconfigured local fallback: uses deterministic in-memory Maps when `DATABASE_URL` is omitted.
 */
export class TenantRepository {
  private readonly pool: Pool | null;
  private readonly memoryTenants = new Map<string, TenantRecord>();
  private readonly memoryChannels = new Map<string, TenantChannelRecord>();
  private readonly memoryWorkflows = new Map<string, WorkflowVersionRecord>();

  constructor(pool: Pool | null) {
    this.pool = pool;
  }

  public async createTenant(input: CreateTenantRequest): Promise<TenantRecord> {
    const id = generateUuidV7();
    const createdAt = new Date().toISOString();

    if (this.pool === null) {
      for (const existing of this.memoryTenants.values()) {
        if (existing.slug === input.slug) {
          throw new AppError('TENANT_SLUG_CONFLICT', 409, `Tenant "${input.slug}" already exists.`);
        }
      }
      const record: TenantRecord = {
        id,
        slug: input.slug,
        displayName: input.displayName,
        timezone: input.timezone,
        status: 'ACTIVE',
        createdAt,
      };
      this.memoryTenants.set(id, record);
      return record;
    }

    const result = await this.pool.query<{
      id: string;
      slug: string;
      display_name: string;
      timezone: string;
      status: 'ACTIVE' | 'SUSPENDED';
      created_at: Date;
    }>(
      `INSERT INTO tenants (id, slug, display_name, timezone, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING id, slug, display_name, timezone, status, created_at`,
      [id, input.slug, input.displayName, input.timezone],
    );

    const row = result.rows.at(0);
    if (row === undefined) {
      throw new AppError('TENANT_CREATION_FAILED', 500);
    }

    return {
      id: row.id,
      slug: row.slug,
      displayName: row.display_name,
      timezone: row.timezone,
      status: row.status,
      createdAt: row.created_at.toISOString(),
    };
  }

  public async listTenants(): Promise<TenantRecord[]> {
    if (this.pool === null) {
      return Array.from(this.memoryTenants.values());
    }

    const result = await this.pool.query<{
      id: string;
      slug: string;
      display_name: string;
      timezone: string;
      status: 'ACTIVE' | 'SUSPENDED';
      created_at: Date;
    }>(
      `SELECT id, slug, display_name, timezone, status, created_at
       FROM tenants
       ORDER BY created_at DESC`,
    );

    return result.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      displayName: row.display_name,
      timezone: row.timezone,
      status: row.status,
      createdAt: row.created_at.toISOString(),
    }));
  }

  public async registerChannel(
    tenantId: string,
    input: RegisterChannelRequest,
  ): Promise<TenantChannelRecord> {
    const id = generateUuidV7();
    const createdAt = new Date().toISOString();

    if (this.pool === null) {
      if (!this.memoryTenants.has(tenantId)) {
        throw new AppError('TENANT_NOT_FOUND', 404, `Tenant "${tenantId}" was not found.`);
      }
      const key = `${input.channel}:${input.channelAccountId}`;
      const record: TenantChannelRecord = {
        id,
        tenantId,
        channel: input.channel,
        channelAccountId: input.channelAccountId,
        displayHandle: input.displayHandle,
        accessTokenSecretRef: input.accessTokenSecretRef,
        activeWorkflowId: input.activeWorkflowId ?? null,
        isActive: true,
        createdAt,
      };
      this.memoryChannels.set(key, record);
      return record;
    }

    return withTenantContext(this.pool, tenantId, async (client) => {
      const result = await client.query<{
        id: string;
        tenant_id: string;
        channel: OmnichannelChannel;
        channel_account_id: string;
        display_handle: string;
        access_token_secret_ref: string;
        active_workflow_id: string | null;
        is_active: boolean;
        created_at: Date;
      }>(
        `INSERT INTO tenant_channels (
           id, tenant_id, channel, channel_account_id, display_handle, access_token_secret_ref, active_workflow_id, is_active
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (channel, channel_account_id) DO UPDATE SET
           display_handle = EXCLUDED.display_handle,
           access_token_secret_ref = EXCLUDED.access_token_secret_ref,
           active_workflow_id = COALESCE(EXCLUDED.active_workflow_id, tenant_channels.active_workflow_id),
           is_active = true
         RETURNING id, tenant_id, channel, channel_account_id, display_handle, access_token_secret_ref, active_workflow_id, is_active, created_at`,
        [
          id,
          tenantId,
          input.channel,
          input.channelAccountId,
          input.displayHandle,
          input.accessTokenSecretRef,
          input.activeWorkflowId ?? null,
        ],
      );

      const row = result.rows.at(0);
      if (row === undefined) {
        throw new AppError('CHANNEL_REGISTRATION_FAILED', 500);
      }

      return {
        id: row.id,
        tenantId: row.tenant_id,
        channel: row.channel,
        channelAccountId: row.channel_account_id,
        displayHandle: row.display_handle,
        accessTokenSecretRef: row.access_token_secret_ref,
        activeWorkflowId: row.active_workflow_id,
        isActive: row.is_active,
        createdAt: row.created_at.toISOString(),
      };
    });
  }

  public async publishWorkflow(
    tenantId: string,
    input: PublishWorkflowRequest,
  ): Promise<WorkflowVersionRecord> {
    const id = generateUuidV7();
    const publishedAt = new Date().toISOString();
    const parsedDefinition: WorkflowDefinition = WorkflowDefinitionSchema.parse(input.definition);

    if (this.pool === null) {
      if (!this.memoryTenants.has(tenantId)) {
        throw new AppError('TENANT_NOT_FOUND', 404, `Tenant "${tenantId}" was not found.`);
      }
      const record: WorkflowVersionRecord = {
        id,
        tenantId,
        workflowKey: parsedDefinition.workflowKey,
        version: parsedDefinition.version,
        name: parsedDefinition.name,
        definition: parsedDefinition,
        publishedAt,
      };
      this.memoryWorkflows.set(id, record);

      for (const accountId of input.activateForChannelAccountIds) {
        for (const [key, channelRecord] of this.memoryChannels.entries()) {
          if (channelRecord.tenantId === tenantId && channelRecord.channelAccountId === accountId) {
            this.memoryChannels.set(key, {
              ...channelRecord,
              activeWorkflowId: id,
            });
          }
        }
      }

      return record;
    }

    return withTenantContext(this.pool, tenantId, async (client) => {
      const insertResult = await client.query<{
        id: string;
        tenant_id: string;
        workflow_key: string;
        version: number;
        name: string;
        definition: unknown;
        published_at: Date;
      }>(
        `INSERT INTO workflow_definitions (id, tenant_id, workflow_key, version, name, definition)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         RETURNING id, tenant_id, workflow_key, version, name, definition, published_at`,
        [
          id,
          tenantId,
          parsedDefinition.workflowKey,
          parsedDefinition.version,
          parsedDefinition.name,
          JSON.stringify(parsedDefinition),
        ],
      );

      const row = insertResult.rows.at(0);
      if (row === undefined) {
        throw new AppError('WORKFLOW_PUBLISH_FAILED', 500);
      }

      if (input.activateForChannelAccountIds.length > 0) {
        await client.query(
          `UPDATE tenant_channels
           SET active_workflow_id = $1
           WHERE tenant_id = $2 AND channel_account_id = ANY($3::text[])`,
          [row.id, tenantId, input.activateForChannelAccountIds],
        );
      }

      return {
        id: row.id,
        tenantId: row.tenant_id,
        workflowKey: row.workflow_key,
        version: row.version,
        name: row.name,
        definition: WorkflowDefinitionSchema.parse(row.definition),
        publishedAt: row.published_at.toISOString(),
      };
    });
  }

  public async getWorkflowById(
    tenantId: string,
    workflowId: string,
  ): Promise<WorkflowVersionRecord | null> {
    if (this.pool === null) {
      const found = this.memoryWorkflows.get(workflowId);
      if (found?.tenantId !== tenantId) {
        return null;
      }
      return found;
    }

    return withTenantContext(this.pool, tenantId, async (client) => {
      const result = await client.query<{
        id: string;
        tenant_id: string;
        workflow_key: string;
        version: number;
        name: string;
        definition: unknown;
        published_at: Date;
      }>(
        `SELECT id, tenant_id, workflow_key, version, name, definition, published_at
         FROM workflow_definitions
         WHERE id = $1 AND tenant_id = $2`,
        [workflowId, tenantId],
      );

      const row = result.rows.at(0);
      if (row === undefined) {
        return null;
      }

      return {
        id: row.id,
        tenantId: row.tenant_id,
        workflowKey: row.workflow_key,
        version: row.version,
        name: row.name,
        definition: WorkflowDefinitionSchema.parse(row.definition),
        publishedAt: row.published_at.toISOString(),
      };
    });
  }

  /**
   * Resolves a channel registration and its active workflow from an inbound Meta webhook account ID.
   */
  public async resolveInboundChannelContext(
    channel: OmnichannelChannel,
    channelAccountId: string,
  ): Promise<TenantChannelLookup | null> {
    if (this.pool === null) {
      const channelRecord = this.memoryChannels.get(`${channel}:${channelAccountId}`);
      if (channelRecord?.isActive !== true) {
        return null;
      }
      const workflowRecord =
        channelRecord.activeWorkflowId !== null
          ? (this.memoryWorkflows.get(channelRecord.activeWorkflowId) ?? null)
          : null;
      return { channelRecord, workflowRecord };
    }

    // Channel routing lookup runs on the system pool to discover tenant_id before entering RLS scope.
    const channelQuery = await this.pool.query<{
      id: string;
      tenant_id: string;
      channel: OmnichannelChannel;
      channel_account_id: string;
      display_handle: string;
      access_token_secret_ref: string;
      active_workflow_id: string | null;
      is_active: boolean;
      created_at: Date;
    }>(
      `SELECT id, tenant_id, channel, channel_account_id, display_handle, access_token_secret_ref, active_workflow_id, is_active, created_at
       FROM tenant_channels
       WHERE channel = $1 AND channel_account_id = $2 AND is_active = true
       LIMIT 1`,
      [channel, channelAccountId],
    );

    const row = channelQuery.rows.at(0);
    if (row === undefined) {
      return null;
    }

    const channelRecord: TenantChannelRecord = {
      id: row.id,
      tenantId: row.tenant_id,
      channel: row.channel,
      channelAccountId: row.channel_account_id,
      displayHandle: row.display_handle,
      accessTokenSecretRef: row.access_token_secret_ref,
      activeWorkflowId: row.active_workflow_id,
      isActive: row.is_active,
      createdAt: row.created_at.toISOString(),
    };

    const workflowRecord =
      channelRecord.activeWorkflowId !== null
        ? await this.getWorkflowById(channelRecord.tenantId, channelRecord.activeWorkflowId)
        : null;

    return { channelRecord, workflowRecord };
  }
}
