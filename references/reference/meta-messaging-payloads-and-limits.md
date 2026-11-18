# Reference: Meta Messaging Payloads, Limits, and Error Codes

Technical reference for WhatsApp Cloud API (`v22.0+`) and Instagram Messaging API (`v22.0+`) wire schemas, platform structural constraints, and runtime error codes handled by `@tupynambalucas-dev/omnichannel` ([`constants.ts`](../../core/src/constants.ts), [`ui-block.schema.ts`](../../core/src/schemas/ui-block.schema.ts), [`outbound.compiler.ts`](../../api/src/domains/compiler/outbound.compiler.ts), and [`meta-graph.client.ts`](../../api/src/domains/compiler/meta-graph.client.ts)).

---

## 1. Platform Structural Constraints Matrix

| Constraint                | WhatsApp Cloud API (`WHATSAPP_LIMITS`)                           | Instagram Messaging API (`INSTAGRAM_LIMITS`)                             | Polymorphic Compiler Rule (`compileOutboundMessages`)                                             |
| :------------------------ | :--------------------------------------------------------------- | :----------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------ |
| **Customer Care Window**  | `MESSAGING_WINDOW_HOURS = 24`                                    | `MESSAGING_WINDOW_HOURS = 24`                                            | Checked via `session.windowExpiresAt`; expired Instagram windows fail with subcode `2534022`.     |
| **Max Text Body Length**  | `MAX_BODY_TEXT_LENGTH = 1024` (interactive/schema ceiling)       | `MAX_TEXT_LENGTH = 1000`                                                 | Truncated automatically per channel limit in `outbound.compiler.ts`.                              |
| **Direct Reply Buttons**  | `MAX_REPLY_BUTTONS = 3` (`interactive.type: "button"`)           | `MAX_TEMPLATE_BUTTONS = 3` (`button` template) or `13` quick replies     | `QUICK_CHOICES` (`1..3` options) -> WhatsApp `button` / Instagram `quick_replies`.                |
| **Menu / List Selection** | `MAX_LIST_ROWS = 10` (`interactive.type: "list"`)                | `MAX_QUICK_REPLIES = 13` (`quick_replies`)                               | `QUICK_CHOICES` (`> 3` options) or `MENU_CHOICES` -> WhatsApp `list` / Instagram `quick_replies`. |
| **Option Title Length**   | `MAX_BUTTON_TITLE_LENGTH = 20`, `MAX_LIST_ROW_TITLE_LENGTH = 24` | `MAX_QUICK_REPLY_TITLE_LENGTH = 20`                                      | Validated in `AbstractActionOptionSchema` and truncated at compile time if needed.                |
| **Row Description**       | `MAX_LIST_ROW_DESCRIPTION_LENGTH = 72`                           | Not rendered in quick replies                                            | Included in WhatsApp `list` rows when present.                                                    |
| **Header / Footer Text**  | `MAX_HEADER_TEXT_LENGTH = 60`, `MAX_FOOTER_TEXT_LENGTH = 60`     | Prepended/appended into message text body on Instagram                   | Native `header`/`footer` on WhatsApp; merged into text body on Instagram.                         |
| **External Link CTA**     | `interactive.type: "cta_url"`                                    | `template_type: "button"` (`type: "web_url"`)                            | Compiled polymorphically from `CTA_URL` (`CtaUrlBlockSchema`).                                    |
| **Carousel Cards**        | Text + `cta_url` fallback per card                               | `MAX_CAROUSEL_ELEMENTS = 10` (`template_type: "generic"`, title `<= 80`) | Validated against `INSTAGRAM_LIMITS.MAX_CAROUSEL_ELEMENTS` in `CarouselCardsBlockSchema`.         |

---

## 2. Outbound Wire Payloads

### 2.1 WhatsApp Reply Buttons (`POST /{VERSION}/{PHONE_NUMBER_ID}/messages`)

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999998888",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "header": { "type": "text", "text": "Customer Center" },
    "body": { "text": "Select the desired service:" },
    "footer": { "text": "Tap an option below" },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": { "id": "opt_invoice", "title": "Open Invoice" }
        },
        {
          "type": "reply",
          "reply": { "id": "opt_support", "title": "Human Support" }
        }
      ]
    }
  }
}
```

### 2.2 WhatsApp Interactive List (`MENU_CHOICES` or `QUICK_CHOICES` with `4..10` Options)

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999998888",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "body": { "text": "Choose a department:" },
    "action": {
      "button": "View Options",
      "sections": [
        {
          "title": "Departments",
          "rows": [
            { "id": "dept_billing", "title": "Billing", "description": "Invoices and payments" },
            { "id": "dept_tech", "title": "Technical", "description": "Connectivity assistance" }
          ]
        }
      ]
    }
  }
}
```

