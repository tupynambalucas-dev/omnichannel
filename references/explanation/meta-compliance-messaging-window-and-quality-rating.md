# Explanation: Meta Compliance, 24-Hour Messaging Window, and Quality Rating

This document explains how `@tupynambalucas-dev/omnichannel` enforces Meta's 24-hour customer service window, instant opt-out audit trails (`LGPD` / `GDPR` / Meta Business Policy), and outbound rate-limit governance to protect account quality ratings.

---

## 1. The 24-Hour Customer Care Messaging Window

Both **WhatsApp Cloud API** and **Instagram Messaging API** restrict free-form text and interactive messages (`button`, `list`, `cta_url`, `quick_replies`, `generic`) to a **24-hour window** starting from the customer's most recent inbound message (`MESSAGING_WINDOW_HOURS = 24` in `core/src/constants.ts`):

- **Window Renewal on Inbound Interaction**: Every time [`WorkflowEngine.processInboundEnvelope`](../../api/src/domains/workflow/workflow.engine.ts) receives an inbound customer event, it computes `windowExpiresAt = new Date(now + 24 * 3600 * 1000).toISOString()` and persists it in `ConversationSession`.
- **Outside-Window Enforcement**:
  - On WhatsApp, free-form messages sent after 24 hours fail with Meta error code `131047` (`WA_REENGAGEMENT_REQUIRED`) or `131026` (`WA_UNDELIVERABLE_OR_WINDOW`), requiring an approved WhatsApp Template message to reopen the session.
  - On Instagram, messages sent after 24 hours fail with code `10` and subcode `2534022` (`IG_OUTSIDE_WINDOW_SUBCODE`).

---

## 2. Global Opt-Out Compliance and Regulatory Audit Trail

Meta Business Messaging Policies and data-protection regulations (`LGPD` and `GDPR`) require businesses to honor user opt-out requests immediately and retain verifiable consent records:

1. **Pre-Node Global Keyword Interception**: Before evaluating the current FSM node, `WorkflowEngine` checks whether the user's trimmed uppercase text matches `GLOBAL_OPT_OUT_KEYWORDS` (`STOP`, `SAIR`, `PARAR`, `CANCELAR`, `UNSUBSCRIBE`).
2. **Immediate Session Suspension**: On a match, the session transitions to `status: 'OPTED_OUT'`, suspending all automated workflow transitions.
3. **Immutable Audit Record (`opt_in_audit_trail`)**: `SessionStateRepository.recordOptInAudit()` writes an `OptInAuditRecord` with `optedIn: false`, `source: 'USER_STOP_KEYWORD'`, and `evidenceMetadata: { triggerKeyword, providerMessageId }`. Similarly, when a new session starts from a user message, it records `optedIn: true` with `source: 'INBOUND_USER_MESSAGE'`.

---

## 3. Outbound Pacing and Account Quality Rating Protection

Repeatedly hitting Meta throughput limits or retrying undeliverable recipients degrades a WhatsApp phone number's **Quality Rating** (`Green` -> `Yellow` -> `Red`) and restricts messaging tier upgrades.

[`outbound-dispatch.worker.ts`](../../api/src/queues/outbound-dispatch.worker.ts) and [`MetaGraphClient`](../../api/src/domains/compiler/meta-graph.client.ts) enforce two protective policies:

1. **Proactive Rate Limiting & Reactive Pause**:
   - The `omnichannel-outbound-dispatch` worker enforces a proactive BullMQ limiter (`max: 60, duration: 1000`).
   - If Meta returns HTTP `429`, error `130429` (`WA_THROUGHPUT_LIMIT`), or `131056` (`WA_PAIR_RATE_LIMIT`), the worker pauses the entire queue for `retryAfterMs ?? 5000` ms via `await outboundQueue.rateLimit(...)` and throws `Worker.RateLimitError()` so the job is retried cleanly without burning retry attempts.
2. **Immediate Halt on Permanent Policy Errors**:
   - If Meta returns `131026`, `131047`, Instagram `10`/`2534022`, or any non-429 `4xx` status, `MetaGraphDispatchError` sets `isPermanentPolicyError = true` and the worker throws BullMQ's `UnrecoverableError`, aborting all remaining retry attempts immediately.

---

## Canonical Upstream Sources

- Meta WhatsApp Cloud API — Throughput & Rate Limits: `https://developers.facebook.com/docs/whatsapp/cloud-api/guides/throughput` (retrieved 2026-11-17)
- Meta WhatsApp Cloud API — Error Codes (`130429`, `131026`, `131047`, `131056`): `https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes` (retrieved 2026-11-17)
- Instagram Messaging API — Messaging Window & Error Subcode `2534022`: `https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api` (retrieved 2026-11-17)
