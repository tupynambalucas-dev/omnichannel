# Workflow Definitions

This directory contains production-ready deterministic workflow definitions for `@tupynambalucas-dev/omnichannel-core`.

## Overview

The workflows defined in this directory are exported as type-safe data structures adhering to `WorkflowDefinitionSchema`. They represent multi-step conversational state machines capable of executing across WhatsApp Cloud API and Instagram Messaging API.

## Available Workflows

| Workflow Key                  | Export Function                  | Description                                                                                                               |
| :---------------------------- | :------------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| `enterprise-guided-prototype` | `buildGuidedPrototypeWorkflow()` | Guided customer service flow featuring CPF Modulo-11 validation, interactive checkbox/list menus, and specialist handoff. |

## Architectural Invariants

1. **Deterministic State Transitions**:
   Transitions between nodes must depend strictly on immutable payload identifiers (`payloadId`), never on localized visual titles.

2. **Channel Constraint Compliance**:
   All text fields, buttons, and interactive list options must strictly comply with WhatsApp Cloud API limits (e.g., button title `<= 20` characters, list row title `<= 24` characters, description `<= 72` characters).

3. **Runtime Schema Verification**:
   All workflow builder functions must execute `WorkflowDefinitionSchema.parse()` prior to returning definitions.
