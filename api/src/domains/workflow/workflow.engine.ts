import {
  generateUuidV7,
  GLOBAL_OPT_OUT_KEYWORDS,
  GLOBAL_RESET_KEYWORDS,
  validateConversationalInput,
} from '@tupynambalucas-dev/omnichannel-core';
import type {
  AbstractUiComponent,
  CanonicalInboundEnvelope,
  ConversationSession,
  OutboundDispatchJob,
  WorkflowDefinition,
  WorkflowNode,
} from '@tupynambalucas-dev/omnichannel-core';
import type { FastifyBaseLogger } from 'fastify';
import { interpolateTemplate } from '../compiler/template-interpolator.js';
import type { TenantRepository } from '../tenants/tenant.repository.js';
import { evaluateConditionBranches } from './condition-evaluator.js';
import type { SessionStateRepository } from './session-state.repository.js';

export type EnqueueOutboundDispatchFn = (job: OutboundDispatchJob) => Promise<void>;

export interface DelayedTimerSchedulePayload {
  tenantId: string;
  conversationKey: string;
  sessionId: string;
  targetNodeId: string;
  delaySeconds: number;
}

export type ScheduleDelayedTimerFn = (payload: DelayedTimerSchedulePayload) => Promise<void>;

const MAX_AUTO_STEPS_PER_TURN = 25;
const MESSAGING_WINDOW_MS = 24 * 60 * 60 * 1000;

export class WorkflowEngine {
  private readonly tenantRepository: TenantRepository;
  private readonly sessionRepository: SessionStateRepository;
  private readonly enqueueOutbound: EnqueueOutboundDispatchFn;
  private readonly scheduleDelayedTimer: ScheduleDelayedTimerFn;
  private readonly logger: FastifyBaseLogger;

  constructor(options: {
    tenantRepository: TenantRepository;
    sessionRepository: SessionStateRepository;
    enqueueOutbound: EnqueueOutboundDispatchFn;
    scheduleDelayedTimer: ScheduleDelayedTimerFn;
    logger: FastifyBaseLogger;
  }) {
    this.tenantRepository = options.tenantRepository;
    this.sessionRepository = options.sessionRepository;
    this.enqueueOutbound = options.enqueueOutbound;
    this.scheduleDelayedTimer = options.scheduleDelayedTimer;
    this.logger = options.logger;
  }

  private findNode(definition: WorkflowDefinition, nodeId: string): WorkflowNode | undefined {
    return definition.nodes.find((node) => node.id === nodeId);
  }

  private async emitComponents(
    session: ConversationSession,
    components: AbstractUiComponent[],
    idempotencySuffix: string,
  ): Promise<void> {
    const job: OutboundDispatchJob = {
      jobId: generateUuidV7(),
      tenantId: session.tenantId,
      sessionId: session.id,
      channel: session.channel,
      channelAccountId: session.channelAccountId,
      recipientId: session.endUserId,
      conversationKey: session.conversationKey,
      idempotencyKey: `${session.id}:v${String(session.stateVersion)}:${idempotencySuffix}`,
      components,
      variables: session.variables,
    };

    await this.enqueueOutbound(job);
  }

