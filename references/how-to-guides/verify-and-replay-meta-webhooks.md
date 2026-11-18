# How-To Guide: Verify and Replay Signed Meta Webhooks

This guide shows how to compute a valid `X-Hub-Signature-256` HMAC-SHA256 digest over raw JSON bytes and replay signed WhatsApp or Instagram webhook events against `POST /webhooks/meta`.

---

## Prerequisites

- `@tupynambalucas-dev/omnichannel-api` running (`pnpm api:dev`).
- `META_APP_SECRET` and `META_WEBHOOK_VERIFY_TOKEN` known for the target environment.

---

## 1. Test the `GET /webhooks/meta` Verification Challenge

Verify that the gateway echoes `hub.challenge` when `hub.verify_token` matches `META_WEBHOOK_VERIFY_TOKEN`:

```bash
curl -i "http://localhost:3000/webhooks/meta?hub.mode=subscribe&hub.verify_token=dev-verify-token&hub.challenge=challenge_ok_123"
```

- **If `200 OK` with body `challenge_ok_123`**: The handshake token matches.
- **If `403 Forbidden` (`WEBHOOK_VERIFICATION_FAILED`)**: Ensure `hub.mode` is `subscribe` and `hub.verify_token` matches `META_WEBHOOK_VERIFY_TOKEN` in `.env`.

---

## 2. Generate a Valid `X-Hub-Signature-256` Digest and Send `POST /webhooks/meta`

Because [`verifyMetaHmacSignature`](../../api/src/domains/webhooks/webhook.security.ts) hashes the exact unparsed request buffer (`request.rawBody`), compute the HMAC over the exact string sent on the wire:

```bash
node -e '
  const crypto = require("node:crypto");
  const secret = process.env.META_APP_SECRET || "test-app-secret";
  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_01",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "5511999990000",
                phone_number_id: "106540352242922"
              },
              contacts: [{ profile: { name: "Lucas Tupynamba" }, wa_id: "5511988887777" }],
              messages: [
                {
                  from: "5511988887777",
                  id: "wamid.replay_" + Date.now(),
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: "Ola" }
                }
              ]
            }
          }
        ]
      }
    ]
  });
  const sig = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  fetch("http://localhost:3000/webhooks/meta", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": sig
    },
    body
  })
    .then(async (r) => console.info(r.status, await r.json()));
'
```

---

## 3. Troubleshooting Signature and Deduplication Responses

| Observed Result                            | Cause                                                                             | Resolution                                                                                         |
| :----------------------------------------- | :-------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| `401 INVALID_WEBHOOK_SIGNATURE`            | Header missing, wrong `META_APP_SECRET`, or payload reformatted after signing.    | Sign the exact byte string passed to the HTTP client without reformatting JSON.                    |
| `200 OK` with `"deduplicatedDrops": 1`     | `messages[].id` (`wamid` / `mid`) was already processed within the last 24 hours. | Generate a fresh `providerMessageId` or delete `dedup:msg:{channel}:{providerMessageId}` in Redis. |
| `200 OK` with `"statusUpdatesObserved": 1` | Payload contained `value.statuses[]` delivery receipts rather than user messages. | Expected behavior: delivery receipts do not advance FSM sessions.                                  |

---

## Canonical Upstream Sources

- Meta Graph API Webhooks — Validating Payloads (`X-Hub-Signature-256`): `https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests` (retrieved 2026-11-17)
