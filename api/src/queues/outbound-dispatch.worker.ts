import { OutboundDispatchJobSchema, QUEUE_NAMES } from '@tupynambalucas-dev/omnichannel-core';
import type { OutboundDispatchJob } from '@tupynambalucas-dev/omnichannel-core';
import { UnrecoverableError, Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import type { FastifyBaseLogger } from 'fastify';
import {
  MetaGraphDispatchError,
  type MetaGraphClient,
} from '../domains/compiler/meta-graph.client.js';
import { compileOutboundMessages } from '../domains/compiler/outbound.compiler.js';
import type { TenantRepository } from '../domains/tenants/tenant.repository.js';

const DEFAULT_RATE_LIMIT_PAUSE_MS = 5000;

export async function executeOutboundDispatch(options: {
  jobData: OutboundDispatchJob;
  tenantRepository: TenantRepository;
  metaGraphClient: MetaGraphClient;
  logger: FastifyBaseLogger;
}): Promise<void> {
  const { jobData, tenantRepository, metaGraphClient, logger } = options;
  const channelContext = await tenantRepository.resolveInboundChannelContext(
    jobData.channel,
    jobData.channelAccountId,
  );

  if (channelContext === null) {
    throw new UnrecoverableError(
      `No active channel registration found for ${jobData.channel}:${jobData.channelAccountId}`,
    );
  }

  const accessToken = metaGraphClient.resolveAccessToken(
    channelContext.channelRecord.accessTokenSecretRef,
  );

  const compiledRequests = compileOutboundMessages(
    jobData.channel,
    jobData.channelAccountId,
    jobData.recipientId,
    jobData.components,
    jobData.variables,
  );

  for (const request of compiledRequests) {
    const dispatchResult = await metaGraphClient.sendCompiledMessage(request, accessToken);
    logger.info(
      {
        channel: jobData.channel,
        recipientId: jobData.recipientId,
        providerMessageId: dispatchResult.providerMessageId,
      },
      'Dispatched compiled outbound message to Meta Graph API.',
    );
  }
}

export function createOutboundDispatchWorker(options: {
  connection: ConnectionOptions;
  tenantRepository: TenantRepository;
  metaGraphClient: MetaGraphClient;
  logger: FastifyBaseLogger;
}): Worker {
  const worker = new Worker(
    QUEUE_NAMES.OUTBOUND_DISPATCH,
    async (job) => {
      const parsedJob = OutboundDispatchJobSchema.parse(job.data);

      try {
        await executeOutboundDispatch({
          jobData: parsedJob,
          tenantRepository: options.tenantRepository,
          metaGraphClient: options.metaGraphClient,
          logger: options.logger,
        });
      } catch (error) {
        if (error instanceof MetaGraphDispatchError) {
          if (error.isRateLimitError) {
            await worker.rateLimit(error.retryAfterMs ?? DEFAULT_RATE_LIMIT_PAUSE_MS);
            throw Worker.RateLimitError();
          }

          if (error.isPermanentPolicyError) {
            options.logger.warn(
              {
                metaCode: error.metaCode,
                metaSubcode: error.metaSubcode,
                channel: parsedJob.channel,
                recipientId: parsedJob.recipientId,
              },
              'Permanent Meta policy or 24-hour messaging window error; aborting retries.',
            );
            throw new UnrecoverableError(error.message);
          }
        }
        throw error;
      }
    },
    {
      connection: options.connection,
      concurrency: 12,
      limiter: {
        max: 60,
        duration: 1000,
      },
    },
  );

  worker.on('failed', (job, error) => {
    options.logger.error({ jobId: job?.id, err: error }, 'Outbound dispatch worker job failed.');
  });

  return worker;
}
