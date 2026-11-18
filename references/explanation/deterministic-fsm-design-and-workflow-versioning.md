# Explanation: Deterministic FSM Design and Workflow Versioning

This document explains why `@tupynambalucas-dev/omnichannel` models conversational flows as declarative, Zod-validated Finite State Machines (FSMs) rather than open-ended generative AI prompts, and how immutable workflow versioning prevents in-flight session corruption.

---

## 1. Why Deterministic Finite State Machines Over First-Tier Generative AI?

Enterprise commercial triage, cadastral verification (such as Brazilian CPF Modulo-11 checksums), and billing workflows require strict predictability:

1. **Zero Hallucination & Regulatory Auditability**: Every prompt, validation rule (`CPF`, `EMAIL`, `PHONE_E164`, `NUMERIC`, `REGEX`), and branch condition (`EQUALS`, `NOT_EQUALS`, `CONTAINS`, `EXISTS`, `IN`, `GT`, `LT`) is declared in a static JSONB graph (`WorkflowDefinitionSchema`) and executed without `eval()` or probabilistic inference.
2. **Sub-Millisecond State Evaluation**: Evaluating an `ASK_INTERACTIVE` payload transition or a Modulo-11 CPF checksum executes in microseconds with zero external LLM token cost or latency.
3. **Compile-Time & Publish-Time Graph Verification**: `WorkflowDefinitionSchema` verifies at publish time that every node ID is unique, `entryNodeId` exists in `nodes`, and every UI component respects Meta's character limits (`WHATSAPP_LIMITS` and `INSTAGRAM_LIMITS`).

---

## 2. Why Immutable Workflow Versioning (`workflow_definitions`) Prevents State Corruption

In a live multi-tenant environment, tenants frequently update their conversational menus while hundreds of customers are actively mid-conversation (`status: 'WAITING_INPUT'`).

If a workflow definition were mutated in place (`UPDATE workflow_definitions SET definition = ...`), a customer currently parked at `ask_customer_cpf` in version 1 would crash or lose context if version 2 renamed or removed that node.

To guarantee zero-downtime workflow updates:

1. **Immutable Version Rows**: Every call to `TenantRepository.publishWorkflow()` inserts a **new** row into `workflow_definitions` with its own UUIDv7 `id`, `(tenant_id, workflow_key, version)`, and `definition` JSONB.
2. **Channel Pointer Swap (`active_workflow_id`)**: Activating a workflow updates `tenant_channels.active_workflow_id` to point to the newly published `workflow_definitions.id`.
3. **In-Flight Session Pinning (`session.workflowId`)**: Each `ConversationSession` stores the exact `workflowId` and `workflowVersion` under which it started. Existing sessions continue executing against their pinned `workflowId` until completion, while new sessions bind to the newly activated workflow version.

---

## Canonical Upstream Sources

- Zod v4 Strict Object & SuperRefine Validation: `https://zod.dev/api` (Context7 `/colinhacks/zod/v4.6.5`, retrieved 2026-11-17)
- PostgreSQL 16 JSONB Indexing & Storage: `https://www.postgresql.org/docs/current/datatype-json.html` (retrieved 2026-11-17)
