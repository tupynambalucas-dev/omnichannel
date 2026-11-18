# Reference: Environment Variables and Secret References

Authoritative reference for all runtime environment variables validated by [`envSchema`](../../api/src/config/envConfig.ts) and the tenant channel secret-reference resolution architecture in [`MetaGraphClient`](../../api/src/domains/compiler/meta-graph.client.ts).

---

## 1. Application Runtime Environment Schema (`EnvConfig`)

Validated at server startup via `@fastify/env` (`api/src/plugins/registryPlugin.ts`):

| Variable                           | Type      | Required in Schema | Default                                         | Description                                                                                                          |
| :--------------------------------- | :-------- | :----------------: | :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                         | `string`  |        Yes         | `'development'`                                 | Runtime mode: `'development'`, `'production'`, or `'test'`.                                                          |
| `SERVER_HOST`                      | `string`  |        Yes         | `'0.0.0.0'`                                     | HTTP bind address.                                                                                                   |
| `SERVER_PORT`                      | `number`  |        Yes         | `3000`                                          | HTTP listening port.                                                                                                 |
| `LOG_LEVEL`                        | `string`  |         No         | `'info'`                                        | Pino logger verbosity (`'fatal'`, `'error'`, `'warn'`, `'info'`, `'debug'`, `'trace'`).                              |
| `CORS_ALLOWED_ORIGINS`             | `string`  |         No         | `'http://localhost:3000,http://localhost:5173'` | Comma-separated list of allowed CORS origins.                                                                        |
| `META_GRAPH_BASE_URL`              | `string`  |         No         | `'https://graph.facebook.com'`                  | Base URL for outbound Meta Graph API calls.                                                                          |
| `META_GRAPH_API_VERSION`           | `string`  |         No         | `'v22.0'`                                       | Target Meta Graph API version segment.                                                                               |
| `META_WEBHOOK_VERIFY_TOKEN`        | `string`  |         No         | `'dev-verify-token'`                            | Shared secret verified during `GET /webhooks/meta` challenge handshake.                                              |
| `META_APP_SECRET`                  | `string`  |         No         | `''`                                            | Meta App Secret used to verify `X-Hub-Signature-256` HMAC-SHA256 digests on `POST /webhooks/meta`.                   |
| `DATABASE_URL`                     | `string`  |         No         | `''`                                            | Cloud PostgreSQL connection string (`postgresql://...`). When empty, activates in-memory repository fallback.        |
| `DATABASE_SSL_ENABLED`             | `boolean` |         No         | `true`                                          | Enables TLS (`rejectUnauthorized: true`) on `pg.Pool`.                                                               |
| `DATABASE_POOL_MAX`                | `number`  |         No         | `20`                                            | Maximum concurrent clients in `pg.Pool`.                                                                             |
| `REDIS_QUEUE_URL`                  | `string`  |         No         | `''`                                            | Cloud Redis connection URL (`rediss://...`) for BullMQ queues (`noeviction`). When empty, executes pipelines inline. |
| `REDIS_STATE_URL`                  | `string`  |         No         | `''`                                            | Cloud Redis connection URL (`rediss://...`) for 24h dedup, mutex locks, and session cache (`volatile-ttl`).          |
| `MONGODB_ARCHIVE_ENABLED`          | `boolean` |         No         | `false`                                         | Enables optional unstructured raw webhook payload archival to MongoDB Atlas.                                         |
| `MONGODB_URI`                      | `string`  |         No         | `''`                                            | MongoDB Atlas connection URI (`mongodb+srv://...`) used when `MONGODB_ARCHIVE_ENABLED=true`.                         |
| `SENTRY_DSN`                       | `string`  |         No         | `''`                                            | Optional Sentry DSN for `5xx` unhandled exception reporting.                                                         |
| `DEFAULT_TENANT_AUTO_BOOTSTRAP`    | `boolean` |         No         | `true`                                          | Automatically provisions the `tupynamba-lucas-enterprise` tenant and standard onboarding flow at startup.            |
| `DEFAULT_WHATSAPP_PHONE_NUMBER_ID` | `string`  |         No         | `'106540352242922'`                             | Default WhatsApp `phone_number_id` registered when `DEFAULT_TENANT_AUTO_BOOTSTRAP=true`.                             |

> [!IMPORTANT]
> **Production Webhook Security:** In [`WebhookController.receiveEvent`](../../api/src/domains/webhooks/webhook.controller.ts), HMAC-SHA256 signature verification is enforced whenever `META_APP_SECRET` is non-empty. Production deployments MUST always supply a non-empty `META_APP_SECRET`.

---

## 2. Tenant Channel Secret Reference Resolution (`accessTokenSecretRef`)

To prevent credential leakage in database dumps, logs, or SQL queries, `tenant_channels` never stores raw Meta System User tokens. Instead:

1. **Database Column (`tenant_channels.access_token_secret_ref`)**: Stores only the **name** of an environment variable (for example, `META_GRAPH_ACCESS_TOKEN` or `META_TOKEN_ACME_WHATSAPP`).
2. **Runtime Resolution (`MetaGraphClient.resolveAccessToken`)**: When dispatching an outbound message, `MetaGraphClient` looks up `process.env[secretRef]`. If the variable is undefined or blank, it throws a `MetaGraphDispatchError` with `httpStatus: 401`.
3. **Default Auto-Bootstrap Secret Reference**: `TenantService.ensureDefaultEnterpriseTenant()` binds `DEFAULT_WHATSAPP_PHONE_NUMBER_ID` with `accessTokenSecretRef = 'META_GRAPH_ACCESS_TOKEN'`.

---

## Canonical Upstream Sources

- `@fastify/env` Configuration & JSON Schema Validation: `https://github.com/fastify/fastify-env` (retrieved 2026-11-17)
- Infisical CLI Secret Injection (`infisical run`): `https://infisical.com/docs/cli/commands/run` (retrieved 2026-11-17)
