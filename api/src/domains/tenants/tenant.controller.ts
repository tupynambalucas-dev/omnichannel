import type {
  CreateTenantRequest,
  PublishWorkflowRequest,
  RegisterChannelRequest,
  TenantChannelRecord,
  TenantRecord,
  WorkflowVersionRecord,
} from '@tupynambalucas-dev/omnichannel-core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { TenantService } from './tenant.service.js';

export class TenantController {
  private readonly service: TenantService;

  constructor(service: TenantService) {
    this.service = service;
  }

  public createTenant = async (
    request: FastifyRequest<{ Body: CreateTenantRequest }>,
    reply: FastifyReply,
  ): Promise<TenantRecord> => {
    const tenant = await this.service.createTenant(request.body);
    reply.status(201);
    return tenant;
  };

  public listTenants = async (): Promise<{ items: TenantRecord[] }> => {
    const tenants = await this.service.listTenants();
    return { items: tenants };
  };

  public registerChannel = async (
    request: FastifyRequest<{ Params: { tenantId: string }; Body: RegisterChannelRequest }>,
    reply: FastifyReply,
  ): Promise<TenantChannelRecord> => {
    const channelRecord = await this.service.registerChannel(request.params.tenantId, request.body);
    reply.status(201);
    return channelRecord;
  };

  public publishWorkflow = async (
    request: FastifyRequest<{ Params: { tenantId: string }; Body: PublishWorkflowRequest }>,
    reply: FastifyReply,
  ): Promise<WorkflowVersionRecord> => {
    const workflow = await this.service.publishWorkflow(request.params.tenantId, request.body);
    reply.status(201);
    return workflow;
  };

  public bootstrapStarterWorkflow = async (
    request: FastifyRequest<{
      Params: { tenantId: string };
      Body: { activateForChannelAccountIds: string[] };
    }>,
    reply: FastifyReply,
  ): Promise<WorkflowVersionRecord> => {
    const workflow = await this.service.bootstrapStarterWorkflow(
      request.params.tenantId,
      request.body.activateForChannelAccountIds,
    );
    reply.status(201);
    return workflow;
  };
}
