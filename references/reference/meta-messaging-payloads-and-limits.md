# Reference: Meta Messaging Payloads, Limits, and Error Codes

Technical reference for WhatsApp Cloud API (`v22.0+`) and Instagram Messaging API (`v22.0+`) wire schemas, platform structural constraints, and runtime error codes handled by `@tupynambalucas-dev/omnichannel`.

---

## 1. Platform Structural Constraints Matrix

| Constraint                | WhatsApp Cloud API                             | Instagram Messaging API                                          | Polymorphic Compiler Rule                                                                   |
| :------------------------ | :--------------------------------------------- | :--------------------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| **Customer Care Window**  | 24 hours from last user message                | 24 hours from last user message                                  | Outside 24h: WhatsApp requires approved Template; Instagram rejects with subcode `2534022`. |
| **Max Text Body Length**  | `4,096` characters                             | `1,000` characters                                               | Truncate or split bodies exceeding channel ceiling.                                         |
| **Direct Reply Buttons**  | Max `3` (`interactive.type: "button"`)         | Max `3` (`template_type: "button"`) or `13` (`quick_replies`)    | `1..3` options -> WhatsApp `button` / Instagram `quick_replies`.                            |
| **Menu / List Selection** | `4..10` rows (`interactive.type: "list"`)      | Up to `13` pills (`quick_replies`)                               | `4..10` options -> auto-compiled to WhatsApp `list` and Instagram `quick_replies`.          |
| **Option Title Length**   | `20` chars (`button`), `24` chars (`list` row) | `20` chars (`quick_replies` / `button`)                          | Enforce `<= 20` character label budget in `AbstractOptionSchema`.                           |
| **External Link CTA**     | `interactive.type: "cta_url"`                  | `template_type: "button"` (`type: "web_url"`)                    | Compiled polymorphically from `CTA_URL` UI block.                                           |
| **Carousel Cards**        | Multi-card interactive / template              | Max `10` cards (`template_type: "generic"`, title `<= 80` chars) | Validated against `MAX_GENERIC_CARDS = 10`.                                                 |
| **Default Throughput**    | `80` msg/s (`20` msg/s in Coexistence mode)    | Subject to Graph API app-level rate limits                       | Controlled by BullMQ outbound rate limiter.                                                 |

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

### 2.2 WhatsApp Interactive List (`4..10` Options)

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

## 3. Inbound Webhook Extraction Mapping

| Source Event                         | External Account ID              | Sender ID             | Message ID         | Immutable `payload` Field         | Visible `text` Field                 |
| :----------------------------------- | :------------------------------- | :-------------------- | :----------------- | :-------------------------------- | :----------------------------------- |
| WhatsApp `text`                      | `value.metadata.phone_number_id` | `msg.from`            | `msg.id` (`wamid`) | `undefined`                       | `msg.text.body`                      |
| WhatsApp `interactive.button_reply`  | `value.metadata.phone_number_id` | `msg.from`            | `msg.id` (`wamid`) | `msg.interactive.button_reply.id` | `msg.interactive.button_reply.title` |
| WhatsApp `interactive.list_reply`    | `value.metadata.phone_number_id` | `msg.from`            | `msg.id` (`wamid`) | `msg.interactive.list_reply.id`   | `msg.interactive.list_reply.title`   |
| WhatsApp Template `button`           | `value.metadata.phone_number_id` | `msg.from`            | `msg.id` (`wamid`) | `msg.button.payload`              | `msg.button.text`                    |
| Instagram `message` (text)           | `entry.id`                       | `messaging.sender.id` | `message.mid`      | `undefined`                       | `message.text`                       |
| Instagram `message.quick_reply`      | `entry.id`                       | `messaging.sender.id` | `message.mid`      | `message.quick_reply.payload`     | `message.text`                       |
| Instagram `postback`                 | `entry.id`                       | `messaging.sender.id` | `postback.mid`     | `postback.payload`                | `postback.title`                     |
| Instagram `message.is_echo === true` | `entry.id`                       | `messaging.sender.id` | `message.mid`      | **Discarded at ingress**          | **Discarded at ingress**             |

---

## 4. Meta Graph Error Classification

| Code / Subcode           | Channel          | Meaning                                             | Gateway Action                                                         |
| :----------------------- | :--------------- | :-------------------------------------------------- | :--------------------------------------------------------------------- |
| `130429` / HTTP `429`    | WhatsApp / Graph | Cloud API throughput rate limit exceeded            | Invoke `worker.rateLimit(duration)` + throw `Worker.RateLimitError()`. |
| `131026`                 | WhatsApp         | Recipient undeliverable / not on WhatsApp / blocked | Mark contact undeliverable and throw `UnrecoverableError`.             |
| `10` (subcode `2534022`) | Instagram        | Sent outside allowed 24-hour customer care window   | Expire active session window and throw `UnrecoverableError`.           |
| `190`                    | Both             | Access token expired or revoked                     | Alert tenant channel status and halt dispatch.                         |

---

## Canonical Upstream Sources

- WhatsApp Cloud API — Interactive Messages Reference: `https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#interactive-messages`
- WhatsApp Cloud API — Error Codes Reference: `https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes`
- Instagram Messaging API — Quick Replies & Generic Templates: `https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api`
