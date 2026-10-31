import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  generateUuidV7,
  isValidBrazilianCpf,
  type CanonicalInboundEnvelope,
  type OutboundDispatchJob,
} from '@tupynambalucas-dev/omnichannel-core';
import type { FastifyBaseLogger } from 'fastify';
import { compileOutboundMessages } from '../src/domains/compiler/outbound.compiler.js';
import { TenantRepository } from '../src/domains/tenants/tenant.repository.js';
import { TenantService } from '../src/domains/tenants/tenant.service.js';
import { SessionStateRepository } from '../src/domains/workflow/session-state.repository.js';
import { WorkflowEngine } from '../src/domains/workflow/workflow.engine.js';

const noop = (): void => {
  // Test logger no-op sink
};

// Minimal silent logger for test environment
const mockLogger = {
  info: noop,
  warn: noop,
  error: noop,
  debug: noop,
  trace: noop,
  fatal: noop,
  child: () => mockLogger,
} as unknown as FastifyBaseLogger;

describe('Enterprise Guided Conversation Prototype Simulation', () => {
  it('should verify Brazilian CPF check digits validation helper', () => {
    // Valid CPF sample (Modulo-11 checked)
    assert.equal(isValidBrazilianCpf('52998224725'), true);
    assert.equal(isValidBrazilianCpf('529.982.247-25'), true);

    // Invalid CPFs
    assert.equal(isValidBrazilianCpf('12345678900'), false);
    assert.equal(isValidBrazilianCpf('11111111111'), false);
    assert.equal(isValidBrazilianCpf('123'), false);
  });

  it('should execute full end-to-end multi-turn guided conversation with checkbox menus and CPF validation', async () => {
    const tenantRepo = new TenantRepository(null);
    const sessionRepo = new SessionStateRepository({ redisState: null, pgPool: null });
    const tenantService = new TenantService(tenantRepo);

    const dispatchedJobs: OutboundDispatchJob[] = [];
    const enqueueOutbound = (job: OutboundDispatchJob): Promise<void> => {
      dispatchedJobs.push(job);
      return Promise.resolve();
    };

    const scheduleDelayedTimer = (): Promise<void> => Promise.resolve();

    const engine = new WorkflowEngine({
      tenantRepository: tenantRepo,
      sessionRepository: sessionRepo,
      enqueueOutbound,
      scheduleDelayedTimer,
      logger: mockLogger,
    });

    // 1. Provision Tenant and WhatsApp Channel Account
    const tenant = await tenantService.createTenant({
      slug: 'tupynamba-lucas-enterprise',
      displayName: 'Tupynamba Lucas Enterprise Suite',
      timezone: 'America/Sao_Paulo',
    });

    const channelAccountId = 'WABA_ACCOUNT_TEST_01';
    await tenantService.registerChannel(tenant.id, {
      channel: 'whatsapp',
      channelAccountId,
      credentials: {
        systemUserToken: 'test_token',
        wabaId: 'waba_123',
        phoneNumberId: channelAccountId,
      },
    });

    // 2. Publish Guided Conversation Prototype Workflow
    const workflowVersion = await tenantService.bootstrapGuidedPrototypeWorkflow(tenant.id, [
      channelAccountId,
    ]);

    assert.equal(workflowVersion.workflowKey, 'enterprise-guided-prototype');
    assert.equal(workflowVersion.version, 1);

    const endUserId = '5511999990000';
    const conversationKey = `conv:${endUserId}`;

    // --- TURN 1: Inbound greeting from user ---
    const turn1Envelope: CanonicalInboundEnvelope = {
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_msg_001',
      endUserId,
      conversationKey,
      endUserName: 'Lucas Tupynamba',
      interactionType: 'text',
      text: 'Ola, gostaria de atendimento',
      timestampIso: new Date().toISOString(),
    };

    await engine.processInboundEnvelope(turn1Envelope);

    // Verify session initialized at welcome_menu
    const sessionAfterTurn1 = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(sessionAfterTurn1 !== null);
    assert.equal(sessionAfterTurn1.status, 'WAITING_INPUT');
    assert.equal(sessionAfterTurn1.currentNodeId, 'welcome_menu');

    // Verify outbound welcome quick choices dispatched
    assert.equal(dispatchedJobs.length, 1);
    const job1 = dispatchedJobs[0];
    assert.equal(job1.components.length, 1);
    const comp1 = job1.components[0];
    assert.equal(comp1.kind, 'QUICK_CHOICES');
    assert.equal(comp1.headerText, 'Atendimento Tupynamba Lucas');
    assert.equal(comp1.options.length, 2);
    assert.equal(comp1.options[0].id, 'opt_guided_flow');
    assert.equal(comp1.options[1].id, 'opt_human_queue');

    // Verify WhatsApp compilation
    const compiledJob1 = compileOutboundMessages(
      job1.channel,
      job1.channelAccountId,
      job1.recipientId,
      job1.components,
      job1.variables,
    );
    assert.equal(compiledJob1.length, 1);
    assert.equal(compiledJob1[0].body.messaging_product, 'whatsapp');

    // --- TURN 2: User clicks "Atendimento Guiado" button ---
    const turn2Envelope: CanonicalInboundEnvelope = {
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_msg_002',
      endUserId,
      conversationKey,
      endUserName: 'Lucas Tupynamba',
      interactionType: 'interactive_reply',
      interactiveReply: {
        sourceType: 'button_reply',
        payloadId: 'opt_guided_flow',
        title: 'Atendimento Guiado',
      },
      timestampIso: new Date().toISOString(),
    };

    await engine.processInboundEnvelope(turn2Envelope);

    const sessionAfterTurn2 = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(sessionAfterTurn2 !== null);
    assert.equal(sessionAfterTurn2.status, 'WAITING_INPUT');
    assert.equal(sessionAfterTurn2.currentNodeId, 'ask_customer_cpf');
    assert.equal(sessionAfterTurn2.variables.initialChoice, 'guided_flow');

    // Verify CPF prompt dispatched
    assert.equal(dispatchedJobs.length, 2);
    const job2 = dispatchedJobs[1];
    const comp2 = job2.components[0];
    assert.equal(comp2.kind, 'TEXT');
    assert.ok(comp2.body.includes('digite o seu CPF'));

    // --- TURN 3: User inputs an INVALID Brazilian CPF ---
    const turn3Envelope: CanonicalInboundEnvelope = {
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_msg_003',
      endUserId,
      conversationKey,
      endUserName: 'Lucas Tupynamba',
      interactionType: 'text',
      text: '12345678900', // invalid check digits
      timestampIso: new Date().toISOString(),
    };

    await engine.processInboundEnvelope(turn3Envelope);

    const sessionAfterTurn3 = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(sessionAfterTurn3 !== null);
    assert.equal(sessionAfterTurn3.status, 'WAITING_INPUT');
    assert.equal(sessionAfterTurn3.currentNodeId, 'ask_customer_cpf');
    assert.equal(sessionAfterTurn3.invalidAttempts, 1);

    // Verify invalid CPF error reprompt dispatched
    assert.equal(dispatchedJobs.length, 3);
    const job3 = dispatchedJobs[2];
    const comp3 = job3.components[0];
    assert.equal(comp3.kind, 'TEXT');
    assert.ok(comp3.body.includes('O CPF informado nao e valido'));

    // --- TURN 4: User inputs a VALID Brazilian CPF (with punctuation) ---
    const turn4Envelope: CanonicalInboundEnvelope = {
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_msg_004',
      endUserId,
      conversationKey,
      endUserName: 'Lucas Tupynamba',
      interactionType: 'text',
      text: '529.982.247-25',
      timestampIso: new Date().toISOString(),
    };

    await engine.processInboundEnvelope(turn4Envelope);

    const sessionAfterTurn4 = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(sessionAfterTurn4 !== null);
    assert.equal(sessionAfterTurn4.status, 'WAITING_INPUT');
    assert.equal(sessionAfterTurn4.currentNodeId, 'services_menu');
    assert.equal(sessionAfterTurn4.variables.customerCpf, '52998224725');
    assert.equal(sessionAfterTurn4.invalidAttempts, 0);

    // Verify services menu dispatched as MENU_CHOICES (interactive list checkbox)
    assert.equal(dispatchedJobs.length, 4);
    const job4 = dispatchedJobs[3];
    const comp4 = job4.components[0];
    assert.equal(comp4.kind, 'MENU_CHOICES');
    assert.equal(comp4.headerText, 'Catalogo de Servicos');
    assert.equal(comp4.menuButtonLabel, 'Ver Servicos');
    assert.equal(comp4.options.length, 4);
    assert.equal(comp4.options[0].id, 'srv_cloud');
    assert.equal(comp4.options[1].id, 'srv_omnichannel');
    assert.equal(comp4.options[2].id, 'srv_agent_mesh');
    assert.equal(comp4.options[3].id, 'srv_governance');

    // Verify WhatsApp List payload compilation with sections and rows
    const compiledJob4 = compileOutboundMessages(
      job4.channel,
      job4.channelAccountId,
      job4.recipientId,
      job4.components,
      job4.variables,
    );
    assert.equal(compiledJob4.length, 1);
    const waInteractiveList = compiledJob4[0].body.interactive as Record<string, unknown>;
    assert.equal(waInteractiveList.type, 'list');
    const waAction = waInteractiveList.action as Record<string, unknown>;
    assert.equal(waAction.button, 'Ver Servicos');
    const sections = waAction.sections as Array<{
      title: string;
      rows: Array<{ id: string; title: string }>;
    }>;
    assert.equal(sections.length, 1);
    assert.equal(sections[0].rows.length, 4);
    assert.equal(sections[0].rows[1].id, 'srv_omnichannel');
    assert.equal(sections[0].rows[1].title, '[x] Omnichannel API');

    // --- TURN 5: User selects "[x] Omnichannel API" from list ---
    const turn5Envelope: CanonicalInboundEnvelope = {
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_msg_005',
      endUserId,
      conversationKey,
      endUserName: 'Lucas Tupynamba',
      interactionType: 'interactive_reply',
      interactiveReply: {
        sourceType: 'list_reply',
        payloadId: 'srv_omnichannel',
        title: '[x] Omnichannel API',
      },
      timestampIso: new Date().toISOString(),
    };

    await engine.processInboundEnvelope(turn5Envelope);

    const sessionAfterTurn5 = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(sessionAfterTurn5 !== null);
    assert.equal(sessionAfterTurn5.status, 'WAITING_INPUT');
    assert.equal(sessionAfterTurn5.currentNodeId, 'request_type_menu');
    assert.equal(sessionAfterTurn5.variables.selectedService, 'Omnichannel API');

    // Verify request type menu dispatched
    assert.equal(dispatchedJobs.length, 5);
    const job5 = dispatchedJobs[4];
    const comp5 = job5.components[0];
    assert.equal(comp5.kind, 'MENU_CHOICES');
    assert.equal(comp5.headerText, 'Tipo de Solicitacao');
    assert.equal(comp5.options.length, 3);
    assert.equal(comp5.options[0].id, 'type_project');
    assert.equal(comp5.options[1].id, 'type_support');
    assert.equal(comp5.options[2].id, 'type_consulting');

    // --- TURN 6: User selects "[x] Novo Projeto" from modality menu ---
    const turn6Envelope: CanonicalInboundEnvelope = {
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_msg_006',
      endUserId,
      conversationKey,
      endUserName: 'Lucas Tupynamba',
      interactionType: 'interactive_reply',
      interactiveReply: {
        sourceType: 'list_reply',
        payloadId: 'type_project',
        title: '[x] Novo Projeto',
      },
      timestampIso: new Date().toISOString(),
    };

    await engine.processInboundEnvelope(turn6Envelope);

    const sessionAfterTurn6 = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(sessionAfterTurn6 !== null);
    assert.equal(sessionAfterTurn6.status, 'WAITING_INPUT');
    assert.equal(sessionAfterTurn6.currentNodeId, 'confirm_summary_menu');
    assert.equal(sessionAfterTurn6.variables.requestType, 'Novo Projeto');

    // Verify confirmation summary review dispatched
    assert.equal(dispatchedJobs.length, 6);
    const job6 = dispatchedJobs[5];
    const comp6 = job6.components[0];
    assert.equal(comp6.kind, 'QUICK_CHOICES');
    assert.equal(comp6.headerText, 'Revisao da Solicitacao');
    assert.equal(comp6.options.length, 3);
    assert.equal(comp6.options[0].id, 'act_confirm');
    assert.equal(comp6.options[1].id, 'act_restart');
    assert.equal(comp6.options[2].id, 'act_human');

    // --- TURN 7: User clicks "Confirmar Pedido" button ---
    const turn7Envelope: CanonicalInboundEnvelope = {
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_msg_007',
      endUserId,
      conversationKey,
      endUserName: 'Lucas Tupynamba',
      interactionType: 'interactive_reply',
      interactiveReply: {
        sourceType: 'button_reply',
        payloadId: 'act_confirm',
        title: 'Confirmar Pedido',
      },
      timestampIso: new Date().toISOString(),
    };

    await engine.processInboundEnvelope(turn7Envelope);

    const sessionAfterTurn7 = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(sessionAfterTurn7 !== null);
    assert.equal(sessionAfterTurn7.status, 'COMPLETED');
    assert.equal(sessionAfterTurn7.currentNodeId, 'send_success_message');
    assert.equal(sessionAfterTurn7.variables.confirmationStatus, 'CONFIRMED');

    // Verify final success summary message dispatched with protocol template
    assert.equal(dispatchedJobs.length, 7);
    const job7 = dispatchedJobs[6];
    const comp7 = job7.components[0];
    assert.equal(comp7.kind, 'TEXT');
    assert.ok(comp7.body.includes('Solicitacao registrada com sucesso!'));
    assert.ok(comp7.body.includes('#TL-{{customerCpf}}-2026'));

    // Verify outbound compilation interpolates all session variables
    const compiledJob7 = compileOutboundMessages(
      job7.channel,
      job7.channelAccountId,
      job7.recipientId,
      job7.components,
      job7.variables,
    );
    assert.equal(compiledJob7.length, 1);
    const textBody = (compiledJob7[0].body as { text: { body: string } }).text.body;
    assert.ok(textBody.includes('#TL-52998224725-2026'));
    assert.ok(textBody.includes('Omnichannel API'));
    assert.ok(textBody.includes('Novo Projeto'));
  });

  it('should route to human handoff when user requests attendant', async () => {
    const tenantRepo = new TenantRepository(null);
    const sessionRepo = new SessionStateRepository({ redisState: null, pgPool: null });
    const tenantService = new TenantService(tenantRepo);

    const dispatchedJobs: OutboundDispatchJob[] = [];
    const enqueueOutbound = (job: OutboundDispatchJob): Promise<void> => {
      dispatchedJobs.push(job);
      return Promise.resolve();
    };

    const engine = new WorkflowEngine({
      tenantRepository: tenantRepo,
      sessionRepository: sessionRepo,
      enqueueOutbound,
      scheduleDelayedTimer: (): Promise<void> => Promise.resolve(),
      logger: mockLogger,
    });

    const tenant = await tenantService.createTenant({
      slug: 'tupynamba-lucas-handoff',
      displayName: 'Tupynamba Lucas Handoff Suite',
      timezone: 'America/Sao_Paulo',
    });

    const channelAccountId = 'WABA_ACCOUNT_HANDOFF_01';
    await tenantService.registerChannel(tenant.id, {
      channel: 'whatsapp',
      channelAccountId,
      credentials: {
        systemUserToken: 'token',
        wabaId: 'waba_123',
        phoneNumberId: channelAccountId,
      },
    });

    await tenantService.bootstrapGuidedPrototypeWorkflow(tenant.id, [channelAccountId]);

    const endUserId = '5511999991111';
    const conversationKey = `conv:${endUserId}`;

    // Initial greeting
    await engine.processInboundEnvelope({
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_h_001',
      endUserId,
      conversationKey,
      endUserName: 'Guilherme Silva',
      interactionType: 'text',
      text: 'Ola',
      timestampIso: new Date().toISOString(),
    });

    // User chooses human attendant
    await engine.processInboundEnvelope({
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_h_002',
      endUserId,
      conversationKey,
      endUserName: 'Guilherme Silva',
      interactionType: 'interactive_reply',
      interactiveReply: {
        sourceType: 'button_reply',
        payloadId: 'opt_human_queue',
        title: 'Falar com Atendente',
      },
      timestampIso: new Date().toISOString(),
    });

    const session = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(session !== null);
    assert.equal(session.status, 'HUMAN_HANDOFF');
    assert.equal(session.currentNodeId, 'handoff_specialist');
    assert.equal(session.variables.initialChoice, 'human_queue');
  });
});
