# How-To Guide: Publish a Custom Workflow via REST

This guide shows how to author a custom `WorkflowDefinition`, publish an immutable version via `POST /api/v1/tenants/:tenantId/workflows`, and activate it on one or more tenant channels without disrupting in-flight customer conversations.

---

## Prerequisites

- An active tenant UUID (`tenantId` from `GET /api/v1/tenants`).
- A registered channel (`channelAccountId` from `POST /api/v1/tenants/:tenantId/channels`).

---

## 1. Validate Your Workflow Graph Rules

Before calling the API, confirm your definition satisfies [`WorkflowDefinitionSchema`](../../core/src/schemas/workflow.schema.ts):

1. `workflowKey` matches `/^[a-z0-9-]+$/` (`2..64` characters).
2. `version` is a positive integer greater than any previously published version for the same `(tenantId, workflowKey)`.
3. `entryNodeId` exists in the `nodes` array, and all `node.id` strings are unique.
4. Button titles are `<= 20` characters (`WHATSAPP_LIMITS.MAX_BUTTON_TITLE_LENGTH`), list row titles `<= 24` characters, and descriptions `<= 72` characters.

---

## 2. Publish and Activate the Workflow Version

Send `POST /api/v1/tenants/:tenantId/workflows` with `activateForChannelAccountIds` set to the channel account IDs that should immediately switch new sessions to this version:

```bash
curl -X POST "http://localhost:3000/api/v1/tenants/<TENANT_UUID>/workflows" \
  -H "Content-Type: application/json" \
  -d '{
    "activateForChannelAccountIds": ["106540352242922"],
    "definition": {
      "workflowKey": "custom-support-triage",
      "version": 1,
      "name": "Custom Support Triage v1",
      "entryNodeId": "welcome_menu",
      "globalKeywords": {
        "optOutConfirmationText": "You have opted out. Send MENU anytime to restart.",
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
            "headerText": "Support Desk",
            "body": "Hello {{contactName}}! Choose an option:",
            "options": [
              { "id": "opt_status", "title": "System Status" },
              { "id": "opt_human", "title": "Talk to Agent" }
            ]
          },
          "saveToVariable": "topic",
          "transitions": [
            { "payloadId": "opt_status", "nextNodeId": "status_reply", "assignValue": "STATUS" },
            { "payloadId": "opt_human", "nextNodeId": "handoff_specialist", "assignValue": "HUMAN" }
          ]
        },
        {
          "id": "status_reply",
          "type": "SEND_MESSAGE",
          "components": [
            {
              "kind": "TEXT",
              "body": "All cloud services are operational.",
              "previewUrl": false
            }
          ],
          "nextNodeId": null
        },
        {
          "id": "handoff_specialist",
          "type": "HUMAN_HANDOFF",
          "departmentQueue": "tier-1-support",
          "announcementText": "Connecting you to a support engineer.",
          "summaryVariables": ["contactName", "topic"]
        }
      ]
    }
  }'
```

---

## 3. Roll Out a New Version (`version: 2`)

To update the workflow later:

1. Increment `"version": 2` while keeping `"workflowKey": "custom-support-triage"`.
2. Re-POST to `POST /api/v1/tenants/:tenantId/workflows` with `"activateForChannelAccountIds": ["106540352242922"]`.
3. Existing sessions remain pinned to version 1's `workflowId` until they complete or the user sends `MENU`; new sessions immediately start on version 2.

---

## Canonical Upstream Sources

- Declarative FSM Workflow Schema Reference: [`references/reference/declarative-fsm-workflow-schema.md`](../reference/declarative-fsm-workflow-schema.md)
- HTTP API Reference: [`references/reference/http-api.md`](../reference/http-api.md)
