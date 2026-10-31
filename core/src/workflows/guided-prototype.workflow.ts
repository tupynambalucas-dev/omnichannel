import { WorkflowDefinitionSchema, type WorkflowDefinition } from '../schemas/workflow.schema.js';

/**
 * Enterprise guided conversation prototype definition for Tupynamba Lucas Omnichannel.
 *
 * Demonstrates:
 * 1. Interactive quick choices greeting with personalized variable interpolation.
 * 2. Strict Brazilian CPF tax identifier validation via Modulo-11 with reprompts.
 * 3. WhatsApp list interactive checkbox menus (MENU_CHOICES) with section titles and descriptions.
 * 4. Multi-level service category and modality dispatching.
 * 5. Pre-confirmation summary review with confirmation, restart, or human escalation branches.
 * 6. Final confirmation dispatch with deterministic protocol generation.
 * 7. Graceful human specialist handoff with conversational context attachments.
 */
export function buildGuidedPrototypeWorkflow(): WorkflowDefinition {
  const definition: WorkflowDefinition = {
    workflowKey: 'enterprise-guided-prototype',
    version: 1,
    name: 'Enterprise Guided Conversation Prototype',
    description:
      'Professional guided conversation prototype with interactive list checkbox menus, Brazilian CPF Modulo-11 validation, confirmation steps, and human handoff.',
    entryNodeId: 'welcome_menu',
    globalKeywords: {
      optOutConfirmationText:
        'Voce cancelou o recebimento de notificacoes automaticas. Envie MENU a qualquer momento para reativar.',
      resetMenuNodeId: 'welcome_menu',
      humanHandoffKeywords: ['HUMANO', 'ATENDENTE', 'AGENT', 'SUPORTE'],
      humanHandoffNodeId: 'handoff_specialist',
    },
    nodes: [
      {
        id: 'welcome_menu',
        type: 'ASK_INTERACTIVE',
        promptComponent: {
          kind: 'QUICK_CHOICES',
          headerText: 'Atendimento Tupynamba Lucas',
          body: 'Ola {{contactName}}! Seja bem-vindo ao portal de atendimento inteligente da Tupynamba Lucas. Por favor, selecione como deseja prosseguir:',
          footerText: 'Toque em uma opcao',
          options: [
            { id: 'opt_guided_flow', title: 'Atendimento Guiado' },
            { id: 'opt_human_queue', title: 'Falar com Atendente' },
          ],
        },
        saveToVariable: 'initialChoice',
        repromptMessage: 'Por favor, selecione uma das opcoes acima para continuar.',
        maxInvalidAttempts: 3,
        fallbackNodeId: 'handoff_specialist',
        transitions: [
          {
            payloadId: 'opt_guided_flow',
            nextNodeId: 'ask_customer_cpf',
            assignValue: 'guided_flow',
          },
          {
            payloadId: 'opt_human_queue',
            nextNodeId: 'handoff_specialist',
            assignValue: 'human_queue',
          },
        ],
      },
      {
        id: 'ask_customer_cpf',
        type: 'ASK_TEXT_VALIDATED',
        promptText:
          'Para continuarmos o seu atendimento, digite o seu CPF (apenas numeros ou formatado). O documento sera verificado automaticamente:',
        validationFormat: 'CPF',
        saveToVariable: 'customerCpf',
        invalidPromptText:
          'O CPF informado nao e valido de acordo com a validacao oficial da Receita Federal. Por favor, revise os 11 digitos e digite novamente:',
        maxInvalidAttempts: 3,
        nextNodeId: 'services_menu',
        fallbackNodeId: 'handoff_specialist',
      },
      {
        id: 'services_menu',
        type: 'ASK_INTERACTIVE',
        promptComponent: {
          kind: 'MENU_CHOICES',
          headerText: 'Catalogo de Servicos',
          body: 'CPF {{customerCpf}} autenticado com sucesso!\n\nAgora selecione na lista abaixo qual servico voce deseja solicitar:',
          footerText: 'Selecione um servico',
          menuButtonLabel: 'Ver Servicos',
          sectionTitle: 'Servicos Disponiveis',
          options: [
            {
              id: 'srv_cloud',
              title: '[x] Infra Cloud / K8s',
              description: 'Kubernetes, Helm, GitOps e Clusters corporativos',
            },
            {
              id: 'srv_omnichannel',
              title: '[x] Omnichannel API',
              description: 'WhatsApp Cloud API, Instagram e Webhooks FSM',
            },
            {
              id: 'srv_agent_mesh',
              title: '[x] Agent Mesh & IA',
              description: 'Agentes autonomos, MCP servers e automacoes',
            },
            {
              id: 'srv_governance',
              title: '[x] Governanca / Vault',
              description: 'Infisical, politicas de seguranca e auditoria',
            },
          ],
        },
        saveToVariable: 'selectedService',
        repromptMessage: 'Por favor, abra o menu interativo e selecione um dos servicos da lista.',
        maxInvalidAttempts: 3,
        fallbackNodeId: 'handoff_specialist',
        transitions: [
          {
            payloadId: 'srv_cloud',
            nextNodeId: 'request_type_menu',
            assignValue: 'Infra Cloud / K8s',
          },
          {
            payloadId: 'srv_omnichannel',
            nextNodeId: 'request_type_menu',
            assignValue: 'Omnichannel API',
          },
          {
            payloadId: 'srv_agent_mesh',
            nextNodeId: 'request_type_menu',
            assignValue: 'Agent Mesh & IA',
          },
          {
            payloadId: 'srv_governance',
            nextNodeId: 'request_type_menu',
            assignValue: 'Governanca / Vault',
          },
        ],
      },
      {
        id: 'request_type_menu',
        type: 'ASK_INTERACTIVE',
        promptComponent: {
          kind: 'MENU_CHOICES',
          headerText: 'Tipo de Solicitacao',
          body: 'Servico selecionado: {{selectedService}}.\n\nSelecione abaixo a modalidade desejada para o atendimento:',
          footerText: 'Selecione uma modalidade',
          menuButtonLabel: 'Ver Opcoes',
          sectionTitle: 'Modalidade',
          options: [
            {
              id: 'type_project',
              title: '[x] Novo Projeto',
              description: 'Orcamento, proposta tecnica e onboarding',
            },
            {
              id: 'type_support',
              title: '[x] Suporte Tecnico',
              description: 'Atendimento operacional e diagnostico',
            },
            {
              id: 'type_consulting',
              title: '[x] Consultoria',
              description: 'Revisao arquitetural e analise de requisitos',
            },
          ],
        },
        saveToVariable: 'requestType',
        repromptMessage: 'Por favor, selecione uma das modalidades disponiveis no menu.',
        maxInvalidAttempts: 3,
        fallbackNodeId: 'handoff_specialist',
        transitions: [
          {
            payloadId: 'type_project',
            nextNodeId: 'confirm_summary_menu',
            assignValue: 'Novo Projeto',
          },
          {
            payloadId: 'type_support',
            nextNodeId: 'confirm_summary_menu',
            assignValue: 'Suporte Tecnico',
          },
          {
            payloadId: 'type_consulting',
            nextNodeId: 'confirm_summary_menu',
            assignValue: 'Consultoria',
          },
        ],
      },
      {
        id: 'confirm_summary_menu',
        type: 'ASK_INTERACTIVE',
        promptComponent: {
          kind: 'QUICK_CHOICES',
          headerText: 'Revisao da Solicitacao',
          body: 'Por favor, confirme as informacoes do seu atendimento:\n\n- Solicitante: {{contactName}}\n- CPF: {{customerCpf}}\n- Servico: {{selectedService}}\n- Modalidade: {{requestType}}\n\nComo deseja prosseguir?',
          footerText: 'Selecione uma acao',
          options: [
            { id: 'act_confirm', title: 'Confirmar Pedido' },
            { id: 'act_restart', title: 'Reiniciar Cadastro' },
            { id: 'act_human', title: 'Falar com Atendente' },
          ],
        },
        saveToVariable: 'confirmationStatus',
        repromptMessage:
          'Por favor, escolha se deseja confirmar, reiniciar ou falar com um atendente.',
        maxInvalidAttempts: 3,
        fallbackNodeId: 'handoff_specialist',
        transitions: [
          {
            payloadId: 'act_confirm',
            nextNodeId: 'send_success_message',
            assignValue: 'CONFIRMED',
          },
          { payloadId: 'act_restart', nextNodeId: 'welcome_menu', assignValue: 'RESTART' },
          {
            payloadId: 'act_human',
            nextNodeId: 'handoff_specialist',
            assignValue: 'HUMAN_REQUEST',
          },
        ],
      },
      {
        id: 'send_success_message',
        type: 'SEND_MESSAGE',
        components: [
          {
            kind: 'TEXT',
            body: 'Solicitacao registrada com sucesso!\n\nProtocolo: #TL-{{customerCpf}}-2026\nServico: {{selectedService}} ({{requestType}})\nResponsavel: Equipe de Engenharia Tupynamba Lucas\n\nRecebemos seus dados e nossa equipe tecnica entrara em contato em breve. Se precisar de novo atendimento, envie MENU a qualquer momento.',
            previewUrl: false,
          },
        ],
        nextNodeId: null,
      },
      {
        id: 'handoff_specialist',
        type: 'HUMAN_HANDOFF',
        departmentQueue: 'tier-1-omnichannel',
        announcementText:
          'Conectando voce com a nossa equipe de especialistas. Por favor, aguarde um momento enquanto transferimos seu historico.',
        summaryVariables: [
          'contactName',
          'customerCpf',
          'selectedService',
          'requestType',
          'initialChoice',
        ],
      },
    ],
  };

  // Validate the definition against the canonical Zod schema at runtime
  return WorkflowDefinitionSchema.parse(definition);
}
