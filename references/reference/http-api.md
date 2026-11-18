# Reference: HTTP API Specification

Complete HTTP REST and webhook specification for `@tupynambalucas-dev/omnichannel-api`, derived from [`registryPlugin.ts`](../../api/src/plugins/registryPlugin.ts), [`webhook.routes.ts`](../../api/src/domains/webhooks/webhook.routes.ts), [`tenant.routes.ts`](../../api/src/domains/tenants/tenant.routes.ts), and [`errorHandlerPlugin.ts`](../../api/src/plugins/errorHandlerPlugin.ts).

---

## 1. Global Middleware & Rate Limiting

- **Security Headers**: `@fastify/helmet` registered globally (`contentSecurityPolicy: false`).
- **CORS**: `@fastify/cors` configured with `CORS_ALLOWED_ORIGINS` and `credentials: true`.
- **Global Rate Limit**: `@fastify/rate-limit` enforcing `max: 600` requests per `1 minute` window.
- **Validation**: `fastify-type-provider-zod` validates request params, querystrings, bodies, and response schemas against `@tupynambalucas-dev/omnichannel-core` Zod v4 contracts.

---

## 2. Observability Endpoints

### 2.1 `GET /health`

Returns service readiness and active datastore connection modes.

**Response (`200 OK`)**:

```json
{
  "status": "ok",
  "service": "@tupynambalucas-dev/omnichannel-api",
  "environment": "development",
  "datastores": {
    "postgresql": "connected",
    "redisState": "connected",
    "redisQueue": "connected",
    "mongoArchive": "disabled"
  },
  "timestamp": "2026-11-17T22:00:00.000Z"
}
```

| Field                     | Allowed Values                     | Description                                                                 |
| :------------------------ | :--------------------------------- | :-------------------------------------------------------------------------- |
| `datastores.postgresql`   | `"connected" \| "memory-fallback"` | Cloud PostgreSQL pool status (`memory-fallback` when `DATABASE_URL` empty). |
| `datastores.redisState`   | `"connected" \| "memory-fallback"` | State Redis status (`memory-fallback` when `REDIS_STATE_URL` empty).        |
| `datastores.redisQueue`   | `"connected" \| "inline-fallback"` | BullMQ Queue Redis status (`inline-fallback` when `REDIS_QUEUE_URL` empty). |
| `datastores.mongoArchive` | `"enabled" \| "disabled"`          | Optional MongoDB Atlas raw webhook archive status.                          |

### 2.2 `GET /metrics`

Exposes Prometheus text-format metrics via `fastify-metrics`.

---

## 3. Unified Meta Webhook Endpoints (`/webhooks/meta`)

### 3.1 `GET /webhooks/meta` (Subscription Verification Handshake)

Validates Meta App Dashboard webhook subscription requests (`MetaWebhookVerifyQuerySchema`).

**Query Parameters**:

- `hub.mode`: Must equal `"subscribe"`.
- `hub.verify_token`: Must match `META_WEBHOOK_VERIFY_TOKEN`.
- `hub.challenge`: Opaque string echoed back as `text/plain`.

**Responses**:

- `200 OK` (`text/plain`): Echoes `hub.challenge`.
- `403 Forbidden`: When `hub.mode !== 'subscribe'` or `hub.verify_token` does not match (`WEBHOOK_VERIFICATION_FAILED`).

### 3.2 `POST /webhooks/meta` (Unified WhatsApp & Instagram Ingestion)

Receives signed webhook events for both `whatsapp_business_account` and `instagram` (`MetaWebhookPayloadSchema`). Uses an encapsulated `{ parseAs: 'buffer' }` parser so `request.rawBody` preserves exact UTF-8 bytes.

**Headers**:

- `X-Hub-Signature-256`: `sha256=<64-char-hex-hmac>` verified via `verifyMetaHmacSignature()` when `META_APP_SECRET` is configured.

**Response (`200 OK`)**:

```json
{
  "received": true,
  "acceptedMessages": 1,
  "deduplicatedDrops": 0,
  "statusUpdatesObserved": 0
}
```

**Error Responses**:

- `400 Bad Request`: Malformed JSON (`MALFORMED_WEBHOOK_JSON`) or invalid `MetaWebhookPayloadSchema` (`VALIDATION_ERROR`).
- `401 Unauthorized`: Invalid or missing `X-Hub-Signature-256` (`INVALID_WEBHOOK_SIGNATURE`).

---

## 4. Multi-Tenant & Workflow Administration Endpoints (`/api/v1/tenants`)

