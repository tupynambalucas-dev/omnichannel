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

export interface NormalizedWebhookBatch {
  inboundMessages: CanonicalInboundEnvelope[];
  statusEvents: DeliveryStatusEvent[];
}

function parseUnixTimestampToIso(unixString: unknown): string {
  if (typeof unixString === 'string' || typeof unixString === 'number') {
    const numeric = Number(unixString);
    if (Number.isFinite(numeric) && numeric > 0) {
      return new Date(numeric * 1000).toISOString();
    }
  }
  return new Date().toISOString();
}

/**
 * Normalizes a WhatsApp Cloud API (`object === "whatsapp_business_account"`) webhook payload
 * into canonical inbound message envelopes and separated delivery/read status events.
 */
export function normalizeWhatsAppWebhookPayload(
  payload: MetaWebhookPayload,
): NormalizedWebhookBatch {
  const inboundMessages: CanonicalInboundEnvelope[] = [];
  const statusEvents: DeliveryStatusEvent[] = [];

  for (const entry of payload.entry) {
    const changes = entry.changes ?? [];
    for (const change of changes) {
      const value = change.value as Record<string, unknown> | undefined;
      if (value === undefined || typeof value !== 'object') {
        continue;
      }

      const metadata = value.metadata as Record<string, unknown> | undefined;
      const phoneNumberId =
        typeof metadata?.phone_number_id === 'string' ? metadata.phone_number_id : entry.id;

      // Build map of wa_id -> profile.name from contacts[]
      const contactNames = new Map<string, string>();
      if (Array.isArray(value.contacts)) {
        for (const rawContact of value.contacts) {
          const contact = rawContact as Record<string, unknown>;
          const waId = typeof contact.wa_id === 'string' ? contact.wa_id : undefined;
          const profile = contact.profile as Record<string, unknown> | undefined;
          const profileName = typeof profile?.name === 'string' ? profile.name : undefined;
          if (waId !== undefined && profileName !== undefined) {
            contactNames.set(waId, profileName);
          }
        }
      }

      // 1. Separate outbound delivery/read statuses (`sent`, `delivered`, `read`, `failed`)
      if (Array.isArray(value.statuses)) {
        for (const rawStatus of value.statuses) {
          const statusObj = rawStatus as Record<string, unknown>;
          const statusValue = statusObj.status;
          const providerMessageId = statusObj.id;
          const recipientId = statusObj.recipient_id;

          if (
            typeof providerMessageId === 'string' &&
            typeof recipientId === 'string' &&
            (statusValue === 'sent' ||
              statusValue === 'delivered' ||
              statusValue === 'read' ||
              statusValue === 'failed')
          ) {
            let errorCode: number | undefined;
            let errorTitle: string | undefined;

            if (Array.isArray(statusObj.errors) && statusObj.errors.length > 0) {
              const firstErr = statusObj.errors[0] as Record<string, unknown>;
              if (typeof firstErr.code === 'number') {
                errorCode = firstErr.code;
              }
              if (typeof firstErr.title === 'string') {
                errorTitle = firstErr.title;
              }
            }

            statusEvents.push({
              eventId: generateUuidV7(),
              channel: 'whatsapp',
              channelAccountId: phoneNumberId,
              providerMessageId,
              recipientId,
              status: statusValue,
              timestampIso: parseUnixTimestampToIso(statusObj.timestamp),
              ...(errorCode !== undefined ? { errorCode } : {}),
              ...(errorTitle !== undefined ? { errorTitle } : {}),
            });
          }
        }
      }

      // 2. Normalize inbound user messages (`messages[]`)
      if (Array.isArray(value.messages)) {
        for (const rawMsg of value.messages) {
          const msg = rawMsg as Record<string, unknown>;
          const providerMessageId = typeof msg.id === 'string' ? msg.id : undefined;
          const fromWaId = typeof msg.from === 'string' ? msg.from : undefined;
          const msgType = typeof msg.type === 'string' ? msg.type : 'unsupported';

          if (providerMessageId === undefined || fromWaId === undefined) {
            continue;
          }

          let interactionType: InteractionType = 'unsupported';
          let textBody: string | undefined;
          let interactiveReply: InboundInteractiveReply | undefined;
          let media: InboundMediaAttachment | undefined;
          let referral: InboundReferral | undefined;

          if (msg.referral !== undefined && typeof msg.referral === 'object') {
            const refObj = msg.referral as Record<string, unknown>;
            referral = {
              sourceType:
                typeof refObj.source_type === 'string' ? refObj.source_type : 'whatsapp_ad',
              ...(typeof refObj.source_id === 'string' ? { sourceId: refObj.source_id } : {}),
              ...(typeof refObj.source_url === 'string' ? { sourceUrl: refObj.source_url } : {}),
              ...(typeof refObj.headline === 'string' ? { headline: refObj.headline } : {}),
            };
          }

          if (msgType === 'text' && typeof msg.text === 'object' && msg.text !== null) {
            const textObj = msg.text as Record<string, unknown>;
            if (typeof textObj.body === 'string') {
              interactionType = 'text';
              textBody = textObj.body;
            }
          } else if (
            msgType === 'interactive' &&
            typeof msg.interactive === 'object' &&
            msg.interactive !== null
          ) {
            const interactiveObj = msg.interactive as Record<string, unknown>;
            const subType = interactiveObj.type;
            if (
              subType === 'button_reply' &&
              typeof interactiveObj.button_reply === 'object' &&
              interactiveObj.button_reply !== null
            ) {
              const btn = interactiveObj.button_reply as Record<string, unknown>;
              if (typeof btn.id === 'string' && typeof btn.title === 'string') {
                interactionType = 'interactive_reply';
                interactiveReply = {
                  sourceType: 'button_reply',
                  payloadId: btn.id,
                  title: btn.title,
                };
              }
            } else if (
              subType === 'list_reply' &&
              typeof interactiveObj.list_reply === 'object' &&
              interactiveObj.list_reply !== null
            ) {
              const row = interactiveObj.list_reply as Record<string, unknown>;
              if (typeof row.id === 'string' && typeof row.title === 'string') {
                interactionType = 'interactive_reply';
                interactiveReply = {
                  sourceType: 'list_reply',
                  payloadId: row.id,
                  title: row.title,
                  ...(typeof row.description === 'string' ? { description: row.description } : {}),
                };
              }
            }
          } else if (
            msgType === 'button' &&
            typeof msg.button === 'object' &&
            msg.button !== null
          ) {
            const templateBtn = msg.button as Record<string, unknown>;
            const payload =
              typeof templateBtn.payload === 'string' ? templateBtn.payload : undefined;
            const text = typeof templateBtn.text === 'string' ? templateBtn.text : payload;
            if (payload !== undefined && text !== undefined) {
              interactionType = 'interactive_reply';
              interactiveReply = {
                sourceType: 'button_reply',
                payloadId: payload,
                title: text,
              };
            }
          } else if (
            msgType === 'image' ||
            msgType === 'video' ||
            msgType === 'audio' ||
            msgType === 'document' ||
            msgType === 'sticker'
          ) {
            const mediaObj = msg[msgType] as Record<string, unknown> | undefined;
            interactionType = 'media';
            media = {
              mediaType: msgType,
              ...(typeof mediaObj?.id === 'string' ? { providerMediaId: mediaObj.id } : {}),
              ...(typeof mediaObj?.mime_type === 'string' ? { mimeType: mediaObj.mime_type } : {}),
              ...(typeof mediaObj?.caption === 'string' ? { caption: mediaObj.caption } : {}),
              ...(typeof mediaObj?.sha256 === 'string' ? { sha256: mediaObj.sha256 } : {}),
            };
          } else if (msgType === 'reaction') {
            interactionType = 'reaction';
          }

          const endUserName = contactNames.get(fromWaId);

          inboundMessages.push({
            envelopeId: generateUuidV7(),
            channel: 'whatsapp',
            channelAccountId: phoneNumberId,
            providerMessageId,
            conversationKey: `wa:${phoneNumberId}:${fromWaId}`,
            endUserId: fromWaId,
            ...(endUserName !== undefined ? { endUserName } : {}),
            timestampIso: parseUnixTimestampToIso(msg.timestamp),
            interactionType,
            ...(textBody !== undefined ? { text: textBody } : {}),
            ...(interactiveReply !== undefined ? { interactiveReply } : {}),
            ...(media !== undefined ? { media } : {}),
            ...(referral !== undefined ? { referral } : {}),
          });
        }
      }
    }
  }

  return { inboundMessages, statusEvents };
}