  /**
   * Processes an inbound normalized envelope for a single user conversation.
   */
  public async processInboundEnvelope(envelope: CanonicalInboundEnvelope): Promise<void> {
    const context = await this.tenantRepository.resolveInboundChannelContext(
      envelope.channel,
      envelope.channelAccountId,
    );

    if (context?.workflowRecord == null) {
      this.logger.warn(
        {
          channel: envelope.channel,
          channelAccountId: envelope.channelAccountId,
          providerMessageId: envelope.providerMessageId,
        },
        'No active tenant channel or workflow registered for inbound webhook event.',
      );
      return;
    }

    const { channelRecord, workflowRecord } = context;
    const definition = workflowRecord.definition;
    const now = new Date();
    const nowIso = now.toISOString();
    const windowExpiresIso = new Date(now.getTime() + MESSAGING_WINDOW_MS).toISOString();

    let session = await this.sessionRepository.getOrRehydrateSession(
      channelRecord.tenantId,
      envelope.conversationKey,
    );

    const isNewSession = session === null;

    if (session === null) {
      session = {
        id: generateUuidV7(),
        tenantId: channelRecord.tenantId,
        channel: envelope.channel,
        channelAccountId: envelope.channelAccountId,
        conversationKey: envelope.conversationKey,
        endUserId: envelope.endUserId,
        ...(envelope.endUserName !== undefined ? { endUserName: envelope.endUserName } : {}),
        workflowId: workflowRecord.id,
        workflowVersion: workflowRecord.version,
        currentNodeId: definition.entryNodeId,
        status: 'ACTIVE',
        variables: {
          contactName: envelope.endUserName ?? envelope.endUserHandle ?? 'Customer',
          channel: envelope.channel,
          endUserId: envelope.endUserId,
        },
        invalidAttempts: 0,
        lastInteractionAt: nowIso,
        windowExpiresAt: windowExpiresIso,
        stateVersion: 1,
      };

      await this.sessionRepository.recordOptInAudit({
        tenantId: channelRecord.tenantId,
        channel: envelope.channel,
        endUserId: envelope.endUserId,
        optedIn: true,
        source: envelope.referral !== undefined ? 'CLICK_TO_WHATSAPP_AD' : 'INBOUND_USER_MESSAGE',
        evidenceMetadata: {
          providerMessageId: envelope.providerMessageId,
        },
      });
    } else {
      session = {
        ...session,
        lastInteractionAt: nowIso,
        windowExpiresAt: windowExpiresIso,
        variables: {
          ...session.variables,
          ...(envelope.endUserName !== undefined ? { contactName: envelope.endUserName } : {}),
        },
      };
    }

    const normalizedKeyword = (envelope.text ?? '').trim().toUpperCase();

    // 1. Global Opt-Out Interceptor (STOP / SAIR / PARAR / CANCELAR / UNSUBSCRIBE)
    if (
      normalizedKeyword.length > 0 &&
      (GLOBAL_OPT_OUT_KEYWORDS as readonly string[]).includes(normalizedKeyword)
    ) {
      session = await this.sessionRepository.saveCheckpoint({
        ...session,
        status: 'OPTED_OUT',
        invalidAttempts: 0,
      });

      await this.sessionRepository.recordOptInAudit({
        tenantId: session.tenantId,
        channel: session.channel,
        endUserId: session.endUserId,
        optedIn: false,
        source: 'USER_STOP_KEYWORD',
        evidenceMetadata: {
          keyword: normalizedKeyword,
          providerMessageId: envelope.providerMessageId,
        },
      });

      await this.emitComponents(
        session,
        [
          {
            kind: 'TEXT',
            body: definition.globalKeywords.optOutConfirmationText,
            previewUrl: false,
          },
        ],
        'opt-out-ack',
      );
      return;
    }

    // 2. Global Reset Interceptor (MENU / INICIO / REINICIAR / START)
    if (
      normalizedKeyword.length > 0 &&
      (GLOBAL_RESET_KEYWORDS as readonly string[]).includes(normalizedKeyword)
    ) {
      const resetNodeId = definition.globalKeywords.resetMenuNodeId ?? definition.entryNodeId;
      session = await this.sessionRepository.saveCheckpoint({
        ...session,
        workflowId: workflowRecord.id,
        workflowVersion: workflowRecord.version,
        currentNodeId: resetNodeId,
        status: 'ACTIVE',
        invalidAttempts: 0,
      });

      await this.advanceWorkflowGraph(session, definition);
      return;
    }

    // 3. Global Human Handoff Keyword Interceptor
    const handoffKeywordsUpper = definition.globalKeywords.humanHandoffKeywords.map((kw) =>
      kw.toUpperCase(),
    );
    if (
      normalizedKeyword.length > 0 &&
      definition.globalKeywords.humanHandoffNodeId !== undefined &&
      handoffKeywordsUpper.includes(normalizedKeyword)
    ) {
      session = await this.sessionRepository.saveCheckpoint({
        ...session,
        currentNodeId: definition.globalKeywords.humanHandoffNodeId,
        status: 'ACTIVE',
        invalidAttempts: 0,
      });

      await this.advanceWorkflowGraph(session, definition);
      return;
    }

    // 4. Respect Human Handoff & Opt-Out Locks
    if (session.status === 'HUMAN_HANDOFF' || session.status === 'OPTED_OUT') {
      await this.sessionRepository.saveCheckpoint(session);
      return;
    }

    // 5. Restart completed sessions on fresh inbound interaction
    if (!isNewSession && session.status === 'COMPLETED') {
      session = {
        ...session,
        workflowId: workflowRecord.id,
        workflowVersion: workflowRecord.version,
        currentNodeId: definition.entryNodeId,
        status: 'ACTIVE',
        invalidAttempts: 0,
      };
    }

    // 6. Consume Pending User Input if Session is Waiting at an Interactive or Validated Node
    if (!isNewSession && session.status === 'WAITING_INPUT') {
      const waitingNode = this.findNode(definition, session.currentNodeId);
      if (waitingNode === undefined) {
        session = {
          ...session,
          currentNodeId: definition.entryNodeId,
          status: 'ACTIVE',
          invalidAttempts: 0,
        };
      } else if (waitingNode.type === 'ASK_INTERACTIVE') {
        const matchedTransition = this.resolveInteractiveSelection(waitingNode, envelope);

        if (matchedTransition === undefined) {
          const attempts = session.invalidAttempts + 1;
          if (attempts >= waitingNode.maxInvalidAttempts && waitingNode.fallbackNodeId !== null) {
            session = await this.sessionRepository.saveCheckpoint({
              ...session,
              currentNodeId: waitingNode.fallbackNodeId,
              status: 'ACTIVE',
              invalidAttempts: 0,
            });
            await this.advanceWorkflowGraph(session, definition);
            return;
          }

          session = await this.sessionRepository.saveCheckpoint({
            ...session,
            invalidAttempts: attempts,
          });

          await this.emitComponents(
            session,
            [
              {
                kind: 'TEXT',
                body: waitingNode.repromptMessage,
                previewUrl: false,
              },
              waitingNode.promptComponent,
            ],
            `reprompt-${String(attempts)}`,
          );
          return;
        }

        const updatedVariables: Record<string, unknown> = { ...session.variables };
        if (waitingNode.saveToVariable !== undefined) {
          updatedVariables[waitingNode.saveToVariable] =
            matchedTransition.assignValue ?? matchedTransition.payloadId;
        }

        session = await this.sessionRepository.saveCheckpoint({
          ...session,
          currentNodeId: matchedTransition.nextNodeId,
          status: 'ACTIVE',
          invalidAttempts: 0,
          variables: updatedVariables,
        });
      } else if (waitingNode.type === 'ASK_TEXT_VALIDATED') {
        const outcome = validateConversationalInput(
          envelope.text ?? '',
          waitingNode.validationFormat,
          waitingNode.regexPattern,
        );

        if (!outcome.valid) {
          const attempts = session.invalidAttempts + 1;
          if (attempts >= waitingNode.maxInvalidAttempts && waitingNode.fallbackNodeId !== null) {
            session = await this.sessionRepository.saveCheckpoint({
              ...session,
              currentNodeId: waitingNode.fallbackNodeId,
              status: 'ACTIVE',
              invalidAttempts: 0,
            });
            await this.advanceWorkflowGraph(session, definition);
            return;
          }

          session = await this.sessionRepository.saveCheckpoint({
            ...session,
            invalidAttempts: attempts,
          });

          await this.emitComponents(
            session,
            [
              {
                kind: 'TEXT',
                body: waitingNode.invalidPromptText,
                previewUrl: false,
              },
            ],
            `invalid-${String(attempts)}`,
          );
          return;
        }

        const updatedVariables: Record<string, unknown> = {
          ...session.variables,
          [waitingNode.saveToVariable]: outcome.normalizedValue,
        };

        if (waitingNode.nextNodeId === null) {
          await this.sessionRepository.saveCheckpoint({
            ...session,
            status: 'COMPLETED',
            invalidAttempts: 0,
            variables: updatedVariables,
          });
          return;
        }

        session = await this.sessionRepository.saveCheckpoint({
          ...session,
          currentNodeId: waitingNode.nextNodeId,
          status: 'ACTIVE',
          invalidAttempts: 0,
          variables: updatedVariables,
        });
      }
    }

    await this.advanceWorkflowGraph(session, definition);
  }

