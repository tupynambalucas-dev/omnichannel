# Reference: Declarative FSM Workflow Schema Specification

Formal specification for the **Declarative JSONB State Machine** validated by `@tupynambalucas-dev/omnichannel-core` ([`WorkflowDefinitionSchema`](../../core/src/schemas/workflow.schema.ts)) and executed by [`WorkflowEngine`](../../api/src/domains/workflow/workflow.engine.ts).

---

## 1. Root Contract (`WorkflowDefinitionSchema`)

Every workflow definition is a strict object (`z.object(...).strict()`) with two graph-integrity refinements:

1. Every `node.id` in `nodes` must be unique within the workflow definition.
2. `entryNodeId` must match the `id` of a node present in `nodes`.

| Property         | Type                     | Required | Constraints / Default            | Description                                                                         |
| :--------------- | :----------------------- | :------: | :------------------------------- | :---------------------------------------------------------------------------------- |
| `workflowKey`    | `string`                 |   Yes    | `2..64` chars, `/^[a-z0-9-]+$/`  | Logical kebab-case workflow identifier (e.g., `enterprise-standard-onboarding`).    |
| `version`        | `number`                 |   Yes    | Positive integer (`> 0`)         | Immutable version number.                                                           |
| `name`           | `string`                 |   Yes    | `2..120` chars                   | Human-readable workflow name.                                                       |
| `description`    | `string`                 |    No    | Max `500` chars                  | Optional summary of the workflow's purpose.                                         |
| `entryNodeId`    | `string`                 |   Yes    | Must exist in `nodes`            | Initial node executed when a new session starts or resets.                          |
| `globalKeywords` | `WorkflowGlobalKeywords` |    No    | Defaults applied if omitted      | Global opt-out, menu reset, and human handoff settings evaluated before node logic. |
| `nodes`          | `WorkflowNode[]`         |   Yes    | Min `1` node; unique `id` values | Array of discriminated union nodes (`type` discriminator).                          |

### 1.1 `WorkflowGlobalKeywordsSchema`

Global keywords are evaluated on every inbound text message **before** the current node handler:

- Opt-out keywords (`STOP`, `SAIR`, `PARAR`, `CANCELAR`, `UNSUBSCRIBE` in `GLOBAL_OPT_OUT_KEYWORDS`): transition session `status` to `OPTED_OUT`, record an `OptInAuditRecord` (`USER_STOP_KEYWORD`), and dispatch `optOutConfirmationText`.
- Reset keywords (`MENU`, `INICIO`, `REINICIAR`, `START` in `GLOBAL_RESET_KEYWORDS`): reset `currentNodeId` to `resetMenuNodeId ?? entryNodeId` with `status: 'ACTIVE'`.
- Human handoff keywords (`humanHandoffKeywords`): jump directly to `humanHandoffNodeId` when defined in `nodes`.

| Property                 | Type       | Required | Default                                                                     |
| :----------------------- | :--------- | :------: | :-------------------------------------------------------------------------- |
| `optOutConfirmationText` | `string`   |    No    | `'You have opted out of automated messages. Send MENU anytime to restart.'` |
| `resetMenuNodeId`        | `string`   |    No    | Falls back to `entryNodeId`                                                 |
| `humanHandoffKeywords`   | `string[]` |    No    | `['HUMANO', 'ATENDENTE', 'AGENT']`                                          |
| `humanHandoffNodeId`     | `string`   |    No    | `undefined`                                                                 |

---

## 2. Closed Node Handler Catalog (`WorkflowNodeSchema`)

### 2.1 `SEND_MESSAGE` (`SendMessageNodeSchema`)

Dispatches one or more channel-neutral UI components (`TEXT`, `QUICK_CHOICES`, `MENU_CHOICES`, `CTA_URL`, `CAROUSEL_CARDS`), interpolates `{{variable}}` tokens, and immediately transitions to `nextNodeId` (or marks the session `COMPLETED` when `nextNodeId` is `null`).

| Property     | Type                    | Required | Description                                                           |
| :----------- | :---------------------- | :------: | :-------------------------------------------------------------------- |
| `id`         | `string`                |   Yes    | Unique node identifier.                                               |
| `type`       | `'SEND_MESSAGE'`        |   Yes    | Discriminator literal.                                                |
| `components` | `AbstractUiComponent[]` |   Yes    | Non-empty array of UI blocks (`core/src/schemas/ui-block.schema.ts`). |
| `nextNodeId` | `string \| null`        |   Yes    | Next node ID to execute immediately, or `null` to complete session.   |