### 4.1 `GET /api/v1/tenants`

Lists all registered tenants ordered by `created_at DESC`.

**Response (`200 OK`)**:

```json
{
  "items": [
    {
      "id": "0195f4a0-7c10-7000-8000-000000000001",
      "slug": "tupynamba-lucas-enterprise",
      "displayName": "Tupynamba Lucas Enterprise Suite",
      "timezone": "America/Sao_Paulo",
      "status": "ACTIVE",
      "createdAt": "2026-11-17T22:00:00.000Z"
    }
  ]
}
```

### 4.2 `POST /api/v1/tenants`

Creates a new corporate tenant (`CreateTenantRequestSchema`).

**Request Body**:

```json
{
  "slug": "acme-corp",
  "displayName": "ACME Corporation",
  "timezone": "America/Sao_Paulo"
}
```

**Responses**:

- `201 Created`: `TenantRecord`
- `409 Conflict`: Duplicate `slug` (`TENANT_SLUG_CONFLICT`)

### 4.3 `POST /api/v1/tenants/:tenantId/channels`

Registers or updates a WhatsApp (`phone_number_id`) or Instagram (`ig_account_id`) channel binding (`RegisterChannelRequestSchema`).

**Request Body**:

```json
{
  "channel": "whatsapp",
  "channelAccountId": "106540352242922",
  "displayHandle": "whatsapp:+5511999990000",
  "accessTokenSecretRef": "META_GRAPH_ACCESS_TOKEN"
}
```

**Responses**:

- `201 Created`: `TenantChannelRecord`
- `404 Not Found`: Unknown `tenantId` (`TENANT_NOT_FOUND`)

### 4.4 `POST /api/v1/tenants/:tenantId/workflows`

Publishes an immutable `WorkflowDefinition` version (`PublishWorkflowRequestSchema`) and optionally activates it on specified channel account IDs.

**Request Body**:

```json
{
  "definition": {
    "workflowKey": "custom-flow",
    "version": 1,
    "name": "Custom Triage Flow",
    "entryNodeId": "welcome",
    "nodes": [
      {
        "id": "welcome",
        "type": "SEND_MESSAGE",
        "components": [{ "kind": "TEXT", "body": "Welcome!", "previewUrl": false }],
        "nextNodeId": null
      }
    ]
  },
  "activateForChannelAccountIds": ["106540352242922"]
}
```

**Response (`201 Created`)**: `WorkflowVersionRecord`

### 4.5 Built-in Workflow Bootstrap Endpoints

All three endpoints accept `{ "activateForChannelAccountIds": ["106540352242922"] }` and return `201 Created` (`WorkflowVersionRecord`):

| Endpoint                                                    | Published `workflowKey`          | Builder Function                    |
| :---------------------------------------------------------- | :------------------------------- | :---------------------------------- |
| `POST /api/v1/tenants/:tenantId/workflows/starter`          | `enterprise-triage`              | `buildStarterTriageWorkflow()`      |
| `POST /api/v1/tenants/:tenantId/workflows/guided-prototype` | `enterprise-guided-prototype`    | `buildGuidedPrototypeWorkflow()`    |
| `POST /api/v1/tenants/:tenantId/workflows/standard`         | `enterprise-standard-onboarding` | `buildStandardOnboardingWorkflow()` |

### 4.6 `POST /api/v1/tenants/bootstrap-default`

Idempotently ensures the `tupynamba-lucas-enterprise` tenant exists, binds `channelAccountId` (defaults to `DEFAULT_WHATSAPP_PHONE_NUMBER_ID`), and activates `enterprise-standard-onboarding`.

**Optional Request Body**:

```json
{
  "channelAccountId": "106540352242922",
  "accessTokenSecretRef": "META_GRAPH_ACCESS_TOKEN"
}
```

**Response (`200 OK`)**: `{ "tenant": TenantRecord, "channel": TenantChannelRecord, "workflow": WorkflowVersionRecord }`

---

## 5. Error Response Contract (`errorHandlerPlugin.ts`)

All `AppError` and Zod validation errors return a deterministic JSON envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request payload failed schema validation.",
    "details": []
  }
}
```

---

## Canonical Upstream Sources

- Fastify v5 Routes & Type Providers Documentation: `https://fastify.dev/docs/latest/Reference/Type-Providers/` (Context7 `/fastify/fastify/v5.12.7`, retrieved 2026-11-17)
- Zod v4 Schema Validation: `https://zod.dev/api` (Context7 `/colinhacks/zod/v4.6.5`, retrieved 2026-11-17)