  /**
   * Resumes a `DELAY_TIMER` session scheduled in BullMQ.
   */
  public async resumeDelayedSession(params: {
    tenantId: string;
    conversationKey: string;
    targetNodeId: string;
  }): Promise<void> {
    const session = await this.sessionRepository.getOrRehydrateSession(
      params.tenantId,
      params.conversationKey,
    );

    if (session?.status !== 'DELAYED') {
      return;
    }

    const workflowRecord = await this.tenantRepository.getWorkflowById(
      session.tenantId,
      session.workflowId,
    );
    if (workflowRecord === null) {
      return;
    }

    const activeSession = await this.sessionRepository.saveCheckpoint({
      ...session,
      currentNodeId: params.targetNodeId,
      status: 'ACTIVE',
    });

    await this.advanceWorkflowGraph(activeSession, workflowRecord.definition);
  }

  private resolveInteractiveSelection(
    node: Extract<WorkflowNode, { type: 'ASK_INTERACTIVE' }>,
    envelope: CanonicalInboundEnvelope,
  ) {
    // Primary deterministic route: match immutable payload ID from button_reply / list_reply / quick_reply / postback
    if (envelope.interactiveReply !== undefined) {
      const byPayload = node.transitions.find(
        (t) => t.payloadId === envelope.interactiveReply?.payloadId,
      );
      if (byPayload !== undefined) {
        return byPayload;
      }
    }

    // Secondary fallback: if end-user typed exact option ID or button title manually
    const typedText = (envelope.text ?? '').trim().toLowerCase();
    if (typedText.length === 0) {
      return undefined;
    }

    const directIdMatch = node.transitions.find((t) => t.payloadId.toLowerCase() === typedText);
    if (directIdMatch !== undefined) {
      return directIdMatch;
    }

    if (
      node.promptComponent.kind === 'QUICK_CHOICES' ||
      node.promptComponent.kind === 'MENU_CHOICES'
    ) {
      const matchingOption = node.promptComponent.options.find(
        (opt) => opt.title.trim().toLowerCase() === typedText,
      );
      if (matchingOption !== undefined) {
        return node.transitions.find((t) => t.payloadId === matchingOption.id);
      }
    }

    return undefined;
  }

