# Explanation: Conversation State, FIFO Ordering, and Checkpointing

This document explains how `@tupynambalucas-dev/omnichannel-api` prevents race conditions when a customer sends rapid consecutive messages, why Redis is split into two isolated roles, and how state checkpointing protects conversations across external HTTP calls and cache restarts.

---

## 1. The Per-Conversation Concurrency Problem

In a multi-tenant BullMQ worker pool (`concurrency: 16` on `omnichannel-inbound-events`), processing jobs in parallel across different customers is essential for throughput. However, if a single customer taps an interactive button and immediately sends a follow-up text message within milliseconds, two concurrent workers can pick up both messages for the **same** `conversationKey` at the same time.

Without per-conversation serialization, both workers read the same `currentNodeId`, execute conflicting transitions concurrently, and overwrite each other's `ConversationSession` checkpoint (`lost update` anomaly).

---

## 2. Partitioned Per-Conversation Mutex Lock (`lock:conv:${conversationKey}`)

To preserve high global concurrency across tenants while enforcing strict sequential execution per user conversation, [`inbound-webhook.worker.ts`](../../api/src/queues/inbound-webhook.worker.ts) wraps every inbound job and delayed timer job in `withConversationMutex()`:

1. **Deterministic Partition Key**: Channel adapters assign `conversationKey` as `wa:${phoneNumberId}:${fromWaId}` or `ig:${recipientId}:${senderId}`.
2. **Atomic Lock Acquisition**: Before calling `WorkflowEngine`, the worker generates a UUIDv7 owner token and executes:
   ```text
   SET lock:conv:${conversationKey} ${lockOwnerToken} EX 30 NX
   ```
3. **Non-Destructive Contention Rescheduling**: If another worker already holds the lock for that `conversationKey`, the contended worker calls `await job.moveToDelayed(Date.now() + 250, token)` and throws BullMQ's `DelayedError()`. This reschedules the second message `250ms` into the future **without** incrementing job failure attempts.
4. **Lua Compare-and-Delete Release**: In the `finally` block, a Lua script verifies `redis.call("get", KEYS[1]) == ARGV[1]` before deleting the lock so an expired lock can never delete a newer worker's lock.

---

## 3. Why Queue Redis and State Redis Are Isolated

BullMQ job queues and ephemeral session/deduplication caches have incompatible memory eviction requirements:

- **Queue Redis (`REDIS_QUEUE_URL`)**: Must enforce `maxmemory-policy noeviction`. If Redis evicts internal BullMQ stream or job keys under memory pressure, queue state becomes corrupted and jobs stall permanently.
- **State Redis (`REDIS_STATE_URL`)**: Stores 24-hour deduplication keys (`dedup:msg:*`), 24-hour session checkpoints (`session:*`), and 30-second conversation locks (`lock:conv:*`), all of which carry explicit TTLs and are designed for `volatile-ttl` management.

---

## 4. Two-Tier Session Checkpointing and Pre-HTTP Safety

[`SessionStateRepository`](../../api/src/domains/workflow/session-state.repository.ts) coordinates State Redis and Cloud PostgreSQL:

1. **Sub-Millisecond Hot Reads**: Active sessions are read from `session:${tenantId}:${conversationKey}` in State Redis.
2. **Transparent PostgreSQL Rehydration**: On a Redis cache miss or restart, `getOrRehydrateSession()` queries `conversation_sessions` inside `withTenantContext()`, restores the session into State Redis with a 24-hour TTL, and resumes execution without losing user context.
3. **Pre-HTTP Checkpointing**: Before executing an `HTTP_REQUEST` node in [`WorkflowEngine`](../../api/src/domains/workflow/workflow.engine.ts), the engine persists a checkpoint with `currentNodeId: node.id` and `status: 'ACTIVE'`, increments `stateVersion`, and bounds the external `fetch()` call with `AbortSignal.timeout(node.timeoutMs)` before routing deterministically to `onSuccessNodeId` or `onErrorNodeId`.

---

## Canonical Upstream Sources

- BullMQ v6 Delayed Jobs & Manual Job Movement (`job.moveToDelayed`, `DelayedError`): `https://docs.bullmq.io` (Context7 `/websites/bullmq_io`, retrieved 2026-11-17)
- Redis Distributed Locks & Atomic Lua Evaluation: `https://redis.io/docs/latest/develop/use/patterns/distributed-locks/` (retrieved 2026-11-17)