### 2.3 WhatsApp Call-To-Action URL (`cta_url`)

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999998888",
  "type": "interactive",
  "interactive": {
    "type": "cta_url",
    "body": { "text": "Your invoice is ready for download." },
    "action": {
      "name": "cta_url",
      "parameters": {
        "display_text": "Download PDF",
        "url": "https://billing.example.com/invoices/inv_01"
      }
    }
  }
}
```

### 2.4 Instagram Quick Replies (`POST /{VERSION}/{IG_ACCOUNT_ID}/messages`)

```json
{
  "recipient": { "id": "17841400000000000" },
  "messaging_type": "RESPONSE",
  "message": {
    "text": "Select the desired service:",
    "quick_replies": [
      { "content_type": "text", "title": "Open Invoice", "payload": "opt_invoice" },
      { "content_type": "text", "title": "Human Support", "payload": "opt_support" }
    ]
  }
}
```

### 2.5 Instagram Button Template (`web_url` / `postback`)

```json
{
  "recipient": { "id": "17841400000000000" },
  "messaging_type": "RESPONSE",
  "message": {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": "Your invoice is ready for download.",
        "buttons": [
          {
            "type": "web_url",
            "url": "https://billing.example.com/invoices/inv_01",
            "title": "Download PDF"
          }
        ]
      }
    }
  }
}
```

---

## 3. Inbound Webhook Extraction Mapping (`CanonicalInboundEnvelope`)

| Source Event                         | `channelAccountId`               | `endUserId`           | `providerMessageId` | `interactiveReply.payloadId`      | `text`                               |
| :----------------------------------- | :------------------------------- | :-------------------- | :------------------ | :-------------------------------- | :----------------------------------- |
| WhatsApp `text`                      | `value.metadata.phone_number_id` | `msg.from`            | `msg.id` (`wamid`)  | `undefined`                       | `msg.text.body`                      |
| WhatsApp `interactive.button_reply`  | `value.metadata.phone_number_id` | `msg.from`            | `msg.id` (`wamid`)  | `msg.interactive.button_reply.id` | `msg.interactive.button_reply.title` |
| WhatsApp `interactive.list_reply`    | `value.metadata.phone_number_id` | `msg.from`            | `msg.id` (`wamid`)  | `msg.interactive.list_reply.id`   | `msg.interactive.list_reply.title`   |
| WhatsApp Template `button`           | `value.metadata.phone_number_id` | `msg.from`            | `msg.id` (`wamid`)  | `msg.button.payload`              | `msg.button.text`                    |
| Instagram `message` (text)           | `entry.id`                       | `messaging.sender.id` | `message.mid`       | `undefined`                       | `message.text`                       |
| Instagram `message.quick_reply`      | `entry.id`                       | `messaging.sender.id` | `message.mid`       | `message.quick_reply.payload`     | `message.text`                       |
| Instagram `postback`                 | `entry.id`                       | `messaging.sender.id` | `postback.mid`      | `postback.payload`                | `postback.title`                     |
| Instagram `message.is_echo === true` | `entry.id`                       | `messaging.sender.id` | `message.mid`       | **Discarded at ingress**          | **Discarded at ingress**             |

---

## 4. Meta Graph Error Classification (`META_ERROR_CODES` & `MetaGraphDispatchError`)

| Code / Subcode                               | Constant                                            | Classification            | Outbound Worker Action (`outbound-dispatch.worker.ts`)                                   |
| :------------------------------------------- | :-------------------------------------------------- | :------------------------ | :--------------------------------------------------------------------------------------- |
| `130429` or HTTP `429`                       | `META_ERROR_CODES.WA_THROUGHPUT_LIMIT`              | `isRateLimitError = true` | Calls `await outboundQueue.rateLimit(retryAfterMs ?? 5000)` + `Worker.RateLimitError()`. |
| `131056`                                     | `META_ERROR_CODES.WA_PAIR_RATE_LIMIT`               | `isRateLimitError = true` | Calls `await outboundQueue.rateLimit(retryAfterMs ?? 5000)` + `Worker.RateLimitError()`. |
| `131026`                                     | `META_ERROR_CODES.WA_UNDELIVERABLE_OR_WINDOW`       | `isPermanentPolicyError`  | Logs warning and throws `UnrecoverableError` to abort futile retries.                    |
| `131047`                                     | `META_ERROR_CODES.WA_REENGAGEMENT_REQUIRED`         | `isPermanentPolicyError`  | Logs warning and throws `UnrecoverableError` (24h window expired on WhatsApp).           |
| `10` with subcode `2534022`                  | `IG_POLICY_VIOLATION` + `IG_OUTSIDE_WINDOW_SUBCODE` | `isPermanentPolicyError`  | Logs warning and throws `UnrecoverableError` (24h window expired on Instagram).          |
| Any other HTTP `4xx` (`400..499`, not `429`) | —                                                   | `isPermanentPolicyError`  | Logs warning and throws `UnrecoverableError`.                                            |

---

## Canonical Upstream Sources

- WhatsApp Cloud API — Interactive Messages Reference: `https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#interactive-messages` (retrieved 2026-11-17)
- WhatsApp Cloud API — Error Codes Reference: `https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes` (retrieved 2026-11-17)
- Instagram Messaging API — Quick Replies & Generic Templates: `https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api` (retrieved 2026-11-17)
