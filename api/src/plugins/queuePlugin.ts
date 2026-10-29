import { QUEUE_NAMES } from '@tupynambalucas-dev/omnichannel-core';
import type {
  CanonicalInboundEnvelope,
  OutboundDispatchJob,
} from '@tupynambalucas-dev/omnichannel-core';
import { Queue } from 'bullmq';
import type { Worker } from 'bullmq';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { parseBullMqConnectionOptions } from '../config/redisConfig.js';
import type { MetaGraphClient } from '../domains/compiler/meta-graph.client.js';
import type { TenantRepository } from '../domains/tenants/tenant.repository.js';
import type { SessionStateRepository } from '../domains/workflow/session-state.repository.js';
import {
  WorkflowEngine,
  type DelayedTimerSchedulePayload,
} from '../domains/workflow/workflow.engine.js';
import {
  createDelayedTimersWorker,
  createInboundWebhookWorker,
} from '../queues/inbound-webhook.worker.js';
import {
  createOutboundDispatchWorker,
  executeOutboundDispatch,
} from '../queues/outbound-dispatch.worker.js';

export interface QueuePluginDependencies {
  tenantRepository: TenantRepository;
  sessionRepository: SessionStateRepository;
  metaGraphClient: MetaGraphClient;
}

const queuePlugin: FastifyPluginAsync<QueuePluginDependencies> = (
  server: FastifyInstance,
  deps: QueuePluginDependencies,
) => {
  const queueRedisUrl = server.config.REDIS_QUEUE_URL.trim();

  if (queueRedisUrl.length === 0) {
    server.log.warn(
      'REDIS_QUEUE_URL is not configured; executing inbound and outbound pipelines inline for local development.',
    );

    const inlineTimers = new Set<NodeJS.Timeout>();

    const enqueueOutbound = async (job: OutboundDispatchJob): Promise<void> => {
      await executeOutboundDispatch({
        jobData: job,
        tenantRepository: deps.tenantRepository,
        metaGraphClient: deps.metaGraphClient,
        logger: server.log,
      });
    };

    let workflowEngineRef: WorkflowEngine | null = null;

    const scheduleDelayedTimer = (payload: DelayedTimerSchedulePayload): Promise<void> => {
      const handle = setTimeout(() => {
        inlineTimers.delete(handle);
        if (workflowEngineRef !== null) {
          void workflowEngineRef
            .resumeDelayedSession({
              tenantId: payload.tenantId,
              conversationKey: payload.conversationKey,
              targetNodeId: payload.targetNodeId,
            })
            .catch((err: unknown) => {
              server.log.error({ err }, 'Inline delayed timer execution failed.');
            });
        }
      }, payload.delaySeconds * 1000);
      inlineTimers.add(handle);
      return Promise.resolve();
    };

    const workflowEngine = new WorkflowEngine({
      tenantRepository: deps.tenantRepository,
      sessionRepository: deps.sessionRepository,
      enqueueOutbound,
      scheduleDelayedTimer,
      logger: server.log,
    });
    workflowEngineRef = workflowEngine;

    server.decorate('enqueueInboundEnvelope', async (envelope: CanonicalInboundEnvelope) => {
      await workflowEngine.processInboundEnvelope(envelope);
    });
    server.decorate('queueConfigured', false);

    server.addHook('onClose', () => {
      for (const timer of inlineTimers) {
        clearTimeout(timer);
      }
      inlineTimers.clear();
    });

    return Promise.resolve();
  }

  const connection = parseBullMqConnectionOptions(queueRedisUrl);

  const inboundQueue = new Queue(QUEUE_NAMES.INBOUND_EVENTS, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
        jitter: 0.3,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });

  const outboundQueue = new Queue(QUEUE_NAMES.OUTBOUND_DISPATCH, {
    connection,
    defaultJobOptions: {
      attempts: 6,
      backoff: {
        type: 'exponential',
        delay: 1500,
        jitter: 0.4,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });

  const delayedTimersQueue = new Queue<DelayedTimerSchedulePayload>(QUEUE_NAMES.DELAYED_TIMERS, {
    connection,
    defaultJobOptions: {
      attempts: 4,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 2500 },
    },
  });

  const enqueueOutbound = async (job: OutboundDispatchJob): Promise<void> => {
    await outboundQueue.add('dispatch-message', job, {
      deduplication: {
        id: job.idempotencyKey,
        ttl: 60_000,
      },
    });
  };

  const scheduleDelayedTimer = async (payload: DelayedTimerSchedulePayload): Promise<void> => {
    await delayedTimersQueue.add('resume-delayed-session', payload, {
      delay: payload.delaySeconds * 1000,
      jobId: `timer:${payload.sessionId}:${payload.targetNodeId}`,
    });
  };

  const workflowEngine = new WorkflowEngine({
    tenantRepository: deps.tenantRepository,
    sessionRepository: deps.sessionRepository,
    enqueueOutbound,
    scheduleDelayedTimer,
    logger: server.log,
  });

  const workers: Worker[] = [
    createInboundWebhookWorker({
      connection,
      redisState: server.redisState,
      workflowEngine,
      logger: server.log,
    }),
    createOutboundDispatchWorker({
      connection,
      tenantRepository: deps.tenantRepository,
      metaGraphClient: deps.metaGraphClient,
      logger: server.log,
    }),
    createDelayedTimersWorker({
      connection,
      redisState: server.redisState,
      workflowEngine,
      logger: server.log,
    }),
  ];

  server.log.info('Initialized BullMQ cloud queues and workers.');

  server.decorate('enqueueInboundEnvelope', async (envelope: CanonicalInboundEnvelope) => {
    await inboundQueue.add('inbound-event', envelope, {
      deduplication: {
        id: `${envelope.channel}:${envelope.providerMessageId}`,
        ttl: 86_400_000,
      },
    });
  });
  server.decorate('queueConfigured', true);

  server.addHook('onClose', async () => {
    await Promise.all(workers.map((w) => w.close()));
    await Promise.all([inboundQueue.close(), outboundQueue.close(), delayedTimersQueue.close()]);
  });

  return Promise.resolve();
};

export default fp(queuePlugin, {
  name: 'omnichannel-queues',
  dependencies: ['omnichannel-postgres', 'omnichannel-redis'],
});
