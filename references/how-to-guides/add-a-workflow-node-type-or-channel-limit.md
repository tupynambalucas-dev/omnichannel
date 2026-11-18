# How-To Guide: Add a Workflow Node Type or Channel Limit

This guide shows how to extend `@tupynambalucas-dev/omnichannel-core` and `@tupynambalucas-dev/omnichannel-api` with a new deterministic FSM node type or platform limit while satisfying TypeScript Project References and `@typescript-eslint/switch-exhaustiveness-check`.

---

## 1. Register the Node Type Literal in `core/src/constants.ts`

Add the new uppercase node literal to `WORKFLOW_NODE_TYPES` in [`core/src/constants.ts`](../../core/src/constants.ts):

```typescript
export const WORKFLOW_NODE_TYPES = [
  'SEND_MESSAGE',
  'ASK_INTERACTIVE',
  'ASK_TEXT_VALIDATED',
  'HTTP_REQUEST',
  'CONDITION_SWITCH',
  'DELAY_TIMER',
  'HUMAN_HANDOFF',
] as const;
```

If adding a channel limit, add the constant to `WHATSAPP_LIMITS` or `INSTAGRAM_LIMITS` in the same file.

---

## 2. Define the Strict Zod v4 Node Schema in `core/src/schemas/workflow.schema.ts`

1. Author a `.strict()` Zod object schema with `id: z.string().min(1)` and `type: z.literal('<NEW_NODE_TYPE>')`.
2. Add the schema to the `WorkflowNodeSchema` discriminated union in [`core/src/schemas/workflow.schema.ts`](../../core/src/schemas/workflow.schema.ts).
3. Rebuild `@tupynambalucas-dev/omnichannel-core` so downstream project references pick up the new union member:

```bash
pnpm core:build
```

---

## 3. Implement the Exhaustive Handler in `api/src/domains/workflow/workflow.engine.ts`

Because `@typescript-eslint/switch-exhaustiveness-check` is set to `'error'` in [`eslint.config.ts`](../../eslint.config.ts), adding a union member to `WorkflowNode` immediately flags any non-exhaustive `switch (node.type)` statement in [`WorkflowEngine`](../../api/src/domains/workflow/workflow.engine.ts).

1. Implement the `case '<NEW_NODE_TYPE>':` branch inside `advanceWorkflowGraph()`.
2. Persist session state via `await this.sessionRepository.saveCheckpoint(...)` before performing any external I/O.
3. Add a simulation test in `api/test/` and update [`references/reference/declarative-fsm-workflow-schema.md`](../reference/declarative-fsm-workflow-schema.md).

---

## 4. Verify Build, Lint, and Tests

```bash
pnpm typecheck
pnpm lint
pnpm test
```

---

## Canonical Upstream Sources

- Declarative FSM Workflow Schema Reference: [`references/reference/declarative-fsm-workflow-schema.md`](../reference/declarative-fsm-workflow-schema.md)
- typescript-eslint `switch-exhaustiveness-check`: `https://typescript-eslint.io/rules/switch-exhaustiveness-check/` (retrieved 2026-11-17)
