# How-To Guide: Webhook HMAC Security and Two-Layer Deduplication

Meta webhooks operate over the public internet with **at-least-once** delivery semantics and a strict **3-second HTTP 200 SLA**. Failure to validate cryptographic signatures exposes the state machine to forged transitions, while failure to deduplicate repeated webhook deliveries advances a user two steps on a single button tap.

This guide documents how `@tupynambalucas-dev/omnichannel-api` implements raw-buffer HMAC-SHA256 validation, edge echo filtering, and two-layer Redis + BullMQ idempotency.

---

## 1. Preserving the Exact Raw Buffer in Encapsulated Fastify Routes

JSON serialization is non-canonical: parsing a webhook body and calling `JSON.stringify(req.body)` alters whitespace or key ordering, invalidating Meta's `X-Hub-Signature-256` digest.

Instead of mutating global JSON parsing across all REST endpoints, register `addContentTypeParser` with `{ parseAs: 'buffer' }` inside an **encapsulated** Fastify webhook plugin (without wrapping in `fastify-plugin`):

```typescript
import type { FastifyInstance } from 'fastify';

export async function registerRawBodyParser(server: FastifyInstance): Promise<void> {
  server.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer', bodyLimit: 1_048_576 },
    (request, rawBuffer: Buffer, done) => {
      request.rawBody = rawBuffer;
      try {
        const parsed: unknown = rawBuffer.length > 0 ? JSON.parse(rawBuffer.toString('utf8')) : {};
        done(null, parsed);
      } catch (error) {
        const badRequest = Object.assign(
          new Error(error instanceof Error ? error.message : 'Malformed JSON payload'),
          { statusCode: 400 },
        );
        done(badRequest, undefined);
      }
    },
  );
}
```

---

## 2. Constant-Time HMAC-SHA256 Verification (`preValidation`)

Run signature verification inside Fastify's `preValidation` lifecycle hook so unauthenticated payloads are rejected with `401`/`403` before schema validation or Redis operations execute:

```typescript
import crypto from 'node:crypto';

export function verifyMetaHubSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!rawBody || !signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const receivedHex = signatureHeader.slice('sha256='.length);
  if (!/^[0-9a-fA-F]{64}$/.test(receivedHex)) {
    return false;
  }

  const receivedBuffer = Buffer.from(receivedHex, 'hex');
  const expectedBuffer = crypto.createHmac('sha256', appSecret).update(rawBody).digest();

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}
```

---

## 3. Edge Filtering: Instagram `is_echo` and WhatsApp `statuses`

Before publishing to the FSM inbound queue:

1. **Instagram Echoes**: Outbound API messages sent by your own platform trigger a webhook callback on Instagram with `message.is_echo: true`. Discard these immediately at the adapter edge so the workflow engine never replies to itself in an infinite loop.
2. **WhatsApp Lifecycle Statuses**: Delivery receipts (`sent`, `delivered`, `read`, `failed`) arrive inside `entry[].changes[].value.statuses[]`. Route these to `omnichannel-status-telemetry` rather than the FSM execution queue.

---

## 4. Two-Layer Idempotency (`SET NX EX` + BullMQ Deduplication)

When Meta retries a webhook due to transient network jitter, two protection layers absorb duplicates:

### Layer 1: State Redis Atomic `SET ... EX 86400 NX`

Every WhatsApp message carries a globally unique `wamid` and every Instagram event carries a `mid` (or deterministic postback composite ID). At ingress:

```typescript
const dedupKey = `dedup:msg:${envelope.externalAccountId}:${envelope.externalMessageId}`;
const acquired = await redisState.set(dedupKey, '1', 'EX', 86_400, 'NX');

if (acquired !== 'OK') {
  // Duplicate delivery within 24h window -> acknowledge 200 OK as safe no-op
  return;
}
```

### Layer 2: BullMQ Native Job Deduplication

When adding the canonical envelope to `omnichannel-inbound-webhook`, pass BullMQ's native `deduplication` option (`bullmq` v6):

```typescript
await inboundQueue.add('process-inbound-envelope', envelope, {
  deduplication: {
    id: `inbound:${envelope.externalAccountId}:${envelope.externalMessageId}`,
    ttl: 300_000,
  },
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2_000,
    jitter: 0.5,
  },
  removeOnComplete: { age: 300, count: 1_000 },
  removeOnFail: { age: 86_400, count: 5_000 },
});
```

---

## Canonical Upstream Sources

- Fastify v5 `addContentTypeParser` (`parseAs: 'buffer'`): Context7 `/fastify/fastify/v5.12.7` (`docs/Reference/ContentTypeParser.md`)
- BullMQ v6 Job Deduplication & Exponential Backoff with Jitter: Context7 `/websites/bullmq_io` (`guide/jobs/deduplication`, `guide/retrying-failing-jobs`)
- ioredis v6 `SET` with `EX` and `NX`: Context7 `/redis/ioredis/v6.0.0` (`README.md`)
- Meta Graph API Webhook Payload Verification: `https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests`
