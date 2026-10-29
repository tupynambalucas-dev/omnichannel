import type { CanonicalInboundEnvelope } from '@tupynambalucas-dev/omnichannel-core';
import type { Redis } from 'ioredis';
import type { Pool } from 'pg';
import type { EnvConfig } from '../config/envConfig.js';
import type { TenantController } from '../domains/tenants/tenant.controller.js';
import type { WebhookController } from '../domains/webhooks/webhook.controller.js';
import type { ArchiveRawWebhookFn } from '../domains/webhooks/webhook.service.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: EnvConfig;
    pgPool: Pool | null;
    redisState: Redis | null;
    queueConfigured: boolean;
    archiveRawWebhook: ArchiveRawWebhookFn | undefined;
    enqueueInboundEnvelope: (envelope: CanonicalInboundEnvelope) => Promise<void>;
    tenantController: TenantController;
    webhookController: WebhookController;
  }

  interface FastifyRequest {
    rawBody?: Buffer;
  }
}
