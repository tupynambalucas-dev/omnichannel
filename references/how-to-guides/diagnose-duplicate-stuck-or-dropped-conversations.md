# How-To Guide: Diagnose Duplicate, Stuck, or Dropped Conversations

This guide provides step-by-step diagnostic procedures when a customer message appears to be dropped, a conversation is unresponsive, or outbound replies fail to deliver.

---

## 1. Symptom: Webhook Returns `200 OK` with `"deduplicatedDrops": 1`

### Cause

State Redis already holds a 24-hour idempotency key for that `providerMessageId`:

```text
dedup:msg:${channel}:${providerMessageId}
```

### Diagnosis & Resolution

1. Check whether the key exists and inspect its remaining TTL in State Redis (`REDIS_STATE_URL`):
   ```bash
   redis-cli -u "$REDIS_STATE_URL" TTL "dedup:msg:whatsapp:wamid.HBgM..."
   ```
2. If you are intentionally replaying a synthetic test fixture with a static `wamid` or `mid`, delete the key before re-sending:
   ```bash
   redis-cli -u "$REDIS_STATE_URL" DEL "dedup:msg:whatsapp:wamid.HBgM..."
   ```

---

## 2. Symptom: Inbound Messages Are Accepted (`"acceptedMessages": 1`), But No Bot Reply Is Sent

### Case A: Channel Account Is Unregistered or Has No Active Workflow

Check application logs for:

```text
Ignoring inbound webhook for unregistered or inactive channel account.
```

Verify that `tenant_channels` has an active row (`is_active = true`) matching `(channel, channelAccountId)` and a non-null `active_workflow_id`.

### Case B: Session Is Parked in `HUMAN_HANDOFF` or `OPTED_OUT`

When `session.status` is `'HUMAN_HANDOFF'` or `'OPTED_OUT'`, `WorkflowEngine` intentionally suppresses automated replies (unless the user sends a global reset keyword such as `MENU`, `INICIO`, `REINICIAR`, or `START`).

Inspect the cached session in State Redis:

```bash
redis-cli -u "$REDIS_STATE_URL" GET "session:<TENANT_UUID>:wa:<PHONE_NUMBER_ID>:<USER_WA_ID>"
```

To reset the session back to the entry menu without waiting for the user to send `MENU`, delete the Redis session key and update `conversation_sessions.status = 'COMPLETED'` inside a tenant-scoped PostgreSQL transaction.

### Case C: Per-Conversation Mutex Lock Contention

If a worker crashed mid-step while holding `lock:conv:${conversationKey}`, subsequent messages reschedule by `250ms` until the 30-second lock TTL (`REDIS_TTL_SECONDS.CONVERSATION_MUTEX_LOCK`) expires. Check the lock TTL:

```bash
redis-cli -u "$REDIS_STATE_URL" TTL "lock:conv:wa:<PHONE_NUMBER_ID>:<USER_WA_ID>"
```

---

## 3. Symptom: Outbound Dispatch Worker Logs `MetaGraphDispatchError`

| Log Message / Meta Error Code                                               | Root Cause                                                                 | Action                                                                                         |
| :-------------------------------------------------------------------------- | :------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| `Access token secret reference "..." is not present in runtime environment` | The env var named in `tenant_channels.access_token_secret_ref` is missing. | Export the variable in Infisical / `.env` and restart the API worker.                          |
| `metaCode: 130429` or `131056` / HTTP `429`                                 | Meta Cloud API or pair rate limit reached.                                 | Automatic: worker calls `outboundQueue.rateLimit()` and retries after pause.                   |
| `metaCode: 131026` or `131047` (WhatsApp) / `10` with `2534022` (Instagram) | Recipient undeliverable or 24-hour customer care window expired.           | Worker halts retries via `UnrecoverableError`. Use an approved WhatsApp Template to re-engage. |

---

## Canonical Upstream Sources

- Queues, Redis Keys, and Retry Policies Reference: [`references/reference/queues-redis-keys-and-retry-policies.md`](../reference/queues-redis-keys-and-retry-policies.md)
- Meta Messaging Payloads, Limits, and Error Codes Reference: [`references/reference/meta-messaging-payloads-and-limits.md`](../reference/meta-messaging-payloads-and-limits.md)
