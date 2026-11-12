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

  public bootstrapGuidedPrototypeWorkflow = async (
    request: FastifyRequest<{
      Params: { tenantId: string };
      Body: { activateForChannelAccountIds: string[] };
    }>,
    reply: FastifyReply,
  ): Promise<WorkflowVersionRecord> => {
    const workflow = await this.service.bootstrapGuidedPrototypeWorkflow(
      request.params.tenantId,
      request.body.activateForChannelAccountIds,
    );
    reply.status(201);
    return workflow;
  };

  public bootstrapStandardWorkflow = async (
    request: FastifyRequest<{
      Params: { tenantId: string };
      Body: { activateForChannelAccountIds: string[] };
    }>,
    reply: FastifyReply,
  ): Promise<WorkflowVersionRecord> => {
    const workflow = await this.service.bootstrapStandardOnboardingWorkflow(
      request.params.tenantId,
      request.body.activateForChannelAccountIds,
    );
    reply.status(201);
    return workflow;
  };

  public bootstrapDefaultEnterpriseTenant = async (
    request: FastifyRequest<{
      Body?: { channelAccountId?: string; accessTokenSecretRef?: string };
    }>,
    reply: FastifyReply,
  ): Promise<{
    tenant: TenantRecord;
    channel: TenantChannelRecord;
    workflow: WorkflowVersionRecord;
  }> => {
    const channelAccountId = request.body?.channelAccountId ?? '106540352242922';
    const accessTokenSecretRef = request.body?.accessTokenSecretRef ?? 'META_GRAPH_ACCESS_TOKEN';
    const result = await this.service.ensureDefaultEnterpriseTenant(
      channelAccountId,
      accessTokenSecretRef,
    );
    reply.status(200);
    return result;
  };
}
