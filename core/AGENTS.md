<context-hierarchy>
  <parent src="../AGENTS.md" type="global-rules" />
  <system-instruction>
    AGENT: You are operating in the core bounded context (@tupynambalucas-dev/omnichannel-core). If you have not read ../AGENTS.md in this session, stop now and read it using your file-reading tools before proceeding.
  </system-instruction>
</context-hierarchy>

# Local Context: Omnichannel Core (`@tupynambalucas-dev/omnichannel-core`)

Pure, runtime-agnostic TypeScript contract library housing Zod v4 schemas, channel limits, UUIDv7 generators, input validators, and Finite State Machine (FSM) workflow definitions shared across the omnichannel monorepo.

## Directory Layout

- [README.md](./README.md): Package overview, exported contracts catalog, and build commands.
- [src/index.ts](./src/index.ts): Public barrel entrypoint re-exporting all schemas, types, constants, and utilities.
- [src/constants.ts](./src/constants.ts): Platform limits (`WHATSAPP_LIMITS`, `INSTAGRAM_LIMITS`), `META_ERROR_CODES`, `QUEUE_NAMES`, and global compliance keywords.
- [src/schemas/envelope.schema.ts](./src/schemas/envelope.schema.ts): `CanonicalInboundEnvelopeSchema`, `DeliveryStatusEventSchema`, and Meta webhook payload schemas.
- [src/schemas/ui-block.schema.ts](./src/schemas/ui-block.schema.ts): Channel-neutral `AbstractUiComponentSchema` (`TEXT`, `QUICK_CHOICES`, `MENU_CHOICES`, `CTA_URL`, `CAROUSEL_CARDS`) and `OutboundDispatchJobSchema`.
- [src/schemas/workflow.schema.ts](./src/schemas/workflow.schema.ts): Discriminated union of all 7 deterministic FSM node types and `WorkflowDefinitionSchema` graph integrity refinements.
- [src/schemas/session.schema.ts](./src/schemas/session.schema.ts): `ConversationSessionSchema` and `OptInAuditRecordSchema`.
- [src/schemas/tenant.schema.ts](./src/schemas/tenant.schema.ts): Multi-tenant onboarding, channel binding, and immutable workflow publication contracts.
- [src/utils/uuidv7.ts](./src/utils/uuidv7.ts): RFC 9562 time-ordered UUIDv7 generator.
- [src/utils/validators.ts](./src/utils/validators.ts): Deterministic conversational input validators (`CPF` Modulo-11 checksum, `EMAIL`, `PHONE_E164`, `NUMERIC`, `REGEX`).

## Architecture & Guardrails

1. **Zero Infrastructure Coupling**: `core` MUST NEVER import `fastify`, `pg`, `ioredis`, `bullmq`, `mongoose`, or `process.env`. Only `zod` and built-in `node:crypto` are permitted.
2. **Strict ESLint Boundary Rules**: Every exported function in `core/**/*.ts` MUST declare explicit parameter types, explicit return types (`explicit-module-boundary-types`), and explicit boolean expressions (`strict-boolean-expressions`).
3. **Zod v4 Idioms**: Use Zod v4 top-level string formats (`z.uuid()`, `z.url()`, `z.iso.datetime()`), two-argument `z.record(z.string(), valueSchema)`, `.strict()` object validation, and `z.discriminatedUnion`.

## Required Skills

- **`monorepo-architect`**: Active when modifying `package.json` or `tsconfig.json`.
- **`documentation-researcher`**: Active when verifying Zod v4 schema APIs via Context7.
