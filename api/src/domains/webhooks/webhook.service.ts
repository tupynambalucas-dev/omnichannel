import { REDIS_TTL_SECONDS } from '@tupynambalucas-dev/omnichannel-core';
import type {
  CanonicalInboundEnvelope,
  MetaWebhookPayload,
  OmnichannelChannel,
} from '@tupynambalucas-dev/omnichannel-core';
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';
import { normalizeInstagramWebhookPayload } from './adapters/instagram.adapter.js';
import { normalizeWhatsAppWebhookPayload } from './adapters/whatsapp.adapter.js';

export type EnqueueInboundEnvelopeFn = (envelope: CanonicalInboundEnvelope) => Promise<void>;
export type ArchiveRawWebhookFn = (
  objectType: string,
  payload: Record<string, unknown>,
) => Promise<void>;

export interface WebhookIngestionSummary {
  acceptedMessages: number;
  deduplicatedDrops: number;
  statusUpdatesObserved: number;
}

export class WebhookService {
  private readonly redisState: Redis | null;
  private readonly enqueueInbound: EnqueueInboundEnvelopeFn;
  private readonly archiveRawWebhook?: ArchiveRawWebhookFn;
  private readonly logger: FastifyBaseLogger;
  private readonly memoryDedupCache = new Map<string, number>();

  constructor(options: {
    redisState: Redis | null;
    enqueueInbound: EnqueueInboundEnvelopeFn;
    archiveRawWebhook?: ArchiveRawWebhookFn;
    logger: FastifyBaseLogger;
  }) {
    this.redisState = options.redisState;
    this.enqueueInbound = options.enqueueInbound;
    this.archiveRawWebhook = options.archiveRawWebhook;
    this.logger = options.logger;
  }

  /**
   * Atomically claims a provider message ID for 24 hours (`SET dedup:msg:{channel}:{id} 1 EX 86400 NX`)
   * to guarantee idempotent processing during Meta at-least-once webhook retries.
   */
  private async claimIdempotencySlot(
    channel: OmnichannelChannel,
    providerMessageId: string,
  ): Promise<boolean> {
    const dedupKey = `dedup:msg:${channel}:${providerMessageId}`;

    if (this.redisState !== null) {
      const response = await this.redisState.set(
        dedupKey,
        '1',
        'EX',
        REDIS_TTL_SECONDS.WEBHOOK_DEDUPLICATION,
        'NX',
      );
      return response === 'OK';
    }

    const now = Date.now();
    const existingExpiry = this.memoryDedupCache.get(dedupKey);
    if (existingExpiry !== undefined && existingExpiry > now) {
      return false;
    }

    this.memoryDedupCache.set(dedupKey, now + REDIS_TTL_SECONDS.WEBHOOK_DEDUPLICATION * 1000);
    return true;
  }

  public async ingestMetaWebhook(payload: MetaWebhookPayload): Promise<WebhookIngestionSummary> {
    if (this.archiveRawWebhook !== undefined) {
      void this.archiveRawWebhook(
        payload.object,
        payload as unknown as Record<string, unknown>,
      ).catch((err: unknown) => {
        this.logger.warn({ err }, 'Optional raw webhook archive write failed; continuing.');
      });
    }

    const normalized =
      payload.object === 'whatsapp_business_account'
        ? normalizeWhatsAppWebhookPayload(payload)
        : normalizeInstagramWebhookPayload(payload);

    let acceptedMessages = 0;
    let deduplicatedDrops = 0;

    for (const envelope of normalized.inboundMessages) {
      const isFresh = await this.claimIdempotencySlot(envelope.channel, envelope.providerMessageId);

      if (!isFresh) {
        deduplicatedDrops += 1;
        continue;
      }

      await this.enqueueInbound(envelope);
      acceptedMessages += 1;
    }

    for (const statusEvent of normalized.statusEvents) {
      if (statusEvent.status === 'failed') {
        this.logger.warn(
          {
            channel: statusEvent.channel,
            providerMessageId: statusEvent.providerMessageId,
            errorCode: statusEvent.errorCode,
            errorTitle: statusEvent.errorTitle,
          },
          'Asynchronous outbound message delivery failure reported by Meta.',
        );
      }
    }

    return {
      acceptedMessages,
      deduplicatedDrops,
      statusUpdatesObserved: normalized.statusEvents.length,
    };
  }
}
