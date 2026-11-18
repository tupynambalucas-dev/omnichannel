# Explanation: Webhook Ingestion and Idempotency Pipeline

This document explains the architectural design of the `/webhooks/meta` ingestion pipeline in `@tupynambalucas-dev/omnichannel-api`: why raw byte buffers must be preserved for cryptographic verification, why Instagram echo events and WhatsApp delivery statuses are filtered at the edge, and why idempotency requires two complementary layers.

---

## 1. Why Raw-Buffer HMAC Verification Must Precede JSON Re-Serialization

Meta signs every webhook request by computing `HMAC-SHA256(appSecret, rawRequestBytes)` and sending the digest in the `X-Hub-Signature-256` HTTP header.

If a web framework parses the incoming JSON body into a JavaScript object and re-serializes it via `JSON.stringify(request.body)` before computing the HMAC, any difference in whitespace, Unicode escaping, or key ordering alters the byte stream and causes valid Meta signatures to fail verification.

To preserve exact bytes without affecting standard REST routes under `/api/v1/*`, [`webhook.routes.ts`](../../api/src/domains/webhooks/webhook.routes.ts) registers an encapsulated content-type parser with `{ parseAs: 'buffer' }` that attaches the unmodified `Buffer` to `request.rawBody`. [`verifyMetaHmacSignature`](../../api/src/domains/webhooks/webhook.security.ts) then compares the expected and provided digests using `crypto.timingSafeEqual` to eliminate timing side-channels.

---

## 2. Why Edge Filtering Separates `is_echo` and Delivery `statuses`

Meta webhooks deliver three distinct categories of events to the same callback URL:

1. **Inbound Customer Interactions**: Text messages, interactive button taps (`button_reply`), list selections (`list_reply`), quick replies (`quick_reply`), and postbacks (`postback`).
2. **Instagram Self-Echoes (`message.is_echo === true`)**: Whenever the gateway dispatches an outbound message on Instagram, Meta sends a webhook notification echoing the bot's own message back to `/webhooks/meta` with `is_echo: true`. If the adapter fails to discard `is_echo` events at ingress, the bot treats its own outbound prompt as user input and enters an infinite self-reply loop.
3. **WhatsApp Delivery Receipts (`value.statuses[]`)**: Asynchronous lifecycle notifications (`sent`, `delivered`, `read`, `failed`) arrive on the same `messages` webhook subscription. [`whatsapp.adapter.ts`](../../api/src/domains/webhooks/adapters/whatsapp.adapter.ts) separates these into `statusEvents` so delivery receipts never trigger FSM state transitions, while logging `failed` receipts with their Meta `errorCode` and `errorTitle`.

---

## 3. Why Two-Layer Deduplication Is Required (`SET NX EX` + BullMQ)

Meta's webhook infrastructure operates under **at-least-once** delivery semantics. Transient network jitter or a slow downstream acknowledgment causes Meta to redeliver the exact same `wamid` or `mid`. Without idempotency protection, a single button tap delivered twice would advance the customer through two consecutive workflow nodes.

`@tupynambalucas-dev/omnichannel-api` enforces two complementary barriers:

1. **Layer 1 — State Redis Atomic Claim (`dedup:msg:{channel}:{providerMessageId}`)**:
   In [`WebhookService.claimIdempotencySlot`](../../api/src/domains/webhooks/webhook.service.ts), the gateway executes `SET dedup:msg:{channel}:{providerMessageId} "1" EX 86400 NX` (`REDIS_TTL_SECONDS.WEBHOOK_DEDUPLICATION`). If the key already exists, the duplicate event is dropped before touching BullMQ.
2. **Layer 2 — BullMQ Native Job Deduplication (`omnichannel-inbound-events`)**:
   When enqueuing to `omnichannel-inbound-events`, [`queuePlugin.ts`](../../api/src/plugins/queuePlugin.ts) passes `deduplication: { id: "${envelope.channel}:${envelope.providerMessageId}", ttl: 86_400_000 }`, ensuring queue-level idempotency even if State Redis was transiently unavailable or restarted.

---

## Canonical Upstream Sources

- Meta Graph API Webhooks — Payload Verification (`X-Hub-Signature-256`): `https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests` (retrieved 2026-11-17)
- Fastify v5 Content-Type Parser (`parseAs: 'buffer'`): `https://fastify.dev/docs/latest/Reference/ContentTypeParser/` (Context7 `/fastify/fastify/v5.12.7`, retrieved 2026-11-17)
- BullMQ v6 Job Deduplication: `https://docs.bullmq.io/guide/jobs/deduplication` (Context7 `/websites/bullmq_io`, retrieved 2026-11-17)
