import { z } from 'zod';
import { OmnichannelChannelSchema } from './envelope.schema.js';
import { WorkflowDefinitionSchema } from './workflow.schema.js';

export const TenantStatusSchema = z.enum(['ACTIVE', 'SUSPENDED']);
export type TenantStatus = z.infer<typeof TenantStatusSchema>;

export const CreateTenantRequestSchema = z
  .object({
    slug: z
      .string()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9-]+$/),
    displayName: z.string().min(2).max(120),
    timezone: z.string().min(2).max(64).default('America/Sao_Paulo'),
  })
  .strict();
export type CreateTenantRequest = z.infer<typeof CreateTenantRequestSchema>;

export const TenantRecordSchema = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    displayName: z.string(),
    timezone: z.string(),
    status: TenantStatusSchema,
    createdAt: z.iso.datetime(),
  })
  .strict();
export type TenantRecord = z.infer<typeof TenantRecordSchema>;

export const RegisterChannelRequestSchema = z
  .object({
    channel: OmnichannelChannelSchema,
    channelAccountId: z.string().min(1).max(128),
    displayHandle: z.string().min(1).max(128),
    accessTokenSecretRef: z.string().min(1).max(256),
    activeWorkflowId: z.uuid().optional(),
  })
  .strict();
export type RegisterChannelRequest = z.infer<typeof RegisterChannelRequestSchema>;

export const TenantChannelRecordSchema = z
  .object({
    id: z.uuid(),
    tenantId: z.uuid(),
    channel: OmnichannelChannelSchema,
    channelAccountId: z.string(),
    displayHandle: z.string(),
    accessTokenSecretRef: z.string(),
    activeWorkflowId: z.uuid().nullable(),
    isActive: z.boolean(),
    createdAt: z.iso.datetime(),
  })
  .strict();
export type TenantChannelRecord = z.infer<typeof TenantChannelRecordSchema>;

export const PublishWorkflowRequestSchema = z
  .object({
    definition: WorkflowDefinitionSchema,
    activateForChannelAccountIds: z.array(z.string().min(1)).default([]),
  })
  .strict();
export type PublishWorkflowRequest = z.infer<typeof PublishWorkflowRequestSchema>;

export const WorkflowVersionRecordSchema = z
  .object({
    id: z.uuid(),
    tenantId: z.uuid(),
    workflowKey: z.string(),
    version: z.number().int().positive(),
    name: z.string(),
    definition: WorkflowDefinitionSchema,
    publishedAt: z.iso.datetime(),
  })
  .strict();
export type WorkflowVersionRecord = z.infer<typeof WorkflowVersionRecordSchema>;
