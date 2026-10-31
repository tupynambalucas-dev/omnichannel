import {
  CreateTenantRequestSchema,
  PublishWorkflowRequestSchema,
  RegisterChannelRequestSchema,
  TenantChannelRecordSchema,
  TenantRecordSchema,
  WorkflowVersionRecordSchema,
} from '@tupynambalucas-dev/omnichannel-core';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

const TenantIdParamsSchema = z.object({
  tenantId: z.uuid(),
});

export function tenantRoutes(server: FastifyInstance): Promise<void> {
  const app = server.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/',
    {
      schema: {
        response: {
          200: z.object({
            items: z.array(TenantRecordSchema),
          }),
        },
      },
    },
    server.tenantController.listTenants,
  );

  app.post(
    '/',
    {
      schema: {
        body: CreateTenantRequestSchema,
        response: {
          201: TenantRecordSchema,
        },
      },
    },
    server.tenantController.createTenant,
  );

  app.post(
    '/:tenantId/channels',
    {
      schema: {
        params: TenantIdParamsSchema,
        body: RegisterChannelRequestSchema,
        response: {
          201: TenantChannelRecordSchema,
        },
      },
    },
    server.tenantController.registerChannel,
  );

  app.post(
    '/:tenantId/workflows',
    {
      schema: {
        params: TenantIdParamsSchema,
        body: PublishWorkflowRequestSchema,
        response: {
          201: WorkflowVersionRecordSchema,
        },
      },
    },
    server.tenantController.publishWorkflow,
  );

  app.post(
    '/:tenantId/workflows/starter',
    {
      schema: {
        params: TenantIdParamsSchema,
        body: z.object({
          activateForChannelAccountIds: z.array(z.string().min(1)).default([]),
        }),
        response: {
          201: WorkflowVersionRecordSchema,
        },
      },
    },
    server.tenantController.bootstrapStarterWorkflow,
  );

  app.post(
    '/:tenantId/workflows/guided-prototype',
    {
      schema: {
        params: TenantIdParamsSchema,
        body: z.object({
          activateForChannelAccountIds: z.array(z.string().min(1)).default([]),
        }),
        response: {
          201: WorkflowVersionRecordSchema,
        },
      },
    },
    server.tenantController.bootstrapGuidedPrototypeWorkflow,
  );

  return Promise.resolve();
}
