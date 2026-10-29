import { z } from 'zod';
import { INTERACTION_TYPES, OMNICHANNEL_CHANNELS } from '../constants.js';

export const OmnichannelChannelSchema = z.enum(OMNICHANNEL_CHANNELS);
export type OmnichannelChannel = z.infer<typeof OmnichannelChannelSchema>;

export const InteractionTypeSchema = z.enum(INTERACTION_TYPES);
export type InteractionType = z.infer<typeof InteractionTypeSchema>;

export const InboundInteractiveReplySchema = z
  .object({
    sourceType: z.enum(['button_reply', 'list_reply', 'quick_reply', 'postback']),
    payloadId: z.string().min(1).max(1000),
    title: z.string().min(1).max(256),
    description: z.string().max(512).optional(),
  })
  .strict();
export type InboundInteractiveReply = z.infer<typeof InboundInteractiveReplySchema>;

export const InboundMediaAttachmentSchema = z
  .object({
    mediaType: z.enum(['image', 'video', 'audio', 'document', 'sticker', 'story_mention']),
    providerMediaId: z.string().optional(),
    url: z.url().optional(),
    mimeType: z.string().optional(),
    caption: z.string().optional(),
    sha256: z.string().optional(),
  })
  .strict();
export type InboundMediaAttachment = z.infer<typeof InboundMediaAttachmentSchema>;

export const InboundReferralSchema = z
  .object({
    sourceType: z.string().min(1),
    sourceId: z.string().optional(),
    sourceUrl: z.string().optional(),
    headline: z.string().optional(),
    refParameter: z.string().optional(),
  })
  .strict();
export type InboundReferral = z.infer<typeof InboundReferralSchema>;

/**
 * Canonical Inbound Message Envelope shared across WhatsApp Cloud API and Instagram Messaging API.
 * Downstream FSM workers depend exclusively on this normalized contract.
 */
export const CanonicalInboundEnvelopeSchema = z
  .object({
    envelopeId: z.uuid(),
    tenantId: z.uuid().optional(),
    channel: OmnichannelChannelSchema,
    channelAccountId: z.string().min(1),
    providerMessageId: z.string().min(1),
    conversationKey: z.string().min(3),
    endUserId: z.string().min(1),
    endUserName: z.string().optional(),
    endUserHandle: z.string().optional(),
    timestampIso: z.iso.datetime(),
    interactionType: InteractionTypeSchema,
    text: z.string().optional(),
    interactiveReply: InboundInteractiveReplySchema.optional(),
    media: InboundMediaAttachmentSchema.optional(),
    referral: InboundReferralSchema.optional(),
    rawProviderMetadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type CanonicalInboundEnvelope = z.infer<typeof CanonicalInboundEnvelopeSchema>;

export const DeliveryStatusStateSchema = z.enum(['sent', 'delivered', 'read', 'failed']);
export type DeliveryStatusState = z.infer<typeof DeliveryStatusStateSchema>;

export const DeliveryStatusEventSchema = z
  .object({
    eventId: z.uuid(),
    channel: OmnichannelChannelSchema,
    channelAccountId: z.string().min(1),
    providerMessageId: z.string().min(1),
    recipientId: z.string().min(1),
    status: DeliveryStatusStateSchema,
    timestampIso: z.iso.datetime(),
    errorCode: z.number().int().optional(),
    errorTitle: z.string().optional(),
  })
  .strict();
export type DeliveryStatusEvent = z.infer<typeof DeliveryStatusEventSchema>;

export const MetaWebhookVerifyQuerySchema = z.object({
  'hub.mode': z.string(),
  'hub.verify_token': z.string(),
  'hub.challenge': z.string(),
});
export type MetaWebhookVerifyQuery = z.infer<typeof MetaWebhookVerifyQuerySchema>;

export const MetaWebhookPayloadSchema = z.object({
  object: z.enum(['whatsapp_business_account', 'instagram']),
  entry: z.array(
    z.object({
      id: z.string().min(1),
      time: z.number().optional(),
      changes: z.array(z.record(z.string(), z.unknown())).optional(),
      messaging: z.array(z.record(z.string(), z.unknown())).optional(),
    }),
  ),
});
export type MetaWebhookPayload = z.infer<typeof MetaWebhookPayloadSchema>;
