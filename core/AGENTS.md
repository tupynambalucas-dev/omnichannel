<context-hierarchy>
  <parent src="../AGENTS.md" type="global-rules" />
  <system-instruction>
    AGENT: You are operating in the core bounded context (@tupynambalucas-dev/omnichannel-core). If you have not read ../AGENTS.md in this session, stop now and read it using your file-reading tools before proceeding.
  </system-instruction>
</context-hierarchy>

# Local Context: Omnichannel Core (`@tupynambalucas-dev/omnichannel-core`)

Pure, runtime-agnostic TypeScript contract library housing Zod v4 schemas, channel limits, UUIDv7 generators, input validators, and Finite State Machine (FSM) workflow definitions shared across the omnichannel monorepo.

## Directory Layout

- [README.md](./README.md): Package overview, exported contracts catalog, workflow catalog, and build commands.
- [package.json](./package.json) / [tsconfig.json](./tsconfig.json): Package manifest and composite TypeScript configuration.
- [src/index.ts](./src/index.ts): Public barrel entrypoint re-exporting all schemas, types, constants, utilities, and workflows.
- [src/constants.ts](./src/constants.ts): Platform limits (`WHATSAPP_LIMITS`, `INSTAGRAM_LIMITS`), `META_ERROR_CODES`, `QUEUE_NAMES`, `REDIS_TTL_SECONDS`, `SESSION_STATUSES`, `WORKFLOW_NODE_TYPES`, `GLOBAL_OPT_OUT_KEYWORDS`, and `GLOBAL_RESET_KEYWORDS`.
- [src/schemas/envelope.schema.ts](./src/schemas/envelope.schema.ts): `CanonicalInboundEnvelopeSchema`, `DeliveryStatusEventSchema`, `MetaWebhookVerifyQuerySchema`, and `MetaWebhookPayloadSchema`.
- [src/schemas/ui-block.schema.ts](./src/schemas/ui-block.schema.ts): Channel-neutral `AbstractUiComponentSchema` (`TEXT`, `QUICK_CHOICES`, `MENU_CHOICES`, `CTA_URL`, `CAROUSEL_CARDS`) and `OutboundDispatchJobSchema`.
- [src/schemas/workflow.schema.ts](./src/schemas/workflow.schema.ts): Discriminated union of all 7 deterministic FSM node types and `WorkflowDefinitionSchema` graph integrity refinements.
- [src/schemas/session.schema.ts](./src/schemas/session.schema.ts): `ConversationSessionSchema` and `OptInAuditRecordSchema`.
- [src/schemas/tenant.schema.ts](./src/schemas/tenant.schema.ts): Multi-tenant onboarding, channel binding (`accessTokenSecretRef`), and immutable workflow publication contracts.
- [src/utils/uuidv7.ts](./src/utils/uuidv7.ts): RFC 9562 time-ordered UUIDv7 generator (`generateUuidV7`).
- [src/utils/validators.ts](./src/utils/validators.ts): Deterministic conversational input validators (`CPF` Modulo-11 checksum, `EMAIL`, `PHONE_E164`, `NUMERIC`, `REGEX`, `TEXT`).
- [src/workflows/standard-onboarding.workflow.ts](./src/workflows/standard-onboarding.workflow.ts): Production onboarding and commercial/technical qualification workflow (`enterprise-standard-onboarding`).
- [src/workflows/guided-prototype.workflow.ts](./src/workflows/guided-prototype.workflow.ts): Guided customer service prototype workflow (`enterprise-guided-prototype`).

## Architecture & Pipeline

1. **Contract Layer**: All schemas are defined with Zod v4 `.strict()` objects and discriminated unions (`z.discriminatedUnion`) and exported from `src/index.ts`.
2. **Graph Integrity Refinement**: `WorkflowDefinitionSchema` validates at parse time that all `node.id` values are unique and that `entryNodeId` exists in `nodes`.
3. **Declarative Workflow Builders**: Functions in `src/workflows/*.workflow.ts` construct strongly-typed `WorkflowDefinition` graphs and invoke `WorkflowDefinitionSchema.parse()` before returning so invalid character lengths or broken node references fail immediately.

## Operational & Security Guardrails

1. **Zero Infrastructure Coupling**: `core` MUST NEVER import `fastify`, `@fastify/*`, `pg`, `ioredis`, `bullmq`, `mongoose`, `@sentry/*`, `pino*`, or access `process.env`. Only `zod` and built-in `node:crypto` are permitted (enforced by `no-restricted-imports` and `no-restricted-properties` in `../eslint.config.ts`).
2. **Strict ESLint Boundary Rules**: Every function in `core/**/*.ts` MUST declare explicit parameter types, explicit return types (`explicit-function-return-type`, `explicit-module-boundary-types`), and explicit boolean expressions (`strict-boolean-expressions`).
3. **Zod v4 Idioms**: Use Zod v4 top-level string formats (`z.uuid()`, `z.url()`, `z.iso.datetime()`), two-argument `z.record(z.string(), valueSchema)`, `.strict()` object validation, and `z.discriminatedUnion`.
4. **Workflow Authoring Invariants**:
   - Interactive transitions in `ASK_INTERACTIVE` nodes MUST bind exclusively to immutable `payloadId` strings, never localized visual button titles.
   - All text fields, button labels, and list rows MUST comply with `WHATSAPP_LIMITS` (`MAX_BUTTON_TITLE_LENGTH = 20`, `MAX_LIST_ROW_TITLE_LENGTH = 24`, `MAX_LIST_ROW_DESCRIPTION_LENGTH = 72`, `MAX_HEADER_TEXT_LENGTH = 60`, `MAX_FOOTER_TEXT_LENGTH = 60`).
   - Do not create child `AGENTS.md` or `README.md` files inside `src/`.

## Required Skills

- **`monorepo-architect`**: Active when modifying `package.json` or `tsconfig.json`.
- **`documentation-researcher`**: Active when verifying Zod v4 schema APIs via Context7.
- **`readme-architect` / `router-architect`**: Active when updating `core/README.md` or `core/AGENTS.md`.