  /**
   * Executes synchronous/auto-advancing FSM nodes until reaching a user-wait state, timer, handoff, or completion.
   */
  private async advanceWorkflowGraph(
    initialSession: ConversationSession,
    definition: WorkflowDefinition,
  ): Promise<void> {
    let session = initialSession;

    for (let step = 0; step < MAX_AUTO_STEPS_PER_TURN; step += 1) {
      const node = this.findNode(definition, session.currentNodeId);
      if (node === undefined) {
        this.logger.error(
          { sessionId: session.id, missingNodeId: session.currentNodeId },
          'Workflow node missing; marking session COMPLETED.',
        );
        await this.sessionRepository.saveCheckpoint({
          ...session,
          status: 'COMPLETED',
        });
        return;
      }

      switch (node.type) {
        case 'SEND_MESSAGE': {
          await this.emitComponents(session, node.components, `send-${node.id}`);
          if (node.nextNodeId === null) {
            await this.sessionRepository.saveCheckpoint({
              ...session,
              status: 'COMPLETED',
            });
            return;
          }
          session = await this.sessionRepository.saveCheckpoint({
            ...session,
            currentNodeId: node.nextNodeId,
            status: 'ACTIVE',
          });
          break;
        }

        case 'ASK_INTERACTIVE': {
          session = await this.sessionRepository.saveCheckpoint({
            ...session,
            currentNodeId: node.id,
            status: 'WAITING_INPUT',
            invalidAttempts: 0,
          });
          await this.emitComponents(session, [node.promptComponent], `ask-ui-${node.id}`);
          return;
        }

        case 'ASK_TEXT_VALIDATED': {
          session = await this.sessionRepository.saveCheckpoint({
            ...session,
            currentNodeId: node.id,
            status: 'WAITING_INPUT',
            invalidAttempts: 0,
          });
          await this.emitComponents(
            session,
            [{ kind: 'TEXT', body: node.promptText, previewUrl: false }],
            `ask-text-${node.id}`,
          );
          return;
        }

        case 'CONDITION_SWITCH': {
          const matchedNodeId =
            evaluateConditionBranches(node.branches, session.variables) ?? node.defaultNodeId;
          if (matchedNodeId === null) {
            await this.sessionRepository.saveCheckpoint({
              ...session,
              status: 'COMPLETED',
            });
            return;
          }
          session = await this.sessionRepository.saveCheckpoint({
            ...session,
            currentNodeId: matchedNodeId,
            status: 'ACTIVE',
          });
          break;
        }

        case 'HTTP_REQUEST': {
          // Persist checkpoint BEFORE invoking external HTTP service to avoid state loss on crash
          session = await this.sessionRepository.saveCheckpoint({
            ...session,
            currentNodeId: node.id,
            status: 'ACTIVE',
          });

          const resolvedUrl = interpolateTemplate(node.urlTemplate, session.variables);
          const resolvedHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          for (const [headerName, headerVal] of Object.entries(node.headers)) {
            resolvedHeaders[headerName] = interpolateTemplate(headerVal, session.variables);
          }

          let nextNodeId: string | null;
          const updatedVariables: Record<string, unknown> = { ...session.variables };

          try {
            const serializedBody =
              node.method !== 'GET' && node.bodyTemplate !== undefined
                ? interpolateTemplate(JSON.stringify(node.bodyTemplate), session.variables)
                : undefined;

            const response = await fetch(resolvedUrl, {
              method: node.method,
              headers: resolvedHeaders,
              body: serializedBody,
              signal: AbortSignal.timeout(node.timeoutMs),
            });

            const textPayload = await response.text();
            let parsedResponse: unknown = textPayload;
            if (textPayload.length > 0) {
              try {
                parsedResponse = JSON.parse(textPayload) as unknown;
              } catch {
                parsedResponse = textPayload;
              }
            }

            updatedVariables[node.responseVariable] = {
              status: response.status,
              ok: response.ok,
              data: parsedResponse,
            };

            nextNodeId = response.ok ? node.onSuccessNodeId : node.onErrorNodeId;
          } catch (error) {
            updatedVariables[node.responseVariable] = {
              status: 0,
              ok: false,
              error: error instanceof Error ? error.message : 'HTTP_REQUEST_ERROR',
            };
            nextNodeId = node.onErrorNodeId;
          }

          if (nextNodeId === null) {
            await this.sessionRepository.saveCheckpoint({
              ...session,
              status: 'COMPLETED',
              variables: updatedVariables,
            });
            return;
          }

          session = await this.sessionRepository.saveCheckpoint({
            ...session,
            currentNodeId: nextNodeId,
            status: 'ACTIVE',
            variables: updatedVariables,
          });
          break;
        }

        case 'DELAY_TIMER': {
          session = await this.sessionRepository.saveCheckpoint({
            ...session,
            currentNodeId: node.nextNodeId,
            status: 'DELAYED',
          });

          await this.scheduleDelayedTimer({
            tenantId: session.tenantId,
            conversationKey: session.conversationKey,
            sessionId: session.id,
            targetNodeId: node.nextNodeId,
            delaySeconds: node.delaySeconds,
          });
          return;
        }

        case 'HUMAN_HANDOFF': {
          const handoffSummary: Record<string, unknown> = {};
          for (const variableKey of node.summaryVariables) {
            handoffSummary[variableKey] = session.variables[variableKey];
          }

          session = await this.sessionRepository.saveCheckpoint({
            ...session,
            currentNodeId: node.id,
            status: 'HUMAN_HANDOFF',
            variables: {
              ...session.variables,
              handoffDepartmentQueue: node.departmentQueue,
              handoffSummary,
            },
          });

          await this.emitComponents(
            session,
            [{ kind: 'TEXT', body: node.announcementText, previewUrl: false }],
            `handoff-${node.id}`,
          );
          return;
        }
      }
    }

    this.logger.warn(
      { sessionId: session.id, workflowId: session.workflowId },
      'Maximum synchronous workflow transitions reached in a single turn; halting safely.',
    );
  }
}
