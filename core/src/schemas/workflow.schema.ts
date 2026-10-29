import { z } from 'zod';
import { AbstractUiComponentSchema } from './ui-block.schema.js';

export const ConditionOperatorSchema = z.enum([
  'EQUALS',
  'NOT_EQUALS',
  'CONTAINS',
  'EXISTS',
  'IN',
  'GT',
  'LT',
]);
export type ConditionOperator = z.infer<typeof ConditionOperatorSchema>;

export const WorkflowConditionBranchSchema = z
  .object({
    variable: z.string().min(1),
    operator: ConditionOperatorSchema,
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
    nextNodeId: z.string().min(1),
  })
  .strict();
export type WorkflowConditionBranch = z.infer<typeof WorkflowConditionBranchSchema>;

export const SendMessageNodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('SEND_MESSAGE'),
    components: z.array(AbstractUiComponentSchema).min(1),
    nextNodeId: z.string().min(1).nullable(),
  })
  .strict();

export const InteractiveTransitionSchema = z
  .object({
    payloadId: z.string().min(1),
    nextNodeId: z.string().min(1),
    assignValue: z.string().optional(),
  })
  .strict();
export type InteractiveTransition = z.infer<typeof InteractiveTransitionSchema>;

export const AskInteractiveNodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('ASK_INTERACTIVE'),
    promptComponent: AbstractUiComponentSchema,
    saveToVariable: z.string().min(1).optional(),
    transitions: z.array(InteractiveTransitionSchema).min(1),
    repromptMessage: z.string().min(1).default('Please choose one of the available options above.'),
    maxInvalidAttempts: z.number().int().min(1).max(10).default(3),
    fallbackNodeId: z.string().min(1).nullable().default(null),
  })
  .strict();

export const AskTextValidatedNodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('ASK_TEXT_VALIDATED'),
    promptText: z.string().min(1).max(1024),
    validationFormat: z.enum(['TEXT', 'EMAIL', 'CPF', 'NUMERIC', 'PHONE_E164', 'REGEX']),
    regexPattern: z.string().optional(),
    saveToVariable: z.string().min(1),
    invalidPromptText: z
      .string()
      .min(1)
      .default('Invalid value provided. Please review your answer and try again.'),
    maxInvalidAttempts: z.number().int().min(1).max(10).default(3),
    nextNodeId: z.string().min(1).nullable(),
    fallbackNodeId: z.string().min(1).nullable().default(null),
  })
  .strict();

export const HttpRequestNodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('HTTP_REQUEST'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH']),
    urlTemplate: z.string().min(1),
    headers: z.record(z.string(), z.string()).default({}),
    bodyTemplate: z.record(z.string(), z.unknown()).optional(),
    timeoutMs: z.number().int().min(500).max(15_000).default(5000),
    responseVariable: z.string().min(1),
    onSuccessNodeId: z.string().min(1).nullable(),
    onErrorNodeId: z.string().min(1).nullable(),
  })
  .strict();

export const ConditionSwitchNodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('CONDITION_SWITCH'),
    branches: z.array(WorkflowConditionBranchSchema).min(1),
    defaultNodeId: z.string().min(1).nullable(),
  })
  .strict();

export const DelayTimerNodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('DELAY_TIMER'),
    delaySeconds: z.number().int().min(1).max(86_400),
    nextNodeId: z.string().min(1),
  })
  .strict();

export const HumanHandoffNodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('HUMAN_HANDOFF'),
    departmentQueue: z.string().min(1),
    announcementText: z
      .string()
      .min(1)
      .default('Transferring your conversation to a specialist. Please wait.'),
    summaryVariables: z.array(z.string()).default([]),
  })
  .strict();

export const WorkflowNodeSchema = z.discriminatedUnion('type', [
  SendMessageNodeSchema,
  AskInteractiveNodeSchema,
  AskTextValidatedNodeSchema,
  HttpRequestNodeSchema,
  ConditionSwitchNodeSchema,
  DelayTimerNodeSchema,
  HumanHandoffNodeSchema,
]);
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

export const WorkflowGlobalKeywordsSchema = z
  .object({
    optOutConfirmationText: z
      .string()
      .default('You have opted out of automated messages. Send MENU anytime to restart.'),
    resetMenuNodeId: z.string().min(1).optional(),
    humanHandoffKeywords: z.array(z.string().min(1)).default(['HUMANO', 'ATENDENTE', 'AGENT']),
    humanHandoffNodeId: z.string().min(1).optional(),
  })
  .strict();
export type WorkflowGlobalKeywords = z.infer<typeof WorkflowGlobalKeywordsSchema>;

export const WorkflowDefinitionSchema = z
  .object({
    workflowKey: z
      .string()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9-]+$/),
    version: z.number().int().positive(),
    name: z.string().min(2).max(120),
    description: z.string().max(500).optional(),
    entryNodeId: z.string().min(1),
    globalKeywords: WorkflowGlobalKeywordsSchema.default({
      optOutConfirmationText:
        'You have opted out of automated messages. Send MENU anytime to restart.',
      humanHandoffKeywords: ['HUMANO', 'ATENDENTE', 'AGENT'],
    }),
    nodes: z.array(WorkflowNodeSchema).min(1),
  })
  .strict()
  .superRefine((definition, ctx) => {
    const nodeIds = new Set(definition.nodes.map((node) => node.id));
    if (nodeIds.size !== definition.nodes.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['nodes'],
        message: 'Workflow node identifiers must be unique within a workflow definition.',
      });
    }
    if (!nodeIds.has(definition.entryNodeId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['entryNodeId'],
        message: `Entry node "${definition.entryNodeId}" does not exist in nodes array.`,
      });
    }
  });
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
