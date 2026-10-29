import {
  ConversationSessionSchema,
  generateUuidV7,
  REDIS_TTL_SECONDS,
} from '@tupynambalucas-dev/omnichannel-core';
import type {
  ConversationSession,
  OmnichannelChannel,
  OptInAuditRecord,
  OptInSource,
} from '@tupynambalucas-dev/omnichannel-core';
import type { Redis } from 'ioredis';
import type { Pool } from 'pg';
import { withTenantContext } from '../../config/postgresConfig.js';

export class SessionStateRepository {
  private readonly redisState: Redis | null;
  private readonly pgPool: Pool | null;
  private readonly memorySessions = new Map<string, ConversationSession>();

  constructor(options: { redisState: Redis | null; pgPool: Pool | null }) {
    this.redisState = options.redisState;
    this.pgPool = options.pgPool;
  }

  private buildRedisKey(tenantId: string, conversationKey: string): string {
    return `session:${tenantId}:${conversationKey}`;
  }

  /**
   * Loads an active conversation session from low-latency State Redis, transparently
   * rehydrating from Cloud PostgreSQL on cache miss or TTL expiration.
   */
  public async getOrRehydrateSession(
    tenantId: string,
    conversationKey: string,
  ): Promise<ConversationSession | null> {
    const cacheKey = this.buildRedisKey(tenantId, conversationKey);

    if (this.redisState !== null) {
      const cachedJson = await this.redisState.get(cacheKey);
      if (cachedJson !== null) {
        try {
          return ConversationSessionSchema.parse(JSON.parse(cachedJson));
        } catch {
          // Proceed to PostgreSQL source-of-truth rehydration if cached payload is stale
        }
      }
    } else if (this.pgPool === null) {
      return this.memorySessions.get(cacheKey) ?? null;
    }

    if (this.pgPool === null) {
      return this.memorySessions.get(cacheKey) ?? null;
    }

    const rehydrated = await withTenantContext(this.pgPool, tenantId, async (client) => {
      const result = await client.query<{
        id: string;
        tenant_id: string;
        channel: OmnichannelChannel;
        channel_account_id: string;
        conversation_key: string;
        end_user_id: string;
        end_user_name: string | null;
        workflow_id: string;
        workflow_version: number;
        current_node_id: string;
        status: ConversationSession['status'];
        variables: Record<string, unknown>;
        invalid_attempts: number;
        last_interaction_at: Date;
        window_expires_at: Date;
        state_version: number;
      }>(
        `SELECT
           id, tenant_id, channel, channel_account_id, conversation_key,
           end_user_id, end_user_name, workflow_id, workflow_version,
           current_node_id, status, variables, invalid_attempts,
           last_interaction_at, window_expires_at, state_version
         FROM conversation_sessions
         WHERE tenant_id = $1 AND conversation_key = $2
         ORDER BY last_interaction_at DESC
         LIMIT 1`,
        [tenantId, conversationKey],
      );

      const row = result.rows.at(0);
      if (row === undefined) {
        return null;
      }

      const session: ConversationSession = {
        id: row.id,
        tenantId: row.tenant_id,
        channel: row.channel,
        channelAccountId: row.channel_account_id,
        conversationKey: row.conversation_key,
        endUserId: row.end_user_id,
        ...(row.end_user_name !== null ? { endUserName: row.end_user_name } : {}),
        workflowId: row.workflow_id,
        workflowVersion: row.workflow_version,
        currentNodeId: row.current_node_id,
        status: row.status,
        variables: row.variables,
        invalidAttempts: row.invalid_attempts,
        lastInteractionAt: row.last_interaction_at.toISOString(),
        windowExpiresAt: row.window_expires_at.toISOString(),
        stateVersion: row.state_version,
      };

      return session;
    });

    if (rehydrated !== null && this.redisState !== null) {
      await this.redisState.set(
        cacheKey,
        JSON.stringify(rehydrated),
        'EX',
        REDIS_TTL_SECONDS.ACTIVE_SESSION_CHECKPOINT,
      );
    }

    return rehydrated;
  }

