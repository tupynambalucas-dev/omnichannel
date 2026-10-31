# Workflows Subsystem Agent Context

This document serves as the bounded context router for agents authoring and modifying workflow definitions in `@tupynambalucas-dev/omnichannel-core`.

## Navigation

- [Parent Core Subsystem](../README.md): Primary documentation for `@tupynambalucas-dev/omnichannel-core`.
- [Directory README](./README.md): Workflow architectural catalog and invariants.
- [Guided Prototype](./guided-prototype.workflow.ts): Canonical implementation of the enterprise guided conversation prototype.

## Subsystem Invariants

1. **Schema Validation**:
   Every exported workflow definition MUST pass `WorkflowDefinitionSchema.parse()` without validation errors.

2. **Payload-Driven Transitions**:
   Transitions within `ASK_INTERACTIVE` nodes MUST bind to static `payloadId` constants rather than dynamic text.

3. **Character Limits**:
   Adhere to WhatsApp limits defined in `../constants.ts` (`WHATSAPP_LIMITS`):
   - Button title: maximum 20 characters.
   - List row title: maximum 24 characters.
   - List row description: maximum 72 characters.
   - Header text: maximum 60 characters.

4. **Zero-Emoji Policy**:
   Never include emojis in workflow node texts, option titles, or comments.
