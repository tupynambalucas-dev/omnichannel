import { generateUuidV7 } from '@tupynambalucas-dev/omnichannel-core';
import type {
  CanonicalInboundEnvelope,
  DeliveryStatusEvent,
  InboundInteractiveReply,
  InboundMediaAttachment,
  InboundReferral,
  InteractionType,
  MetaWebhookPayload,
} from '@tupynambalucas-dev/omnichannel-core';
import type { NormalizedWebhookBatch } from './whatsapp.adapter.js';

function parseMillisToIso(timestampMillis: unknown): string {
  if (typeof timestampMillis === 'number' && Number.isFinite(timestampMillis)) {
    // Instagram timestamps are typically Unix milliseconds; handle seconds defensively if < 1e11
    const millis = timestampMillis < 100_000_000_000 ? timestampMillis * 1000 : timestampMillis;
    return new Date(millis).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Normalizes an Instagram Messaging API (`object === "instagram"`) webhook payload:
 * - Filters out `message.is_echo === true` to prevent outbound self-reply infinite loops.
 * - Separates `read` / `delivery` receipts into `DeliveryStatusEvent[]`.
 * - Normalizes `quick_reply.payload`, `postback.payload`, `text`, `attachments`, and `referral`.
 */
export function normalizeInstagramWebhookPayload(
  payload: MetaWebhookPayload,
): NormalizedWebhookBatch {
  const inboundMessages: CanonicalInboundEnvelope[] = [];
  const statusEvents: DeliveryStatusEvent[] = [];

  for (const entry of payload.entry) {
    const igBusinessAccountId = entry.id;
    const messagingEvents = entry.messaging ?? [];

    for (const rawEvent of messagingEvents) {
      const sender = rawEvent.sender as Record<string, unknown> | undefined;
      const recipient = rawEvent.recipient as Record<string, unknown> | undefined;
      const senderId = typeof sender?.id === 'string' ? sender.id : undefined;
      const recipientId = typeof recipient?.id === 'string' ? recipient.id : igBusinessAccountId;
      const timestampIso = parseMillisToIso(rawEvent.timestamp);

      // 1. Read receipt event
      if (
        rawEvent.read !== undefined &&
        typeof rawEvent.read === 'object' &&
        senderId !== undefined
      ) {
        const readObj = rawEvent.read as Record<string, unknown>;
        const watermarkToken =
          typeof readObj.watermark === 'number' || typeof readObj.watermark === 'string'
            ? String(readObj.watermark)
            : String(Date.now());
        const mid = typeof readObj.mid === 'string' ? readObj.mid : `watermark:${watermarkToken}`;
        statusEvents.push({
          eventId: generateUuidV7(),
          channel: 'instagram',
          channelAccountId: igBusinessAccountId,
          providerMessageId: mid,
          recipientId: senderId,
          status: 'read',
          timestampIso,
        });
        continue;
      }

      if (senderId === undefined) {
        continue;
      }

      // 2. Postback button click (`event.postback`)
      if (rawEvent.postback !== undefined && typeof rawEvent.postback === 'object') {
        const postback = rawEvent.postback as Record<string, unknown>;
        const tsToken =
          typeof rawEvent.timestamp === 'number' || typeof rawEvent.timestamp === 'string'
            ? String(rawEvent.timestamp)
            : String(Date.now());
        const mid =
          typeof postback.mid === 'string' ? postback.mid : `ig-postback:${senderId}:${tsToken}`;
        const postbackPayload = typeof postback.payload === 'string' ? postback.payload : undefined;
        const postbackTitle =
          typeof postback.title === 'string' ? postback.title : (postbackPayload ?? 'Postback');

        if (postbackPayload !== undefined) {
          inboundMessages.push({
            envelopeId: generateUuidV7(),
            channel: 'instagram',
            channelAccountId: recipientId,
            providerMessageId: mid,
            conversationKey: `ig:${recipientId}:${senderId}`,
            endUserId: senderId,
            timestampIso,
            interactionType: 'interactive_reply',
            interactiveReply: {
              sourceType: 'postback',
              payloadId: postbackPayload,
              title: postbackTitle,
            },
          });
        }
        continue;
      }

      // 3. Direct Message (`event.message`)
      if (rawEvent.message !== undefined && typeof rawEvent.message === 'object') {
        const message = rawEvent.message as Record<string, unknown>;

        // Strictly discard outbound echo messages emitted by the business account itself
        if (message.is_echo === true || message.is_deleted === true) {
          continue;
        }

        const mid = typeof message.mid === 'string' ? message.mid : undefined;
        if (mid === undefined) {
          continue;
        }

        let interactionType: InteractionType = 'unsupported';
        let textBody: string | undefined;
        let interactiveReply: InboundInteractiveReply | undefined;
        let media: InboundMediaAttachment | undefined;
        let referral: InboundReferral | undefined;

        if (rawEvent.referral !== undefined && typeof rawEvent.referral === 'object') {
          const refObj = rawEvent.referral as Record<string, unknown>;
          referral = {
            sourceType: typeof refObj.source === 'string' ? refObj.source : 'ig_referral',
            ...(typeof refObj.ref === 'string' ? { refParameter: refObj.ref } : {}),
          };
        }

        if (
          message.quick_reply !== undefined &&
          typeof message.quick_reply === 'object' &&
          message.quick_reply !== null
        ) {
          const qr = message.quick_reply as Record<string, unknown>;
          const qrPayload = typeof qr.payload === 'string' ? qr.payload : undefined;
          const qrTitle = typeof message.text === 'string' ? message.text : (qrPayload ?? 'Reply');
          if (qrPayload !== undefined) {
            interactionType = 'interactive_reply';
            interactiveReply = {
              sourceType: 'quick_reply',
              payloadId: qrPayload,
              title: qrTitle,
            };
            if (typeof message.text === 'string') {
              textBody = message.text;
            }
          }
        } else if (typeof message.text === 'string' && message.text.length > 0) {
          interactionType = 'text';
          textBody = message.text;
        } else if (Array.isArray(message.attachments) && message.attachments.length > 0) {
          const firstAttachment = message.attachments[0] as Record<string, unknown>;
          const attType = firstAttachment.type;
          const attPayload = firstAttachment.payload as Record<string, unknown> | undefined;
          const attUrl = typeof attPayload?.url === 'string' ? attPayload.url : undefined;

          if (
            attType === 'image' ||
            attType === 'video' ||
            attType === 'audio' ||
            attType === 'story_mention'
          ) {
            interactionType = 'media';
            media = {
              mediaType: attType,
              ...(attUrl !== undefined ? { url: attUrl } : {}),
            };
          }
        }

        inboundMessages.push({
          envelopeId: generateUuidV7(),
          channel: 'instagram',
          channelAccountId: recipientId,
          providerMessageId: mid,
          conversationKey: `ig:${recipientId}:${senderId}`,
          endUserId: senderId,
          timestampIso,
          interactionType,
          ...(textBody !== undefined ? { text: textBody } : {}),
          ...(interactiveReply !== undefined ? { interactiveReply } : {}),
          ...(media !== undefined ? { media } : {}),
          ...(referral !== undefined ? { referral } : {}),
        });
      }
    }
  }

  return { inboundMessages, statusEvents };
}