  /**
   * Checkpoints FSM state to both Redis (sub-millisecond hot cache) and PostgreSQL (ACID durability).
   */
  public async saveCheckpoint(session: ConversationSession): Promise<ConversationSession> {
    const nextSession: ConversationSession = {
      ...session,
      stateVersion: session.stateVersion + 1,
    };

    const cacheKey = this.buildRedisKey(nextSession.tenantId, nextSession.conversationKey);

    if (this.redisState !== null) {
      await this.redisState.set(
        cacheKey,
        JSON.stringify(nextSession),
        'EX',
        REDIS_TTL_SECONDS.ACTIVE_SESSION_CHECKPOINT,
      );
    } else if (this.pgPool === null) {
      this.memorySessions.set(cacheKey, nextSession);
    }

    if (this.pgPool !== null) {
      await withTenantContext(this.pgPool, nextSession.tenantId, async (client) => {
        await client.query(
          `INSERT INTO conversation_sessions (
             id, tenant_id, channel, channel_account_id, conversation_key,
             end_user_id, end_user_name, workflow_id, workflow_version,
             current_node_id, status, variables, invalid_attempts,
             last_interaction_at, window_expires_at, state_version
           )
           VALUES (
             $1, $2, $3, $4, $5,
             $6, $7, $8, $9,
             $10, $11, $12::jsonb, $13,
             $14::timestamptz, $15::timestamptz, $16
           )
           ON CONFLICT (tenant_id, conversation_key) DO UPDATE SET
             workflow_id = EXCLUDED.workflow_id,
             workflow_version = EXCLUDED.workflow_version,
             current_node_id = EXCLUDED.current_node_id,
             status = EXCLUDED.status,
             variables = EXCLUDED.variables,
             invalid_attempts = EXCLUDED.invalid_attempts,
             last_interaction_at = EXCLUDED.last_interaction_at,
             window_expires_at = EXCLUDED.window_expires_at,
             state_version = EXCLUDED.state_version`,
          [
            nextSession.id,
            nextSession.tenantId,
            nextSession.channel,
            nextSession.channelAccountId,
            nextSession.conversationKey,
            nextSession.endUserId,
            nextSession.endUserName ?? null,
            nextSession.workflowId,
            nextSession.workflowVersion,
            nextSession.currentNodeId,
            nextSession.status,
            JSON.stringify(nextSession.variables),
            nextSession.invalidAttempts,
            nextSession.lastInteractionAt,
            nextSession.windowExpiresAt,
            nextSession.stateVersion,
          ],
        );
      });
    } else {
      this.memorySessions.set(cacheKey, nextSession);
    }

    return nextSession;
  }

  /**
   * Appends an immutable compliance record to `opt_in_audit_trail` for LGPD/GDPR/Meta policy proof.
   */
  public async recordOptInAudit(params: {
    tenantId: string;
    channel: OmnichannelChannel;
    endUserId: string;
    optedIn: boolean;
    source: OptInSource;
    evidenceMetadata?: Record<string, unknown>;
  }): Promise<OptInAuditRecord> {
    const auditRecord: OptInAuditRecord = {
      id: generateUuidV7(),
      tenantId: params.tenantId,
      channel: params.channel,
      endUserId: params.endUserId,
      optedIn: params.optedIn,
      source: params.source,
      evidenceMetadata: params.evidenceMetadata ?? {},
      recordedAt: new Date().toISOString(),
    };

    if (this.pgPool !== null) {
      await withTenantContext(this.pgPool, params.tenantId, async (client) => {
        await client.query(
          `INSERT INTO opt_in_audit_trail (
             id, tenant_id, channel, end_user_id, opted_in, source, evidence_metadata, recorded_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)`,
          [
            auditRecord.id,
            auditRecord.tenantId,
            auditRecord.channel,
            auditRecord.endUserId,
            auditRecord.optedIn,
            auditRecord.source,
            JSON.stringify(auditRecord.evidenceMetadata),
            auditRecord.recordedAt,
          ],
        );
      });
    }

    return auditRecord;
  }
}
