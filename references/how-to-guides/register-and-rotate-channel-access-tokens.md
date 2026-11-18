# How-To Guide: Register and Rotate Channel Access Tokens

This guide shows how to bind a WhatsApp `phone_number_id` or Instagram `ig_account_id` to a tenant using `accessTokenSecretRef` and how to rotate compromised or expiring Meta System User tokens without database downtime.

---

## Prerequisites

- An active tenant UUID (`tenantId`).
- Access to Infisical Cloud (or runtime environment configuration) and the Meta Business Settings console.

---

## 1. Register a Channel with a Secret Reference

1. Choose a deterministic environment variable name for the tenant channel token, such as `META_TOKEN_ACME_WA` (or `META_GRAPH_ACCESS_TOKEN` for the default enterprise suite).
2. Store the Meta System User token in Infisical under that key name and inject it into the API runtime (`infisical run -- pnpm start`).
3. Call `POST /api/v1/tenants/:tenantId/channels` passing the **variable name** in `accessTokenSecretRef`:

```bash
curl -X POST "http://localhost:3000/api/v1/tenants/<TENANT_UUID>/channels" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "whatsapp",
    "channelAccountId": "106540352242922",
    "displayHandle": "whatsapp:+5511999990000",
    "accessTokenSecretRef": "META_TOKEN_ACME_WA"
  }'
```

---

## 2. Zero-Downtime Token Rotation

When rotating a Meta System User token:

### Option A: Blue-Green Secret Reference Swap (Zero Restart If Both Env Vars Are Present)

1. Generate the new System User token in Meta Business Settings (**do not revoke the old token yet**).
2. Provision a versioned environment variable `META_TOKEN_ACME_WA_V2` in Infisical and roll out the updated environment to your API pods.
3. Update the channel's `accessTokenSecretRef` via `POST /api/v1/tenants/:tenantId/channels` (which performs an `ON CONFLICT (channel, channel_account_id) DO UPDATE`):
   ```bash
   curl -X POST "http://localhost:3000/api/v1/tenants/<TENANT_UUID>/channels" \
     -H "Content-Type: application/json" \
     -d '{
       "channel": "whatsapp",
       "channelAccountId": "106540352242922",
       "displayHandle": "whatsapp:+5511999990000",
       "accessTokenSecretRef": "META_TOKEN_ACME_WA_V2"
     }'
   ```
4. Once all outbound dispatches use `META_TOKEN_ACME_WA_V2`, revoke the previous token in Meta Business Settings.

### Option B: In-Place Environment Update

1. Update the value of `META_TOKEN_ACME_WA` in Infisical.
2. Perform a rolling restart of the `@tupynambalucas-dev/omnichannel-api` instances so `process.env.META_TOKEN_ACME_WA` reflects the new token.
3. Revoke the old token in Meta Business Settings.

---

## Canonical Upstream Sources

- Environment Variables and Secret References Reference: [`references/reference/environment-variables-and-secret-references.md`](../reference/environment-variables-and-secret-references.md)
- Meta Business Help Center — System User Access Tokens: `https://www.facebook.com/business/help/503306463479099` (retrieved 2026-11-17)
