# Reference: Queues, Redis Keys, and Retry Policies

Complete specification of BullMQ queues, worker concurrency, rate-limiting policies, and State Redis key patterns defined in [`core/src/constants.ts`](../../core/src/constants.ts), [`queuePlugin.ts`](../../api/src/plugins/queuePlugin.ts), [`inbound-webhook.worker.ts`](../../api/src/queues/inbound-webhook.worker.ts), [`outbound-dispatch.worker.ts`](../../api/src/queues/outbound-dispatch.worker.ts), [`webhook.service.ts`](../../api/src/domains/webhooks/webhook.service.ts), and [`session-state.repository.ts`](../../api/src/domains/workflow/session-state.repository.ts).

---

## 1. BullMQ Queues (`QUEUE_NAMES`)

All queues connect to `REDIS_QUEUE_URL` (`maxmemory-policy: noeviction`):

| Constant                        | Queue Name                      | Worker Concurrency | Attempts | Backoff Policy                              | Job Retention (`removeOnComplete` / `removeOnFail`) |
| :------------------------------ | :------------------------------ | :----------------: | :------: | :------------------------------------------ | :-------------------------------------------------- |
| `QUEUE_NAMES.INBOUND_EVENTS`    | `omnichannel-inbound-events`    |        `16`        |   `5`    | Exponential, `delay: 1000ms`, `jitter: 0.3` | `{ count: 1000 }` / `{ count: 5000 }`               |
| `QUEUE_NAMES.OUTBOUND_DISPATCH` | `omnichannel-outbound-dispatch` |        `12`        |   `6`    | Exponential, `delay: 1500ms`, `jitter: 0.4` | `{ count: 1000 }` / `{ count: 5000 }`               |
| `QUEUE_NAMES.DELAYED_TIMERS`    | `omnichannel-delayed-timers`    |        `8`         |   `4`    | Exponential, `delay: 1000ms` (no jitter)    | `{ count: 1000 }` / `{ count: 2500 }`               |

### 1.1 Queue Deduplication & Job IDs

- **Inbound Envelopes (`omnichannel-inbound-events`)**:
  - Job name: `'inbound-event'`
  - BullMQ deduplication: `{ id: "${envelope.channel}:${envelope.providerMessageId}", ttl: 86_400_000 }` (24 hours).
- **Outbound Dispatch (`omnichannel-outbound-dispatch`)**:
  - Job name: `'dispatch-message'`
  - BullMQ deduplication: `{ id: job.idempotencyKey, ttl: 60_000 }` (60 seconds).
  - Rate limiter: `limiter: { max: 60, duration: 1000 }` (60 messages/second).
  - Reactive rate-limit pause: When Meta returns HTTP `429` or error codes `130429` / `131056`, the worker calls `await options.outboundQueue.rateLimit(error.retryAfterMs ?? 5000)` and throws `Worker.RateLimitError()`.
- **Delayed Timers (`omnichannel-delayed-timers`)**:
  - Job name: `'resume-delayed-session'`
  - Deterministic `jobId`: `timer:${payload.sessionId}:${payload.targetNodeId}` with `delay: payload.delaySeconds * 1000`.

---

## 2. State Redis Key Patterns & TTLs (`REDIS_TTL_SECONDS`)

All hot-state and synchronization keys live in `REDIS_STATE_URL` (`maxmemory-policy: volatile-ttl`):

| Key Pattern                                 | Constant                                      | TTL (Seconds) | Redis Command                                           | Purpose                                                                                                  |
| :------------------------------------------ | :-------------------------------------------- | :-----------: | :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------- |
| `dedup:msg:${channel}:${providerMessageId}` | `REDIS_TTL_SECONDS.WEBHOOK_DEDUPLICATION`     |   `86,400`    | `SET key "1" EX 86400 NX`                               | First-layer 24h idempotency barrier absorbing duplicate Meta webhook deliveries at ingress.              |
| `lock:conv:${conversationKey}`              | `REDIS_TTL_SECONDS.CONVERSATION_MUTEX_LOCK`   |     `30`      | `SET key ownerUuidV7 EX 30 NX` + Lua compare-and-delete | Per-conversation FIFO mutex lock. Contended jobs reschedule `250ms` ahead (`CONTENDED_LOCK_REQUEUE_MS`). |
| `session:${tenantId}:${conversationKey}`    | `REDIS_TTL_SECONDS.ACTIVE_SESSION_CHECKPOINT` |   `86,400`    | `SET key JSON.stringify(session) EX 86400` / `GET key`  | Sub-millisecond hot cache for active `ConversationSession` state (rehydrated from PostgreSQL on miss).   |

### 2.1 Canonical `conversationKey` Formats

Constructed at ingress by the channel adapters:

- **WhatsApp (`whatsapp.adapter.ts`)**: `wa:${phoneNumberId}:${fromWaId}`
- **Instagram (`instagram.adapter.ts`)**: `ig:${recipientId}:${senderId}`

---

## Canonical Upstream Sources

- BullMQ v6 Rate Limiting (`queue.rateLimit`, `Worker.RateLimitError`) & Job Deduplication: `https://docs.bullmq.io/guide/rate-limiting` and `https://docs.bullmq.io/guide/jobs/deduplication` (Context7 `/websites/bullmq_io`, retrieved 2026-11-17)
- ioredis v6 Atomic `SET ... EX ... NX` & `eval`: `https://github.com/redis/ioredis` (Context7 `/redis/ioredis/v6.0.0`, retrieved 2026-11-17)
