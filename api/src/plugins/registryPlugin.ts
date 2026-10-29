import fastifyCors from '@fastify/cors';
import fastifyEnv from '@fastify/env';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fastifyMetrics from 'fastify-metrics';
import fp from 'fastify-plugin';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { envSchema } from '../config/envConfig.js';
import { MetaGraphClient } from '../domains/compiler/meta-graph.client.js';
import { TenantController } from '../domains/tenants/tenant.controller.js';
import { TenantRepository } from '../domains/tenants/tenant.repository.js';
import { tenantRoutes } from '../domains/tenants/tenant.routes.js';
import { TenantService } from '../domains/tenants/tenant.service.js';
import { WebhookController } from '../domains/webhooks/webhook.controller.js';
import { webhookRoutes } from '../domains/webhooks/webhook.routes.js';
import { WebhookService } from '../domains/webhooks/webhook.service.js';
import { SessionStateRepository } from '../domains/workflow/session-state.repository.js';
import errorHandlerPlugin from './errorHandlerPlugin.js';
import mongoArchivePlugin from './mongoArchivePlugin.js';
import postgresPlugin from './postgresPlugin.js';
import queuePlugin from './queuePlugin.js';
import redisPlugin from './redisPlugin.js';
import sentryPlugin from './sentryPlugin.js';

const registryPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  await server.register(fastifyEnv, {
    confKey: 'config',
    schema: envSchema,
    dotenv: false,
  });

  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  await server.register(errorHandlerPlugin);
  await server.register(sentryPlugin);

  await server.register(fastifyHelmet, {
    global: true,
    contentSecurityPolicy: false,
  });

  const allowedOrigins = server.config.CORS_ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  await server.register(fastifyCors, {
    origin: allowedOrigins,
    credentials: true,
  });

  await server.register(fastifyRateLimit, {
    max: 600,
    timeWindow: '1 minute',
  });

  await server.register(fastifyMetrics.default, {
    endpoint: '/metrics',
  });

  await server.register(postgresPlugin);
  await server.register(redisPlugin);
  await server.register(mongoArchivePlugin);

  const tenantRepository = new TenantRepository(server.pgPool);
  const sessionRepository = new SessionStateRepository({
    redisState: server.redisState,
    pgPool: server.pgPool,
  });
  const metaGraphClient = new MetaGraphClient({
    baseUrl: server.config.META_GRAPH_BASE_URL,
    apiVersion: server.config.META_GRAPH_API_VERSION,
  });

  await server.register(queuePlugin, {
    tenantRepository,
    sessionRepository,
    metaGraphClient,
  });

  const tenantService = new TenantService(tenantRepository);
  const tenantController = new TenantController(tenantService);

  const webhookService = new WebhookService({
    redisState: server.redisState,
    enqueueInbound: server.enqueueInboundEnvelope,
    archiveRawWebhook: server.archiveRawWebhook,
    logger: server.log,
  });

  const webhookController = new WebhookController({
    service: webhookService,
    verifyToken: server.config.META_WEBHOOK_VERIFY_TOKEN,
    appSecret: server.config.META_APP_SECRET,
  });

  server.decorate('tenantController', tenantController);
  server.decorate('webhookController', webhookController);

  server.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: '@tupynambalucas-dev/omnichannel-api',
      environment: server.config.NODE_ENV,
      datastores: {
        postgresql: server.pgPool !== null ? 'connected' : 'memory-fallback',
        redisState: server.redisState !== null ? 'connected' : 'memory-fallback',
        redisQueue: server.queueConfigured ? 'connected' : 'inline-fallback',
        mongoArchive: server.archiveRawWebhook !== undefined ? 'enabled' : 'disabled',
      },
      timestamp: new Date().toISOString(),
    });
  });

  await server.register(webhookRoutes, { prefix: '/webhooks' });
  await server.register(tenantRoutes, { prefix: '/api/v1/tenants' });
};

export default fp(registryPlugin, { name: 'omnichannel-registry' });