### 2.2 `ASK_INTERACTIVE` (`AskInteractiveNodeSchema`)

Dispatches `promptComponent`, parks the session in `WAITING_INPUT`, and evaluates the next inbound user reply against `transitions`:

1. Primary match: exact `envelope.interactiveReply.payloadId === transition.payloadId`.
2. Secondary fallback: case-insensitive match against `transition.payloadId` or option `title` if the user typed text manually.
3. On match: stores `transition.assignValue ?? transition.payloadId` in `variables[saveToVariable]` (if `saveToVariable` is set), resets `invalidAttempts` to `0`, and advances to `transition.nextNodeId`.
4. On mismatch: increments `invalidAttempts`. If `invalidAttempts >= maxInvalidAttempts` and `fallbackNodeId` is non-null, transitions to `fallbackNodeId`; otherwise sends `repromptMessage` + `promptComponent`.

| Property             | Type                      | Required | Default                                                      |
| :------------------- | :------------------------ | :------: | :----------------------------------------------------------- |
| `id`                 | `string`                  |   Yes    | —                                                            |
| `type`               | `'ASK_INTERACTIVE'`       |   Yes    | —                                                            |
| `promptComponent`    | `AbstractUiComponent`     |   Yes    | Typically `QUICK_CHOICES` or `MENU_CHOICES`                  |
| `saveToVariable`     | `string`                  |    No    | `undefined`                                                  |
| `transitions`        | `InteractiveTransition[]` |   Yes    | Non-empty array of `{ payloadId, nextNodeId, assignValue? }` |
| `repromptMessage`    | `string`                  |    No    | `'Please choose one of the available options above.'`        |
| `maxInvalidAttempts` | `number` (`1..10`)        |    No    | `3`                                                          |
| `fallbackNodeId`     | `string \| null`          |    No    | `null`                                                       |

### 2.3 `ASK_TEXT_VALIDATED` (`AskTextValidatedNodeSchema`)

Prompts the user with `promptText`, parks the session in `WAITING_INPUT`, and validates the next inbound text via `validateConversationalInput()` (`core/src/utils/validators.ts`):

- `'CPF'`: 11-digit Brazilian CPF with Modulo-11 check-digit verification (normalized to 11 digits).
- `'EMAIL'`: RFC-compliant email address (normalized to lowercase).
- `'PHONE_E164'`: E.164 phone number (`8..15` digits, normalized with leading `+`).
- `'NUMERIC'`: Finite numeric string.
- `'REGEX'`: Custom regular expression defined in `regexPattern`.
- `'TEXT'`: Any non-empty trimmed string.

| Property             | Type                                                                 | Required | Default                                                              |
| :------------------- | :------------------------------------------------------------------- | :------: | :------------------------------------------------------------------- |
| `id`                 | `string`                                                             |   Yes    | —                                                                    |
| `type`               | `'ASK_TEXT_VALIDATED'`                                               |   Yes    | —                                                                    |
| `promptText`         | `string` (`1..1024` chars)                                           |   Yes    | —                                                                    |
| `validationFormat`   | `'TEXT' \| 'EMAIL' \| 'CPF' \| 'NUMERIC' \| 'PHONE_E164' \| 'REGEX'` |   Yes    | —                                                                    |
| `regexPattern`       | `string`                                                             |    No    | Used when `validationFormat === 'REGEX'`                             |
| `saveToVariable`     | `string`                                                             |   Yes    | Session variable key receiving `normalizedValue`                     |
| `invalidPromptText`  | `string`                                                             |    No    | `'Invalid value provided. Please review your answer and try again.'` |
| `maxInvalidAttempts` | `number` (`1..10`)                                                   |    No    | `3`                                                                  |
| `nextNodeId`         | `string \| null`                                                     |   Yes    | Target node on valid input (`null` completes session)                |
| `fallbackNodeId`     | `string \| null`                                                     |    No    | `null` (target node when `invalidAttempts >= maxInvalidAttempts`)    |

### 2.4 `HTTP_REQUEST` (`HttpRequestNodeSchema`)

Checkpoints the session (`status: 'ACTIVE'`, `currentNodeId: node.id`) **before** executing the outbound `fetch()` call, interpolates `urlTemplate`, `headers`, and `bodyTemplate` against `session.variables`, and stores the result in `session.variables[responseVariable]`:

- On HTTP response: stores `{ status: response.status, ok: response.ok, data: parsedResponse }` and transitions to `onSuccessNodeId` when `response.ok` is `true`, or `onErrorNodeId` when `response.ok` is `false`.
- On network error or timeout (`AbortSignal.timeout(timeoutMs)`): catches the exception, stores `{ status: 0, ok: false, error: message }`, and transitions deterministically to `onErrorNodeId`.

| Property           | Type                                  | Required | Default |
| :----------------- | :------------------------------------ | :------: | :------ |
| `id`               | `string`                              |   Yes    | —       |
| `type`             | `'HTTP_REQUEST'`                      |   Yes    | —       |
| `method`           | `'GET' \| 'POST' \| 'PUT' \| 'PATCH'` |   Yes    | —       |
| `urlTemplate`      | `string`                              |   Yes    | —       |
| `headers`          | `Record<string, string>`              |    No    | `{}`    |
| `bodyTemplate`     | `Record<string, unknown>`             |    No    | —       |
| `timeoutMs`        | `number` (`500..15000`)               |    No    | `5000`  |
| `responseVariable` | `string`                              |   Yes    | —       |
| `onSuccessNodeId`  | `string \| null`                      |   Yes    | —       |
| `onErrorNodeId`    | `string \| null`                      |   Yes    | —       |

### 2.5 `CONDITION_SWITCH` (`ConditionSwitchNodeSchema`)

Evaluates ordered `branches` deterministically via `evaluateConditionBranches()` (`api/src/domains/workflow/condition-evaluator.ts`, supporting dot-path variable lookup such as `invoiceResponse.data.hasOpenInvoice`):

- Operators (`ConditionOperatorSchema`): `'EQUALS'`, `'NOT_EQUALS'`, `'CONTAINS'`, `'EXISTS'`, `'IN'`, `'GT'`, `'LT'`.
- Routes to the first matching branch's `nextNodeId`, or `defaultNodeId` when no branch matches.

| Property        | Type                        | Required | Description                                            |
| :-------------- | :-------------------------- | :------: | :----------------------------------------------------- |
| `id`            | `string`                    |   Yes    | —                                                      |
| `type`          | `'CONDITION_SWITCH'`        |   Yes    | —                                                      |
| `branches`      | `WorkflowConditionBranch[]` |   Yes    | Array of `{ variable, operator, value?, nextNodeId }`. |
| `defaultNodeId` | `string \| null`            |   Yes    | Fallback node ID (`null` completes session).           |

### 2.6 `DELAY_TIMER` (`DelayTimerNodeSchema`)

Checkpoints the session with `status: 'DELAYED'` and `currentNodeId: node.id`, then schedules a delayed job (`delaySeconds * 1000` ms) on `omnichannel-delayed-timers`. When the timer fires, `resumeDelayedSession()` verifies the session is still in `status === 'DELAYED'` before advancing to `nextNodeId`.

| Property       | Type            | Required | Constraints      |
| :------------- | :-------------- | :------: | :--------------- |
| `id`           | `string`        |   Yes    | —                |
| `type`         | `'DELAY_TIMER'` |   Yes    | —                |
| `delaySeconds` | `number`        |   Yes    | `1..86400` (24h) |
| `nextNodeId`   | `string`        |   Yes    | —                |

### 2.7 `HUMAN_HANDOFF` (`HumanHandoffNodeSchema`)

Transitions session `status` to `'HUMAN_HANDOFF'`, records `handoffQueue` and `handoffAt` in `session.variables`, and dispatches `announcementText` to the user. While in `HUMAN_HANDOFF`, subsequent inbound messages refresh the 24-hour window without triggering automated bot replies (unless the user sends a global reset keyword such as `MENU`).

| Property           | Type              | Required | Default                                                          |
| :----------------- | :---------------- | :------: | :--------------------------------------------------------------- |
| `id`               | `string`          |   Yes    | —                                                                |
| `type`             | `'HUMAN_HANDOFF'` |   Yes    | —                                                                |
| `departmentQueue`  | `string`          |   Yes    | —                                                                |
| `announcementText` | `string`          |    No    | `'Transferring your conversation to a specialist. Please wait.'` |
| `summaryVariables` | `string[]`        |    No    | `[]`                                                             |

---

## 3. Complete Canonical Example (Validated Against `WorkflowDefinitionSchema`)

