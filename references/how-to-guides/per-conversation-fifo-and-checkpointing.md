# How-To Guide: Per-Conversation FIFO Ordering and State Checkpointing

In high-concurrency multi-tenant messaging, setting global worker concurrency to `1` bottlenecks thousands of unrelated customers, whereas setting `concurrency: 20` without partitioning allows two rapid messages from the **same** user (e.g., tapping a button and immediately sending text) to execute in parallel and corrupt `current_node_id`.

This guide explains how `@tupynambalucas-dev/omnichannel-api` enforces **Per-Conversation FIFO** serialization, **Atomic State Checkpointing** before external HTTP calls, **Outbound Rate-Limit Pacing**, and **PostgreSQL Rehydration**.

---

## 1. Partitioned Per-Conversation Mutex Lock

Every inbound envelope computes a deterministic conversation partition key:

```text
groupKey = ${tenantId}:${channel}:${senderExternalId}
```

Before executing a step on `WorkflowEngine`, the inbound worker acquires a short-lived, token-owned Redis mutex (`lock:conv:${groupKey}`) using `SET key token PX 15000 NX`, releasing it atomically via Lua compare-and-delete:

```lua
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
```

If another worker is currently processing an earlier message for the **exact same user conversation**, the second job reschedules itself via `job.moveToDelayed(Date.now() + 150, token)` without incrementing failure attempts—preserving strict sequential execution per user while processing thousands of distinct conversations concurrently.

---

## 2. Two-Tier Session Persistence with Automatic Rehydration

Active conversations are stored at `session:${tenantId}:${channel}:${contactExternalId}` in **State Redis** (TTL 24 hours, matching Meta's customer service window).

1. **Hot Path (Cache Hit)**: Worker reads JSON session state from Redis in `< 1 ms`.
2. **Cold Path (Cache Miss / Redis Restart)**: Worker queries `conversation_sessions` in PostgreSQL inside `withTenantContext(tenantId, ...)` (enforcing RLS), restores the exact `current_node_id`, `workflow_version_id`, and `context_variables` into State Redis, and resumes seamlessly.
3. **Transactional Commit**: After computing a valid transition, the worker updates both State Redis and PostgreSQL (`conversation_sessions` + `messages_log`).

---

## 3. Pre-Integration Checkpointing (`HTTP_REQUEST` Nodes)

When a transition enters an `HTTP_REQUEST` node (e.g., querying a tenant ERP to fetch an open invoice):

1. The worker does **not** advance `current_node_id` past the `HTTP_REQUEST` node until the HTTP call completes or resolves to a business status (`404`/`422`).
2. Network timeouts or `5xx` upstream failures throw a retriable error to BullMQ.
3. Because the Redis/PostgreSQL checkpoint remains anchored prior to the mutation, BullMQ retries the job using exponential backoff with `0.5` random jitter (`delay: 2000ms`), preventing thundering-herd retries against recovering tenant ERPs.
4. If all attempts are exhausted, the session safely transitions to a contingency or `HUMAN_HANDOFF` state rather than stranding the customer.

---

## 4. Outbound Rate-Limit Governance (`130429` & `131026`)

All outbound messages pass through `omnichannel-outbound-dispatch`:

- **Proactive Pacing**: Configured with BullMQ `limiter` (`max: 60, duration: 1000` by default; `20/s` when operating in WhatsApp Business App Coexistence mode) to preserve a **Green** Meta Quality Rating.
- **Reactive Backoff on Error `130429` / HTTP `429`**: When Meta signals throughput saturation, the outbound worker invokes `await worker.rateLimit(durationMs)` and throws `Worker.RateLimitError()`, pausing queue consumption cleanly without burning job retry attempts.
- **Permanent Halt on Error `131026` / Subcode `2534022`**: Undeliverable numbers (`131026`) or expired 24-hour Instagram windows (`2534022`) throw BullMQ `UnrecoverableError` to prevent futile retries that harm account health.

---

## Canonical Upstream Sources

- BullMQ v6 `Worker.RateLimitError()`, `worker.rateLimit()`, `UnrecoverableError`, and `job.moveToDelayed()`: Context7 `/websites/bullmq_io` (`guide/rate-limiting`, `patterns/stop-retrying-jobs`, `api/classes/v6.Job.html`)
- node-postgres (`pg`) Client Transactions: Context7 `/brianc/node-postgres` (`docs/pages/features/transactions.mdx`)
- Meta WhatsApp Cloud API Throughput & Error Codes: `https://developers.facebook.com/docs/whatsapp/cloud-api/guides/Throughput`
