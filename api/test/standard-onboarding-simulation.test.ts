import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  generateUuidV7,
  isValidBrazilianCpf,
  type CanonicalInboundEnvelope,
  type MetaWebhookPayload,
  type OutboundDispatchJob,
} from '@tupynambalucas-dev/omnichannel-core';
import type { FastifyBaseLogger } from 'fastify';
import server from '../src/config/fastifyInstanceConfig.js';
import { compileOutboundMessages } from '../src/domains/compiler/outbound.compiler.js';
import { TenantRepository } from '../src/domains/tenants/tenant.repository.js';
import { TenantService } from '../src/domains/tenants/tenant.service.js';
import { SessionStateRepository } from '../src/domains/workflow/session-state.repository.js';
import { WorkflowEngine } from '../src/domains/workflow/workflow.engine.js';
import registryPlugin from '../src/plugins/registryPlugin.js';

const noop = (): void => {
  // Test logger no-op sink
};

const mockLogger = {
  info: noop,
  warn: noop,
  error: noop,
  debug: noop,
  trace: noop,
  fatal: noop,
  child: () => mockLogger,
} as unknown as FastifyBaseLogger;

describe('Tupynamba Lucas Enterprise - Standard WhatsApp Onboarding Conversation', () => {
  it('should verify Brazilian CPF validation helper logic for business compliance', () => {
    assert.equal(isValidBrazilianCpf('52998224725'), true);
    assert.equal(isValidBrazilianCpf('529.982.247-25'), true);
    assert.equal(isValidBrazilianCpf('11144477735'), true);

    // Invalid CPFs (known repeated sequences or bad check digits)
    assert.equal(isValidBrazilianCpf('11111111111'), false);
    assert.equal(isValidBrazilianCpf('12345678900'), false);
    assert.equal(isValidBrazilianCpf('99999999999'), false);
    assert.equal(isValidBrazilianCpf('abc'), false);
  });

  it('should execute full multi-turn standard onboarding conversation through WorkflowEngine', async () => {
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

    const channelAccountId = '106540352242922'; // Standard Meta Cloud API test account ID
    const { tenant, workflow } =
      await tenantService.ensureDefaultEnterpriseTenant(channelAccountId);

    assert.equal(tenant.slug, 'tupynamba-lucas-enterprise');
    assert.equal(workflow.workflowKey, 'enterprise-standard-onboarding');
    assert.equal(workflow.version, 1);

    const endUserId = '5511999998888';
    const conversationKey = `conv:${endUserId}`;

    // --- TURN 1: User sends text greeting ---
    const turn1Envelope: CanonicalInboundEnvelope = {
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_std_001',
      endUserId,
      conversationKey,
      endUserName: 'Lucas Tupynamba',
      interactionType: 'text',
      text: 'Ola, gostaria de conhecer os servicos',
      timestampIso: new Date().toISOString(),
    };

    await engine.processInboundEnvelope(turn1Envelope);

    const sessionAfterTurn1 = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(sessionAfterTurn1 !== null);
    assert.equal(sessionAfterTurn1.status, 'WAITING_INPUT');
    assert.equal(sessionAfterTurn1.currentNodeId, 'welcome_menu');

    assert.equal(dispatchedJobs.length, 1);
    const job1 = dispatchedJobs[0];
    assert.equal(job1.components.length, 1);
    const comp1 = job1.components[0];
    assert.equal(comp1.kind, 'QUICK_CHOICES');
    assert.equal(comp1.options.length, 3);
    assert.equal(comp1.options[0].id, 'opt_solutions');
    assert.equal(comp1.options[1].id, 'opt_tech_support');
    assert.equal(comp1.options[2].id, 'opt_human_advisor');

    // Compile to WhatsApp format and verify
    const compiledJob1 = compileOutboundMessages(
      job1.channel,
      job1.channelAccountId,
      job1.recipientId,
      job1.components,
      job1.variables,
    );
    assert.equal(compiledJob1.length, 1);
    const waMsg1 = compiledJob1[0].body;
    assert.equal(waMsg1.messaging_product, 'whatsapp');
    assert.equal(waMsg1.type, 'interactive');
    const waInteractive1 = waMsg1.interactive as { type: string; action: { buttons: unknown[] } };
    assert.equal(waInteractive1.type, 'button');
    assert.equal(waInteractive1.action.buttons.length, 3);

    // --- TURN 2: User clicks "Solucoes e Planos" button ---
    const turn2Envelope: CanonicalInboundEnvelope = {
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_std_002',
      endUserId,
      conversationKey,
      endUserName: 'Lucas Tupynamba',
      interactionType: 'interactive_reply',
      interactiveReply: {
        sourceType: 'button_reply',
        payloadId: 'opt_solutions',
        title: 'Solucoes e Planos',
      },
      timestampIso: new Date().toISOString(),
    };

    await engine.processInboundEnvelope(turn2Envelope);

    const sessionAfterTurn2 = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(sessionAfterTurn2 !== null);
    assert.equal(sessionAfterTurn2.status, 'WAITING_INPUT');
    assert.equal(sessionAfterTurn2.currentNodeId, 'catalog_solutions_menu');
    assert.equal(sessionAfterTurn2.variables.initialIntent, 'SOLUCOES');

    assert.equal(dispatchedJobs.length, 2);
    const job2 = dispatchedJobs[1];
    const comp2 = job2.components[0];
    assert.equal(comp2.kind, 'MENU_CHOICES');
    assert.equal(comp2.menuButtonLabel, 'Ver Solucoes');
    assert.equal(comp2.options.length, 4);

    // Compile to WhatsApp interactive list format
    const compiledJob2 = compileOutboundMessages(
      job2.channel,
      job2.channelAccountId,
      job2.recipientId,
      job2.components,
      job2.variables,
    );
    assert.equal(compiledJob2.length, 1);
    const waInteractive2 = compiledJob2[0].body.interactive as {
      type: string;
      action: { button: string; sections: Array<{ rows: unknown[] }> };
    };
    assert.equal(waInteractive2.type, 'list');
    assert.equal(waInteractive2.action.button, 'Ver Solucoes');
    assert.equal(waInteractive2.action.sections[0].rows.length, 4);

    // --- TURN 3: User selects "Omnichannel API" from interactive list ---
    const turn3Envelope: CanonicalInboundEnvelope = {
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_std_003',
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

    await engine.processInboundEnvelope(turn3Envelope);

    const sessionAfterTurn3 = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(sessionAfterTurn3 !== null);
    assert.equal(sessionAfterTurn3.status, 'WAITING_INPUT');
    assert.equal(sessionAfterTurn3.currentNodeId, 'ask_customer_cpf');
    assert.equal(sessionAfterTurn3.variables.selectedSolution, 'Omnichannel API');

    assert.equal(dispatchedJobs.length, 3);
    const job3 = dispatchedJobs[2];
    assert.equal(job3.components[0].kind, 'TEXT');
    assert.ok(job3.components[0].body.includes('digite o seu CPF'));

    // --- TURN 4: User sends invalid CPF with bad check digits ---
    const turn4Envelope: CanonicalInboundEnvelope = {
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_std_004',
      endUserId,
      conversationKey,
      endUserName: 'Lucas Tupynamba',
      interactionType: 'text',
      text: '111.111.111-11',
      timestampIso: new Date().toISOString(),
    };

    await engine.processInboundEnvelope(turn4Envelope);

    const sessionAfterTurn4 = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(sessionAfterTurn4 !== null);
    assert.equal(sessionAfterTurn4.status, 'WAITING_INPUT');
    assert.equal(sessionAfterTurn4.currentNodeId, 'ask_customer_cpf');
    assert.equal(sessionAfterTurn4.invalidAttempts, 1);

    assert.equal(dispatchedJobs.length, 4);
    const job4 = dispatchedJobs[3];
    assert.ok(job4.components[0].body.includes('Modulo-11'));

    // --- TURN 5: User sends valid CPF ---
    const turn5Envelope: CanonicalInboundEnvelope = {
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_std_005',
      endUserId,
      conversationKey,
      endUserName: 'Lucas Tupynamba',
      interactionType: 'text',
      text: '529.982.247-25',
      timestampIso: new Date().toISOString(),
    };

    await engine.processInboundEnvelope(turn5Envelope);

    const sessionAfterTurn5 = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(sessionAfterTurn5 !== null);
    assert.equal(sessionAfterTurn5.status, 'WAITING_INPUT');
    assert.equal(sessionAfterTurn5.currentNodeId, 'scope_priority_menu');
    assert.equal(sessionAfterTurn5.variables.customerCpf, '52998224725');
    assert.equal(sessionAfterTurn5.invalidAttempts, 0);

    assert.equal(dispatchedJobs.length, 5);
    const job5 = dispatchedJobs[4];
    assert.equal(job5.components[0].kind, 'QUICK_CHOICES');

    // Compile and verify variable interpolation
    const compiledJob5 = compileOutboundMessages(
      job5.channel,
      job5.channelAccountId,
      job5.recipientId,
      job5.components,
      job5.variables,
    );
    assert.equal(compiledJob5.length, 1);
    const waInteractive5 = compiledJob5[0].body.interactive as {
      type: string;
      body: { text: string };
      action: { buttons: unknown[] };
    };
    assert.equal(waInteractive5.type, 'button');
    assert.ok(waInteractive5.body.text.includes('CPF 52998224725 autenticado'));

    // --- TURN 6: User selects "Proposta Comercial" priority ---
    const turn6Envelope: CanonicalInboundEnvelope = {
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_std_006',
      endUserId,
      conversationKey,
      endUserName: 'Lucas Tupynamba',
      interactionType: 'interactive_reply',
      interactiveReply: {
        sourceType: 'button_reply',
        payloadId: 'prio_commercial',
        title: 'Proposta Comercial',
      },
      timestampIso: new Date().toISOString(),
    };

    await engine.processInboundEnvelope(turn6Envelope);

    const sessionAfterTurn6 = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(sessionAfterTurn6 !== null);
    assert.equal(sessionAfterTurn6.status, 'WAITING_INPUT');
    assert.equal(sessionAfterTurn6.currentNodeId, 'confirm_summary_menu');
    assert.equal(sessionAfterTurn6.variables.priorityLevel, 'Proposta Comercial');

    assert.equal(dispatchedJobs.length, 6);
    const job6 = dispatchedJobs[5];
    assert.equal(job6.components[0].kind, 'QUICK_CHOICES');

    // Verify interpolated summary review
    const compiledJob6 = compileOutboundMessages(
      job6.channel,
      job6.channelAccountId,
      job6.recipientId,
      job6.components,
      job6.variables,
    );
    assert.equal(compiledJob6.length, 1);
    const waInteractive6 = compiledJob6[0].body.interactive as {
      type: string;
      body: { text: string };
    };
    assert.ok(waInteractive6.body.text.includes('Lucas Tupynamba'));
    assert.ok(waInteractive6.body.text.includes('52998224725'));
    assert.ok(waInteractive6.body.text.includes('Omnichannel API'));
    assert.ok(waInteractive6.body.text.includes('Proposta Comercial'));

    // --- TURN 7: User confirms the request ---
    const turn7Envelope: CanonicalInboundEnvelope = {
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_std_007',
      endUserId,
      conversationKey,
      endUserName: 'Lucas Tupynamba',
      interactionType: 'interactive_reply',
      interactiveReply: {
        sourceType: 'button_reply',
        payloadId: 'btn_confirm',
        title: 'Confirmar Pedido',
      },
      timestampIso: new Date().toISOString(),
    };

    await engine.processInboundEnvelope(turn7Envelope);

    const sessionAfterTurn7 = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(sessionAfterTurn7 !== null);
    assert.equal(sessionAfterTurn7.status, 'COMPLETED');
    assert.equal(sessionAfterTurn7.currentNodeId, 'send_success_dispatch');
    assert.equal(sessionAfterTurn7.variables.confirmationStatus, 'CONFIRMADO');

    assert.equal(dispatchedJobs.length, 7);
    const job7 = dispatchedJobs[6];
    assert.equal(job7.components.length, 2);
    assert.equal(job7.components[0].kind, 'TEXT');
    assert.equal(job7.components[1].kind, 'CTA_URL');

    const compiledJob7 = compileOutboundMessages(
      job7.channel,
      job7.channelAccountId,
      job7.recipientId,
      job7.components,
      job7.variables,
    );
    assert.equal(compiledJob7.length, 2);
    const textMsg = compiledJob7[0].body as { text: { body: string } };
    assert.ok(textMsg.text.body.includes('#TL-52998224725-2026'));
    const ctaMsg = compiledJob7[1].body as {
      interactive: {
        type: string;
        action: { name: string; parameters: { display_text: string; url: string } };
      };
    };
    assert.equal(ctaMsg.interactive.type, 'cta_url');
    assert.equal(ctaMsg.interactive.action.parameters.url, 'https://docs.tupynambalucas.dev');
  });

  it('should support instant human handoff with full conversational variables', async () => {
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
      scheduleDelayedTimer: () => Promise.resolve(),
      logger: mockLogger,
    });

    const channelAccountId = '106540352242922';
    const { tenant } = await tenantService.ensureDefaultEnterpriseTenant(channelAccountId);

    const endUserId = '5511988887777';
    const conversationKey = `conv:${endUserId}`;

    // 1. Initial turn
    await engine.processInboundEnvelope({
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_handoff_001',
      endUserId,
      conversationKey,
      endUserName: 'Dev Tester',
      interactionType: 'text',
      text: 'Ola',
      timestampIso: new Date().toISOString(),
    });

    // 2. User immediately clicks "Falar com Atendente"
    await engine.processInboundEnvelope({
      envelopeId: generateUuidV7(),
      channel: 'whatsapp',
      channelAccountId,
      providerMessageId: 'wam_handoff_002',
      endUserId,
      conversationKey,
      endUserName: 'Dev Tester',
      interactionType: 'interactive_reply',
      interactiveReply: {
        sourceType: 'button_reply',
        payloadId: 'opt_human_advisor',
        title: 'Falar com Atendente',
      },
      timestampIso: new Date().toISOString(),
    });

    const session = await sessionRepo.getOrRehydrateSession(tenant.id, conversationKey);
    assert.ok(session !== null);
    assert.equal(session.status, 'HUMAN_HANDOFF');
    assert.equal(session.currentNodeId, 'handoff_specialist');
  });

  it('should process Meta webhook POST /webhooks/meta and trigger standard onboarding flow end-to-end', async () => {
    // Provide a mocked access token in runtime environment
    process.env.META_GRAPH_ACCESS_TOKEN = 'test_meta_graph_token';

    // Mock global fetch for Meta Graph API call to return a valid WhatsApp message receipt
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            messaging_product: 'whatsapp',
            contacts: [{ input: '5511999998888', wa_id: '5511999998888' }],
            messages: [{ id: 'wamid.HBgLMTY0NjcwNDM1OTUVAgARGBI1RjQyNUE3NEYxMzAzMzQ5MkEA' }],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    const app = server;
    try {
      await app.register(registryPlugin);
    } catch {
      // plugin already registered in instance
    }

    try {
      // Verify health endpoint
      const healthResponse = await app.inject({
        method: 'GET',
        url: '/health',
      });
      assert.equal(healthResponse.statusCode, 200);

      // Meta Webhook Verification Challenge (GET /webhooks/meta)
      const challengeResponse = await app.inject({
        method: 'GET',
        url: '/webhooks/meta?hub.mode=subscribe&hub.verify_token=dev-verify-token&hub.challenge=test_challenge_123',
      });
      assert.equal(challengeResponse.statusCode, 200);
      assert.equal(challengeResponse.body, 'test_challenge_123');

      // Simulate an actual inbound WhatsApp webhook event (POST /webhooks/meta)
      const mockMetaWebhookPayload: MetaWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'waba_enterprise_default',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '5511999998888',
                    phone_number_id: '106540352242922',
                  },
                  contacts: [
                    {
                      profile: {
                        name: 'Cliente Corporativo',
                      },
                      wa_id: '5511999998888',
                    },
                  ],
                  messages: [
                    {
                      from: '5511999998888',
                      id: 'wamid.HBgLMTY0NjcwNDM1OTUVAgASGBQzQTZDMzFGRUFBQjlDMzIzMzlEQwA=',
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      type: 'text',
                      text: {
                        body: 'Boa tarde, quero atendimento',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const webhookResponse = await app.inject({
        method: 'POST',
        url: '/webhooks/meta',
        headers: {
          'content-type': 'application/json',
        },
        payload: JSON.stringify(mockMetaWebhookPayload),
      });

      assert.equal(webhookResponse.statusCode, 200);
      const responseJson = JSON.parse(webhookResponse.body) as {
        received: boolean;
        acceptedMessages: number;
      };
      assert.equal(responseJson.received, true);
      assert.equal(responseJson.acceptedMessages, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
