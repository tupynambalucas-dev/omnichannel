# `@tupynambalucas-dev/omnichannel-core`

Shared Zod v4 domain contracts, canonical webhook normalization schemas, channel-neutral UI component descriptors, deterministic FSM workflow definitions, and pure validation utilities for `@tupynambalucas-dev/omnichannel`.

---

## Overview

`@tupynambalucas-dev/omnichannel-core` establishes a strict, zero-IO boundary between provider-specific webhook wire formats and internal workflow execution. Every inbound webhook message, outbound UI block, tenant channel binding, and FSM state checkpoint is validated through this package's schemas.

---

## Exported Modules Catalog

| Module                                          | Primary Exports                                                                                                                                       | Responsibility                                                                                            |
| :---------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `src/constants.ts`                              | `WHATSAPP_LIMITS`, `INSTAGRAM_LIMITS`, `META_ERROR_CODES`, `QUEUE_NAMES`, `REDIS_TTL_SECONDS`, `GLOBAL_OPT_OUT_KEYWORDS`, `GLOBAL_RESET_KEYWORDS`     | Authoritative platform character caps, error code constants, Redis TTLs, and BullMQ queue identifiers.    |
| `src/schemas/envelope.schema.ts`                | `CanonicalInboundEnvelopeSchema`, `DeliveryStatusEventSchema`, `MetaWebhookVerifyQuerySchema`, `MetaWebhookPayloadSchema`                             | Normalizes WhatsApp Cloud API and Instagram Messaging API events into a single canonical contract.        |
| `src/schemas/ui-block.schema.ts`                | `AbstractUiComponentSchema`, `OutboundDispatchJobSchema`, `TextBlockSchema`, `QuickChoicesBlockSchema`, `MenuChoicesBlockSchema`, `CtaUrlBlockSchema` | Defines polymorphic UI blocks (`TEXT`, `QUICK_CHOICES`, `MENU_CHOICES`, `CTA_URL`, `CAROUSEL_CARDS`).     |
| `src/schemas/workflow.schema.ts`                | `WorkflowNodeSchema`, `WorkflowDefinitionSchema`, `InteractiveTransitionSchema`, `WorkflowConditionBranchSchema`                                      | Validates the 7 deterministic FSM node types and enforces entry-node and unique-ID graph invariants.      |
| `src/schemas/session.schema.ts`                 | `ConversationSessionSchema`, `OptInAuditRecordSchema`, `SessionStatusSchema`, `OptInSourceSchema`                                                     | Models versioned conversation checkpoints, 24-hour messaging windows, and LGPD/GDPR opt-in audit records. |
| `src/schemas/tenant.schema.ts`                  | `CreateTenantRequestSchema`, `RegisterChannelRequestSchema`, `PublishWorkflowRequestSchema`, `TenantRecordSchema`, `WorkflowVersionRecordSchema`      | Validates multi-tenant onboarding, secret-reference channel bindings, and workflow publishing payloads.   |
| `src/utils/uuidv7.ts`                           | `generateUuidV7`                                                                                                                                      | Generates RFC 9562 time-ordered UUIDv7 keys optimized for PostgreSQL B-Tree locality.                     |
| `src/utils/validators.ts`                       | `isValidBrazilianCpf`, `validateConversationalInput`                                                                                                  | Validates user-entered `CPF` (Modulo-11), `EMAIL`, `PHONE_E164`, `NUMERIC`, `TEXT`, and `REGEX` inputs.   |
| `src/workflows/standard-onboarding.workflow.ts` | `buildStandardOnboardingWorkflow`                                                                                                                     | Production onboarding and commercial/technical qualification workflow (`enterprise-standard-onboarding`). |
| `src/workflows/guided-prototype.workflow.ts`    | `buildGuidedPrototypeWorkflow`                                                                                                                        | Enterprise guided conversational prototype workflow (`enterprise-guided-prototype`).                      |

---

## Canonical Workflow Definitions (`src/workflows/`)

Both exported workflow builders validate their return payloads at runtime via `WorkflowDefinitionSchema.parse()` and route interactive transitions strictly on immutable `payloadId` identifiers:

| Workflow Key                     | Builder Function                    | Entry Node     | Key Capabilities                                                                                                                                                                                                           |
| :------------------------------- | :---------------------------------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enterprise-standard-onboarding` | `buildStandardOnboardingWorkflow()` | `welcome_menu` | Initial greeting (`QUICK_CHOICES`), solutions catalog (`MENU_CHOICES`), Brazilian CPF Modulo-11 validation (`ASK_TEXT_VALIDATED`), priority triage, summary review, protocol emission with `CTA_URL`, and `HUMAN_HANDOFF`. |
| `enterprise-guided-prototype`    | `buildGuidedPrototypeWorkflow()`    | `welcome_menu` | Greeting menu (`QUICK_CHOICES`), upfront CPF Modulo-11 validation (`ASK_TEXT_VALIDATED`), two-stage interactive list selection (`services_menu`, `request_type_menu`), confirmation review, and specialist handoff.        |

---

## Building and Running

```bash
# Compile TypeScript declarations and JavaScript output to dist/
pnpm --filter @tupynambalucas-dev/omnichannel-core build

# Run strict typechecking
pnpm --filter @tupynambalucas-dev/omnichannel-core typecheck

# Run strict ESLint rules
pnpm --filter @tupynambalucas-dev/omnichannel-core lint
```

---

## Navigation

- Parent Workspace: [Omnichannel Monorepo Root](../README.md)
- Sibling Service: [`@tupynambalucas-dev/omnichannel-api`](../api/README.md)
- Reference Spec: [Declarative FSM Workflow Schema](../references/reference/declarative-fsm-workflow-schema.md)
