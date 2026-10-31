import {
  buildGuidedPrototypeWorkflow,
  type CreateTenantRequest,
  type PublishWorkflowRequest,
  type RegisterChannelRequest,
  type TenantChannelRecord,
  type TenantRecord,
  type WorkflowDefinition,
  type WorkflowVersionRecord,
} from '@tupynambalucas-dev/omnichannel-core';
import type { TenantRepository } from './tenant.repository.js';

/**
 * Provides a ready-to-publish starter omnichannel triage workflow definition so new tenants
 * can immediately test polymorphic rendering across WhatsApp and Instagram.
 */
export function buildStarterTriageWorkflow(): WorkflowDefinition {
  return {
    workflowKey: 'enterprise-triage',
    version: 1,
    name: 'Enterprise Omnichannel Triage v1',
    description:
      'Channel-agnostic onboarding flow demonstrating interactive menus, CPF validation, and specialist handoff.',
    entryNodeId: 'welcome_menu',
    globalKeywords: {
      optOutConfirmationText:
        'You have opted out of automated notifications. Send MENU at any time to restart.',
      resetMenuNodeId: 'welcome_menu',
      humanHandoffKeywords: ['HUMANO', 'ATENDENTE', 'AGENT'],
      humanHandoffNodeId: 'handoff_specialist',
    },
    nodes: [
      {
        id: 'welcome_menu',
        type: 'ASK_INTERACTIVE',
        promptComponent: {
          kind: 'QUICK_CHOICES',
          headerText: 'Welcome',
          body: 'Hello {{contactName}}! How can we help you today?',
          footerText: 'Choose an option below',
          options: [
            { id: 'opt_sales', title: 'Commercial Plans' },
            { id: 'opt_support', title: 'Technical Support' },
            { id: 'opt_human', title: 'Talk to Agent' },
          ],
        },
        saveToVariable: 'selectedDepartment',
        repromptMessage: 'Please select one of the buttons displayed above.',
        maxInvalidAttempts: 3,
        fallbackNodeId: 'handoff_specialist',
        transitions: [
          { payloadId: 'opt_sales', nextNodeId: 'ask_customer_cpf', assignValue: 'sales' },
          { payloadId: 'opt_support', nextNodeId: 'ask_customer_cpf', assignValue: 'support' },
          { payloadId: 'opt_human', nextNodeId: 'handoff_specialist', assignValue: 'specialist' },
        ],
      },
      {
        id: 'ask_customer_cpf',
        type: 'ASK_TEXT_VALIDATED',
        promptText: 'Please enter your 11-digit CPF so we can locate your account:',
        validationFormat: 'CPF',
        saveToVariable: 'customerCpf',
        invalidPromptText:
          'The CPF informed is invalid. Please enter a valid 11-digit Brazilian CPF.',
        maxInvalidAttempts: 3,
        nextNodeId: 'confirm_routing',
        fallbackNodeId: 'handoff_specialist',
      },
      {
        id: 'confirm_routing',
        type: 'SEND_MESSAGE',
        components: [
          {
            kind: 'TEXT',
            body: 'Thank you! Your CPF ({{customerCpf}}) was verified for department: {{selectedDepartment}}.',
            previewUrl: false,
          },
        ],
        nextNodeId: 'handoff_specialist',
      },
      {
        id: 'handoff_specialist',
        type: 'HUMAN_HANDOFF',
        departmentQueue: 'tier-1-omnichannel',
        announcementText:
          'We are connecting your conversation to a specialist with your context attached.',
        summaryVariables: ['contactName', 'selectedDepartment', 'customerCpf'],
      },
    ],
  };
}

export class TenantService {
  private readonly repository: TenantRepository;

  constructor(repository: TenantRepository) {
    this.repository = repository;
  }

  public async createTenant(input: CreateTenantRequest): Promise<TenantRecord> {
    return this.repository.createTenant(input);
  }

  public async listTenants(): Promise<TenantRecord[]> {
    return this.repository.listTenants();
  }

  public async registerChannel(
    tenantId: string,
    input: RegisterChannelRequest,
  ): Promise<TenantChannelRecord> {
    return this.repository.registerChannel(tenantId, input);
  }

  public async publishWorkflow(
    tenantId: string,
    input: PublishWorkflowRequest,
  ): Promise<WorkflowVersionRecord> {
    return this.repository.publishWorkflow(tenantId, input);
  }

  public async bootstrapStarterWorkflow(
    tenantId: string,
    activateForChannelAccountIds: string[],
  ): Promise<WorkflowVersionRecord> {
    return this.repository.publishWorkflow(tenantId, {
      definition: buildStarterTriageWorkflow(),
      activateForChannelAccountIds,
    });
  }

  public async bootstrapGuidedPrototypeWorkflow(
    tenantId: string,
    activateForChannelAccountIds: string[],
  ): Promise<WorkflowVersionRecord> {
    return this.repository.publishWorkflow(tenantId, {
      definition: buildGuidedPrototypeWorkflow(),
      activateForChannelAccountIds,
    });
  }
}
