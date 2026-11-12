import { WorkflowDefinitionSchema, type WorkflowDefinition } from '../schemas/workflow.schema.js';

/**
 * Authoritative production-grade standard onboarding & customer qualification workflow
 * for Tupynamba Lucas Enterprise Suite across WhatsApp Cloud API and Instagram Messaging API.
 *
 * Implements:
 * 1. Personalized initial greeting with quick-reply buttons (QUICK_CHOICES).
 * 2. WhatsApp Interactive List menu for multi-category solutions catalog (MENU_CHOICES).
 * 3. Strict Brazilian CPF tax identifier validation via Modulo-11 check digits.
 * 4. Priority and scope classification.
 * 5. Pre-submission review summary with confirmation, restart, and human escalation branches.
 * 6. Final confirmation dispatch with deterministic protocol emission and CTA URL button.
 * 7. Graceful specialist human handoff with full conversational context preservation.
 *
 * Reference: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-list-messages
 */
export function buildStandardOnboardingWorkflow(): WorkflowDefinition {
  const definition: WorkflowDefinition = {
    workflowKey: 'enterprise-standard-onboarding',
    version: 1,
    name: 'Tupynamba Lucas Enterprise - Onboarding & Atendimento Oficial',
    description:
      'Fluxo corporativo de onboarding e atendimento oficial com qualificacao comercial, suporte, validacao cadastral de CPF e handoff humanizado.',
    entryNodeId: 'welcome_menu',
    globalKeywords: {
      optOutConfirmationText:
        'Voce cancelou o recebimento de mensagens automaticas. Para reiniciar o atendimento, envie MENU a qualquer momento.',
      resetMenuNodeId: 'welcome_menu',
      humanHandoffKeywords: ['HUMANO', 'ATENDENTE', 'AGENT', 'SUPORTE', 'ESPECIALISTA'],
      humanHandoffNodeId: 'handoff_specialist',
    },
    nodes: [
      {
        id: 'welcome_menu',
        type: 'ASK_INTERACTIVE',
        promptComponent: {
          kind: 'QUICK_CHOICES',
          headerText: 'Tupynamba Lucas Enterprise',
          body: 'Ola {{contactName}}! Bem-vindo ao canal oficial da Tupynamba Lucas Enterprise.\n\nComo podemos impulsionar sua operacao hoje? Selecione uma opcao:',
          footerText: 'Selecione uma opcao',
          options: [
            { id: 'opt_solutions', title: 'Solucoes e Planos' },
            { id: 'opt_tech_support', title: 'Suporte Tecnico' },
            { id: 'opt_human_advisor', title: 'Falar com Atendente' },
          ],
        },
        saveToVariable: 'initialIntent',
        repromptMessage: 'Por favor, selecione uma das opcoes no menu acima para continuarmos.',
        maxInvalidAttempts: 3,
        fallbackNodeId: 'handoff_specialist',
        transitions: [
          {
            payloadId: 'opt_solutions',
            nextNodeId: 'catalog_solutions_menu',
            assignValue: 'SOLUCOES',
          },
          {
            payloadId: 'opt_tech_support',
            nextNodeId: 'ask_customer_cpf',
            assignValue: 'SUPORTE',
          },
          {
            payloadId: 'opt_human_advisor',
            nextNodeId: 'handoff_specialist',
            assignValue: 'ATENDENTE',
          },
        ],
      },
      {
        id: 'catalog_solutions_menu',
        type: 'ASK_INTERACTIVE',
        promptComponent: {
          kind: 'MENU_CHOICES',
          headerText: 'Catalogo de Solucoes',
          body: 'Dispomos de infraestrutura cloud avancada, gateways omnichannel e IA empresarial.\n\nSelecione a solucao de seu interesse:',
          footerText: 'Selecione no menu',
          menuButtonLabel: 'Ver Solucoes',
          sectionTitle: 'Solucoes Corporativas',
          options: [
            {
              id: 'srv_k8s_cloud',
              title: '[x] Infra Cloud / K8s',
              description: 'Clusters Kubernetes, Helm, GitOps e deploy automatizado',
            },
            {
              id: 'srv_omnichannel',
              title: '[x] Omnichannel API',
              description: 'WhatsApp Cloud API, Instagram e motor de webhooks FSM',
            },
            {
              id: 'srv_agent_mesh',
              title: '[x] Agent Mesh & IA',
              description: 'Agentes inteligentes, servidores MCP e automacao',
            },
            {
              id: 'srv_architecture',
              title: '[x] Arquitetura & DDD',
              description: 'Consultoria de engenharia, DDD, SOLID e governanca',
            },
          ],
        },
        saveToVariable: 'selectedSolution',
        repromptMessage: 'Abra a lista interativa e toque na solucao que deseja conhecer.',
        maxInvalidAttempts: 3,
        fallbackNodeId: 'handoff_specialist',
        transitions: [
          {
            payloadId: 'srv_k8s_cloud',
            nextNodeId: 'ask_customer_cpf',
            assignValue: 'Infra Cloud / K8s',
          },
          {
            payloadId: 'srv_omnichannel',
            nextNodeId: 'ask_customer_cpf',
            assignValue: 'Omnichannel API',
          },
          {
            payloadId: 'srv_agent_mesh',
            nextNodeId: 'ask_customer_cpf',
            assignValue: 'Agent Mesh & IA',
          },
          {
            payloadId: 'srv_architecture',
            nextNodeId: 'ask_customer_cpf',
            assignValue: 'Arquitetura & DDD',
          },
        ],
      },
      {
        id: 'ask_customer_cpf',
        type: 'ASK_TEXT_VALIDATED',
        promptText:
          'Para localizarmos seu cadastro e emitir seu protocolo de atendimento com seguranca, digite o seu CPF (apenas numeros ou formatado):',
        validationFormat: 'CPF',
        saveToVariable: 'customerCpf',
        invalidPromptText:
          'O CPF informado nao e valido de acordo com o calculo oficial de digitos verificadores (Modulo-11). Por favor, confira os 11 digitos e digite novamente:',
        maxInvalidAttempts: 3,
        nextNodeId: 'scope_priority_menu',
        fallbackNodeId: 'handoff_specialist',
      },
      {
        id: 'scope_priority_menu',
        type: 'ASK_INTERACTIVE',
        promptComponent: {
          kind: 'QUICK_CHOICES',
          headerText: 'Modalidade Atendimento',
          body: 'CPF {{customerCpf}} autenticado com sucesso!\n\nIdentificamos seu interesse em: {{selectedSolution}}.\n\nQual a prioridade do seu atendimento?',
          footerText: 'Selecione a prioridade',
          options: [
            { id: 'prio_immediate', title: 'Imediato / Urgente' },
            { id: 'prio_commercial', title: 'Proposta Comercial' },
            { id: 'prio_demo', title: 'Agendar Demo' },
          ],
        },
        saveToVariable: 'priorityLevel',
        repromptMessage: 'Por favor, selecione uma das prioridades nos botoes acima.',
        maxInvalidAttempts: 3,
        fallbackNodeId: 'handoff_specialist',
        transitions: [
          {
            payloadId: 'prio_immediate',
            nextNodeId: 'confirm_summary_menu',
            assignValue: 'Imediato / Urgente',
          },
          {
            payloadId: 'prio_commercial',
            nextNodeId: 'confirm_summary_menu',
            assignValue: 'Proposta Comercial',
          },
          {
            payloadId: 'prio_demo',
            nextNodeId: 'confirm_summary_menu',
            assignValue: 'Agendar Demonstracao',
          },
        ],
      },
      {
        id: 'confirm_summary_menu',
        type: 'ASK_INTERACTIVE',
        promptComponent: {
          kind: 'QUICK_CHOICES',
          headerText: 'Revisao da Solicitacao',
          body: 'Revise os dados da sua solicitacao:\n\n- Solicitante: {{contactName}}\n- Documento: {{customerCpf}}\n- Solucao: {{selectedSolution}}\n- Prioridade: {{priorityLevel}}\n\nComo deseja prosseguir?',
          footerText: 'Selecione uma opcao',
          options: [
            { id: 'btn_confirm', title: 'Confirmar Pedido' },
            { id: 'btn_restart', title: 'Reiniciar Dados' },
            { id: 'btn_human', title: 'Falar com Atendente' },
          ],
        },
        saveToVariable: 'confirmationStatus',
        repromptMessage:
          'Por favor, escolha se deseja confirmar o pedido, reiniciar ou falar com um atendente.',
        maxInvalidAttempts: 3,
        fallbackNodeId: 'handoff_specialist',
        transitions: [
          {
            payloadId: 'btn_confirm',
            nextNodeId: 'send_success_dispatch',
            assignValue: 'CONFIRMADO',
          },
          {
            payloadId: 'btn_restart',
            nextNodeId: 'welcome_menu',
            assignValue: 'REINICIADO',
          },
          {
            payloadId: 'btn_human',
            nextNodeId: 'handoff_specialist',
            assignValue: 'SOLICITOU_HUMANO',
          },
        ],
      },
      {
        id: 'send_success_dispatch',
        type: 'SEND_MESSAGE',
        components: [
          {
            kind: 'TEXT',
            body: 'Solicitacao registrada com sucesso no sistema Tupynamba Lucas Enterprise!\n\nProtocolo: #TL-{{customerCpf}}-2026\nStatus: QUALIFICADO - EM FILA DE PROCESSAMENTO\nSolucao: {{selectedSolution}}\nPrioridade: {{priorityLevel}}\n\nNossa equipe especializada entrara em contato via este canal dentro do prazo de SLA da sua modalidade. Para iniciar um novo atendimento a qualquer momento, envie MENU.',
            previewUrl: false,
          },
          {
            kind: 'CTA_URL',
            headerText: 'Portal do Cliente',
            body: 'Acompanhe nossa documentacao tecnica e status dos servicos em nosso portal oficial:',
            footerText: 'Tupynamba Lucas Enterprise',
            buttonLabel: 'Acessar Documentacao',
            url: 'https://docs.tupynambalucas.dev',
          },
        ],
        nextNodeId: null,
      },
      {
        id: 'handoff_specialist',
        type: 'HUMAN_HANDOFF',
        departmentQueue: 'enterprise-tier-1',
        announcementText:
          'Conectando voce com nossa equipe tecnica de especialistas. Por favor, aguarde um momento enquanto transferimos seu historico e dados cadastrais.',
        summaryVariables: [
          'contactName',
          'customerCpf',
          'selectedSolution',
          'priorityLevel',
          'initialIntent',
        ],
      },
    ],
  };

  return WorkflowDefinitionSchema.parse(definition);
}
