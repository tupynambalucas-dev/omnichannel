import {
  CanonicalInboundEnvelopeSchema,
  generateUuidV7,
  QUEUE_NAMES,
  REDIS_TTL_SECONDS,
} from '@tupynambalucas-dev/omnichannel-core';
import { DelayedError, Worker } from 'bullmq';
import type { ConnectionOptions, Job } from 'bullmq';
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';
import type {
  DelayedTimerSchedulePayload,
  WorkflowEngine,
} from '../domains/workflow/workflow.engine.js';

const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

const CONTENDED_LOCK_REQUEUE_MS = 250;

async function withConversationMutex<T>(
  redisState: Redis | null,
  conversationKey: string,
  job: Job,
  token: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  if (redisState === null) {
    return fn();
  }

  const lockKey = `lock:conv:${conversationKey}`;
  const lockOwnerToken = generateUuidV7();
  const acquired = await redisState.set(
    lockKey,
    lockOwnerToken,
    'EX',
    REDIS_TTL_SECONDS.CONVERSATION_MUTEX_LOCK,
    'NX',
  );

  if (acquired !== 'OK') {
    // Another worker is currently mutating this user's FSM session; reschedule 250ms ahead to preserve FIFO order.
    if (token !== undefined) {
      await job.moveToDelayed(Date.now() + CONTENDED_LOCK_REQUEUE_MS, token);
      throw new DelayedError();
    }
    throw new Error(`Conversation mutex contended for "${conversationKey}"`);
  }

  try {
    return await fn();
  } finally {
    await redisState.eval(RELEASE_LOCK_LUA, 1, lockKey, lockOwnerToken);
  }
}

export function createInboundWebhookWorker(options: {
  connection: ConnectionOptions;
  redisState: Redis | null;
  workflowEngine: WorkflowEngine;
  logger: FastifyBaseLogger;
}): Worker {
  const worker = new Worker(
    QUEUE_NAMES.INBOUND_EVENTS,
    async (job, token) => {
      const envelope = CanonicalInboundEnvelopeSchema.parse(job.data);
      await withConversationMutex(
        options.redisState,
        envelope.conversationKey,
        job,
        token,
        async () => {
          await options.workflowEngine.processInboundEnvelope(envelope);
        },
      );
    },
    {
      connection: options.connection,
      concurrency: 16,
    },
  );

  worker.on('failed', (job, error) => {
    options.logger.error({ jobId: job?.id, err: error }, 'Inbound webhook worker job failed.');
  });

  return worker;
}

export function createDelayedTimersWorker(options: {
  connection: ConnectionOptions;
  redisState: Redis | null;
  workflowEngine: WorkflowEngine;
  logger: FastifyBaseLogger;
}): Worker<DelayedTimerSchedulePayload> {
  const worker = new Worker<DelayedTimerSchedulePayload>(
    QUEUE_NAMES.DELAYED_TIMERS,
    async (job, token) => {
      const payload = job.data;
      await withConversationMutex(
        options.redisState,
        payload.conversationKey,
        job,
        token,
        async () => {
          await options.workflowEngine.resumeDelayedSession({
            tenantId: payload.tenantId,
            conversationKey: payload.conversationKey,
            targetNodeId: payload.targetNodeId,
          });
        },
      );
    },
    {
      connection: options.connection,
      concurrency: 8,
    },
  );

  worker.on('failed', (job, error) => {
    options.logger.error({ jobId: job?.id, err: error }, 'Delayed timer worker job failed.');
  });

  return worker;
}
