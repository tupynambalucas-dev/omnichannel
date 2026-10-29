import { z } from 'zod';
import { SESSION_STATUSES } from '../constants.js';
import { OmnichannelChannelSchema } from './envelope.schema.js';

export const SessionStatusSchema = z.enum(SESSION_STATUSES);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const ConversationSessionSchema = z
  .object({
    id: z.uuid(),
    tenantId: z.uuid(),
    channel: OmnichannelChannelSchema,
    channelAccountId: z.string().min(1),
    conversationKey: z.string().min(3),
    endUserId: z.string().min(1),
    endUserName: z.string().optional(),
    workflowId: z.uuid(),
    workflowVersion: z.number().int().positive(),
    currentNodeId: z.string().min(1),
    status: SessionStatusSchema,
    variables: z.record(z.string(), z.unknown()).default({}),
    invalidAttempts: z.number().int().nonnegative().default(0),
    lastInteractionAt: z.iso.datetime(),
    windowExpiresAt: z.iso.datetime(),
    stateVersion: z.number().int().positive().default(1),
  })
  .strict();
export type ConversationSession = z.infer<typeof ConversationSessionSchema>;

export const OptInSourceSchema = z.enum([
  'INBOUND_USER_MESSAGE',
  'CLICK_TO_WHATSAPP_AD',
  'IG_COMMENT_TRIGGER',
  'WEB_CHECKBOX_CONSENT',
  'USER_STOP_KEYWORD',
]);
export type OptInSource = z.infer<typeof OptInSourceSchema>;

export const OptInAuditRecordSchema = z
  .object({
    id: z.uuid(),
    tenantId: z.uuid(),
    channel: OmnichannelChannelSchema,
    endUserId: z.string().min(1),
    optedIn: z.boolean(),
    source: OptInSourceSchema,
    evidenceMetadata: z.record(z.string(), z.unknown()).default({}),
    recordedAt: z.iso.datetime(),
  })
  .strict();
export type OptInAuditRecord = z.infer<typeof OptInAuditRecordSchema>;
