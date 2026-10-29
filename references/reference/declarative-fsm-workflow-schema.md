# Reference: Declarative FSM Workflow Schema Specification

Formal specification for the **Declarative JSONB State Machine** (`schemaVersion: "2.0"`) validated by `@tupynambalucas-dev/omnichannel-core` (`WorkflowDefinitionSchema`) and executed by `WorkflowEngine`.

---

## 1. Root Contract Structure

| Property         | Type                           | Required | Description                                                                                                                                              |
| :--------------- | :----------------------------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`  | `"2.0"`                        | Yes      | Contract version literal.                                                                                                                                |
| `tenantId`       | `string (UUID)`                | Yes      | Owning corporate tenant identifier.                                                                                                                      |
| `workflowId`     | `string`                       | Yes      | Logical workflow slug (e.g., `wf_financial_support_v3`).                                                                                                 |
| `initialNodeId`  | `string`                       | Yes      | Entry node ID executed when a new session starts; must exist in `nodes`.                                                                                 |
| `globalKeywords` | `Record<string, string>`       | No       | Case-insensitive global commands (e.g., `"STOP"`, `"SAIR"`, `"MENU"`) evaluated **before** current-node transitions for instant Meta opt-out compliance. |
| `nodes`          | `Record<string, WorkflowNode>` | Yes      | Map of node IDs to strongly-typed `WorkflowNode` discriminated union objects.                                                                            |

---

## 2. Closed Node Handler Catalog (`type` Discriminator)

### 2.1 `SEND_MESSAGE`

Renders an abstract UI block (`TEXT`, `CTA_URL`, or `CAROUSEL`), interpolates context variables, enqueues outbound delivery, and immediately follows its `AUTO` transition without pausing for user input.

### 2.2 `ASK_INTERACTIVE`

Renders interactive choices (`1..3` buttons or `4..10` list items / `1..13` Instagram quick replies) and sets session status to `WAITING_INPUT`.

- Routes **exclusively** on `input.payload` (immutable logical option ID), never on visible button text.
- On unrecognized free-text input, increments `retryCount`, dispatches `fallbackPrompt`, and redirects to `onMaxAttemptsNode` once `maxInvalidAttempts` is reached.

### 2.3 `ASK_TEXT_VALIDATED`

Prompts the user for structured free-text input and validates deterministically using:

- `REGEX` (custom regular expression pattern)
- `CPF` (Brazilian 11-digit Modulo-11 check-digit verification)
- `EMAIL` (RFC-compliant email format)
- `NON_EMPTY` (trimmed non-blank string)
  Valid values are stored into `session.variables[saveToVariable]` and trigger `VALID_INPUT`. Invalid inputs emit `errorPrompt` up to `maxInvalidAttempts`.

### 2.4 `HTTP_REQUEST`

Executes an outbound HTTP call (`GET`, `POST`, `PUT`, `PATCH`) against a tenant's external ERP/CRM endpoint with interpolated URL, headers, and JSON body.

- Maps JSON dot-path fields from the response into `session.variables` via `responseMapping`.
- `2xx` responses evaluate `HTTP_SUCCESS` transitions.
- `4xx` business responses (`400`, `404`, `422`) evaluate `HTTP_ERROR` transitions cleanly.
- Network timeouts or `5xx` errors throw retriable exceptions to BullMQ **before** mutating `currentNodeId`.

### 2.5 `CONDITION_SWITCH`

Silent logical branching node that evaluates deterministic expressions over `session.variables` in declaration order and falls back to a mandatory `defaultTargetNode`.

### 2.6 `DELAY_TIMER`

Schedules a delayed BullMQ job (`delayMs`) on `omnichannel-workflow-timers`. When the timer fires, the worker verifies the session is still parked on the exact same node and sequence number before following `TIMER_EXPIRED` (discarding the timer if the customer already replied).

### 2.7 `HUMAN_HANDOFF`

Transitions session `status` to `HUMAN_AGENT`, optionally sends a closing handoff notice (`handoffMessage`), and suspends automated FSM responses until an operator resolves the ticket.

---

## 3. Deterministic Condition Syntax

To eliminate arbitrary code execution risks (`eval` is strictly forbidden), transition conditions use a deterministic comparison grammar:

- Equality / Inequality:
  - `input.payload == 'opt_invoice'`
  - `session.variables.has_open_invoice == true`
  - `session.variables.tier != 'blocked'`
- Numeric comparisons:
  - `session.variables.overdue_days > 30`
  - `session.variables.RetryCount >= 2`

---

## 4. Complete Canonical Example

```json
{
  "schemaVersion": "2.0",
  "tenantId": "0195f4a0-7c10-7000-8000-000000000001",
  "workflowId": "wf_billing_assistant_v1",
  "initialNodeId": "node_welcome",
  "globalKeywords": {
    "STOP": "node_opt_out",
    "SAIR": "node_opt_out",
    "MENU": "node_welcome"
  },
  "nodes": {
    "node_welcome": {
      "type": "ASK_INTERACTIVE",
      "uiComponent": {
        "kind": "INTERACTIVE_OPTIONS",
        "headerText": "Billing Desk",
        "bodyText": "Hello {{contact.pushName}}. Select an option:",
        "footerText": "Automated deterministic service",
        "listButtonLabel": "Select Service",
        "options": [
          {
            "id": "opt_invoice",
            "title": "Duplicate Invoice",
            "description": "Fetch open payment slip"
          },
          { "id": "opt_agent", "title": "Human Support", "description": "Talk to a specialist" }
        ]
      },
      "fallbackPrompt": "Unrecognized option. Please tap one of the buttons displayed.",
      "maxInvalidAttempts": 3,
      "onMaxAttemptsNode": "node_handoff",
      "transitions": [
        {
          "event": "INTERACTIVE_REPLY",
          "condition": "input.payload == 'opt_invoice'",
          "targetNode": "node_ask_cpf"
        },
        {
          "event": "INTERACTIVE_REPLY",
          "condition": "input.payload == 'opt_agent'",
          "targetNode": "node_handoff"
        }
      ]
    },
    "node_ask_cpf": {
      "type": "ASK_TEXT_VALIDATED",
      "promptText": "Enter the 11 numeric digits of the account holder CPF:",
      "maxInvalidAttempts": 3,
      "onMaxAttemptsNode": "node_handoff",
      "validation": {
        "rule": "CPF",
        "saveToVariable": "customer_cpf",
        "errorPrompt": "Invalid CPF checksum. Enter 11 valid digits without punctuation."
      },
      "transitions": [{ "event": "VALID_INPUT", "targetNode": "node_lookup_invoice" }]
    },
    "node_lookup_invoice": {
      "type": "HTTP_REQUEST",
      "request": {
        "method": "POST",
        "url": "https://erp.example.com/v1/invoices/lookup",
        "headers": { "Content-Type": "application/json" },
        "body": { "cpf": "{{session.variables.customer_cpf}}" },
        "timeoutMs": 5000,
        "responseMapping": {
          "has_open_invoice": "data.hasOpenInvoice",
          "payment_url": "data.paymentUrl",
          "amount_formatted": "data.amountFormatted"
        }
      },
      "transitions": [
        {
          "event": "HTTP_SUCCESS",
          "condition": "session.variables.has_open_invoice == true",
          "targetNode": "node_send_invoice"
        },
        {
          "event": "HTTP_SUCCESS",
          "condition": "session.variables.has_open_invoice == false",
          "targetNode": "node_no_debt"
        },
        { "event": "HTTP_ERROR", "targetNode": "node_handoff" }
      ]
    },
    "node_send_invoice": {
      "type": "SEND_MESSAGE",
      "uiComponent": {
        "kind": "CTA_URL",
        "bodyText": "Open invoice found for R$ {{session.variables.amount_formatted}}.",
        "ctaDisplayText": "Open Payment Slip",
        "ctaUrl": "{{session.variables.payment_url}}"
      },
      "transitions": []
    },
    "node_no_debt": {
      "type": "SEND_MESSAGE",
      "uiComponent": {
        "kind": "TEXT",
        "bodyText": "No open invoices were found for CPF {{session.variables.customer_cpf}}."
      },
      "transitions": []
    },
    "node_opt_out": {
      "type": "SEND_MESSAGE",
      "uiComponent": {
        "kind": "TEXT",
        "bodyText": "Your opt-out preference has been recorded. Send MENU anytime to restart."
      },
      "transitions": []
    },
    "node_handoff": {
      "type": "HUMAN_HANDOFF",
      "queueDepartment": "financial_support",
      "handoffMessage": "Transferring your conversation to a specialist. Please wait."
    }
  }
}
```

---

## Canonical Upstream Sources

- Zod v4 `z.discriminatedUnion` Specification: Context7 `/colinhacks/zod/v4.6.5` (`packages/docs/content/api.mdx`)
- Omnichannel Architectural Masterplan (Section 5): [`references/omnichannel-master-plan.md`](../omnichannel-master-plan.md)