```json
{
  "workflowKey": "enterprise-billing-triage",
  "version": 1,
  "name": "Enterprise Billing Triage v1",
  "description": "Deterministic billing qualification flow with CPF validation, ERP HTTP lookup, and specialist handoff.",
  "entryNodeId": "welcome_menu",
  "globalKeywords": {
    "optOutConfirmationText": "You have opted out of automated messages. Send MENU anytime to restart.",
    "resetMenuNodeId": "welcome_menu",
    "humanHandoffKeywords": ["HUMANO", "ATENDENTE", "AGENT"],
    "humanHandoffNodeId": "handoff_specialist"
  },
  "nodes": [
    {
      "id": "welcome_menu",
      "type": "ASK_INTERACTIVE",
      "promptComponent": {
        "kind": "QUICK_CHOICES",
        "headerText": "Billing Desk",
        "body": "Hello {{contactName}}! Select how we can help you today:",
        "footerText": "Tap an option below",
        "options": [
          { "id": "opt_invoice", "title": "Duplicate Invoice" },
          { "id": "opt_human", "title": "Talk to Specialist" }
        ]
      },
      "saveToVariable": "selectedIntent",
      "repromptMessage": "Please select one of the options above.",
      "maxInvalidAttempts": 3,
      "fallbackNodeId": "handoff_specialist",
      "transitions": [
        { "payloadId": "opt_invoice", "nextNodeId": "ask_customer_cpf", "assignValue": "INVOICE" },
        { "payloadId": "opt_human", "nextNodeId": "handoff_specialist", "assignValue": "HUMAN" }
      ]
    },
    {
      "id": "ask_customer_cpf",
      "type": "ASK_TEXT_VALIDATED",
      "promptText": "Please enter the 11 digits of your Brazilian CPF:",
      "validationFormat": "CPF",
      "saveToVariable": "customerCpf",
      "invalidPromptText": "Invalid CPF check digits. Please enter a valid 11-digit CPF:",
      "maxInvalidAttempts": 3,
      "nextNodeId": "lookup_erp_invoice",
      "fallbackNodeId": "handoff_specialist"
    },
    {
      "id": "lookup_erp_invoice",
      "type": "HTTP_REQUEST",
      "method": "POST",
      "urlTemplate": "https://erp.example.com/v1/invoices/lookup",
      "headers": {
        "X-Tenant-Slug": "acme"
      },
      "bodyTemplate": {
        "cpf": "{{customerCpf}}"
      },
      "timeoutMs": 5000,
      "responseVariable": "erpLookup",
      "onSuccessNodeId": "check_invoice_status",
      "onErrorNodeId": "handoff_specialist"
    },
    {
      "id": "check_invoice_status",
      "type": "CONDITION_SWITCH",
      "branches": [
        {
          "variable": "erpLookup.data.hasOpenInvoice",
          "operator": "EQUALS",
          "value": true,
          "nextNodeId": "send_invoice_link"
        }
      ],
      "defaultNodeId": "send_no_open_invoice"
    },
    {
      "id": "send_invoice_link",
      "type": "SEND_MESSAGE",
      "components": [
        {
          "kind": "CTA_URL",
          "headerText": "Open Invoice",
          "body": "We located an open invoice for CPF {{customerCpf}}.",
          "footerText": "Tupynamba Lucas Enterprise",
          "buttonLabel": "Open Invoice PDF",
          "url": "https://billing.example.com/invoices"
        }
      ],
      "nextNodeId": null
    },
    {
      "id": "send_no_open_invoice",
      "type": "SEND_MESSAGE",
      "components": [
        {
          "kind": "TEXT",
          "body": "No open invoices were found for CPF {{customerCpf}}. Send MENU anytime to restart.",
          "previewUrl": false
        }
      ],
      "nextNodeId": null
    },
    {
      "id": "handoff_specialist",
      "type": "HUMAN_HANDOFF",
      "departmentQueue": "tier-1-billing",
      "announcementText": "Transferring your conversation to a billing specialist. Please wait.",
      "summaryVariables": ["contactName", "selectedIntent", "customerCpf"]
    }
  ]
}
```

---

## Canonical Upstream Sources

- Zod v4 Discriminated Unions & JSON Schema Conversion (`z.discriminatedUnion`, `z.toJSONSchema`): `https://zod.dev/json-schema` (Context7 `/colinhacks/zod`, retrieved 2026-11-17)
- Meta WhatsApp Cloud API — Interactive Messages Specification: `https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#interactive-messages` (retrieved 2026-11-17)
