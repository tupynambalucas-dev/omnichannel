# Tutorial: Meta for Developers Registration and Channel Onboarding

This tutorial walks through registering a Meta for Developers account, configuring a Meta Business Portfolio, creating a unified Business App for **WhatsApp Cloud API** and **Instagram Messaging API**, generating non-expiring **System User** access tokens, verifying your `/webhooks/meta` endpoint, and binding your channel via secret reference (`accessTokenSecretRef`).

---

## Prerequisites

- A personal Facebook account with Two-Factor Authentication (2FA) enabled.
- A dedicated business phone number (for production WhatsApp) or a personal WhatsApp number to receive sandbox test messages.
- An Instagram Professional account (**Business** or **Creator** mode enabled in the Instagram mobile app).
- `@tupynambalucas-dev/omnichannel` running locally on port `3000` and exposed via HTTPS tunnel (`cloudflared` or `ngrok`).

---

## Step 1: Register on Meta for Developers

1. Open [https://developers.facebook.com](https://developers.facebook.com) and click **Get Started**.
2. Authenticate with your Facebook account and confirm your developer contact email address.
3. Accept the **Meta Platform Terms** and **Developer Policies**.
4. Select **Developer** as your role to enter the **My Apps** dashboard.

---

## Step 2: Create or Link a Meta Business Portfolio

Production WhatsApp Business Accounts (WABAs) and System User permanent tokens live inside a **Meta Business Portfolio**:

1. Navigate to [https://business.facebook.com/settings](https://business.facebook.com/settings).
2. If you do not yet have a Business Portfolio, click **Create an account**, enter your legal organization name, your name, and your corporate email address.
3. Navigate to **Business Settings -> Security Center** and ensure Two-Factor Authentication requirement is set to **Everyone**.
4. Under **Security Center -> Business Verification**, submit your corporate registration documents to unlock higher WhatsApp messaging tiers.

---

## Step 3: Create the Unified Meta Business App

Both WhatsApp Cloud API and Instagram Messaging API are consolidated inside a single Meta App so they share one **App Secret** (`X-Hub-Signature-256`) and unified webhook management:

1. Return to [https://developers.facebook.com/apps](https://developers.facebook.com/apps) and click **Create App**.
2. Select **Other** -> **Next**, then select **Business** as the App Type -> **Next**.
3. Enter your **App Name** (for example, `Tupynamba Omnichannel Gateway`), contact email, and select your Business Portfolio.
4. In the left sidebar, go to **App Settings -> Basic**, click **Show** next to **App Secret**, and store the value in Infisical or your local `.env` as `META_APP_SECRET`.

> [!CAUTION]
> Never commit `META_APP_SECRET` to Git. Every inbound `POST /webhooks/meta` request is authenticated against this secret via constant-time HMAC-SHA256 verification.

---

## Step 4: Add and Configure WhatsApp Cloud API

1. From your App Dashboard, locate **WhatsApp** in the products catalog and click **Set up**.
2. Navigate to **WhatsApp -> API Setup** in the left sidebar:
   - Record the **Phone Number ID** (`metadata.phone_number_id` in webhooks).
   - Record the **WhatsApp Business Account ID** (`waba_id`).
   - Under **To**, click **Manage phone number list** and register up to 5 verified destination phone numbers so you can send free sandbox messages immediately.

---

## Step 5: Add and Configure Instagram Messaging API

1. In your App Dashboard left sidebar, click **Add Product** and select **Instagram** -> **Set up**.
2. Navigate to **Instagram -> API setup with Instagram login**:
   - Click **Generate access tokens** -> **Add account** and log in with your Instagram Professional (`Business` or `Creator`) account.
   - Record the **Instagram Account ID** (`entry[].id` in Instagram webhooks).
3. Ensure OAuth scopes `instagram_business_basic` and `instagram_business_manage_messages` are enabled.

---

## Step 6: Generate a Permanent System User Access Token and Export by Secret Reference

Temporary developer tokens expire after 24 hours. Enterprise deployments use a **System User** token resolved via environment variable reference:

1. Open [https://business.facebook.com/settings/system-users](https://business.facebook.com/settings/system-users).
2. Click **Add**, name the user `omnichannel-gateway-runtime`, and assign the **Admin** System User role.
3. Click **Assign Assets** and grant **Full control** on your Meta App and WABA, plus **Manage messages** on your Instagram account.
4. Click **Generate new token**, select your app, set **Token expiration** to **Never**, and check:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - `instagram_business_basic`
   - `instagram_business_manage_messages`
5. Store the generated token in Infisical (or your local `.env` for workstation testing) under a dedicated secret variable name such as `META_GRAPH_ACCESS_TOKEN`:
   ```ini
   META_GRAPH_ACCESS_TOKEN=<YOUR_META_GRAPH_ACCESS_TOKEN>
   ```

> [!IMPORTANT]
> Never store the raw token in PostgreSQL. When registering a channel in Step 8, pass only the variable name (`"accessTokenSecretRef": "META_GRAPH_ACCESS_TOKEN"`).

---

## Step 7: Expose Local Gateway and Verify Webhooks

1. Set `META_WEBHOOK_VERIFY_TOKEN` and `META_APP_SECRET` in `.env`, then start the gateway:
   ```bash
   pnpm api:dev
   ```
2. Expose port `3000` using Cloudflare Tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
3. In the Meta App Dashboard under **WhatsApp -> Configuration -> Webhook** (and **Instagram -> Configure webhooks**):
   - **Callback URL**: `https://<your-tunnel-domain>/webhooks/meta`
   - **Verify token**: exact value of `META_WEBHOOK_VERIFY_TOKEN`
   - Subscribe to `messages` (WhatsApp) and `messages` + `messaging_postbacks` (Instagram).

---

## Step 8: Onboard Your Tenant, Channel, and Standard Workflow

Bootstrap the default enterprise tenant, bind your WhatsApp `phone_number_id` to `META_GRAPH_ACCESS_TOKEN`, and activate the `enterprise-standard-onboarding` workflow with a single call:

```bash
curl -X POST http://localhost:3000/api/v1/tenants/bootstrap-default \
  -H "Content-Type: application/json" \
  -d '{
    "channelAccountId": "<YOUR_WHATSAPP_PHONE_NUMBER_ID>",
    "accessTokenSecretRef": "META_GRAPH_ACCESS_TOKEN"
  }'
```

Send `"Ola"` from your WhatsApp handset to your test number to receive the interactive greeting menu.

---

## Canonical Upstream Sources

- Meta for Developers — WhatsApp Cloud API Get Started: `https://developers.facebook.com/docs/whatsapp/cloud-api/get-started` (retrieved 2026-11-17)
- Meta for Developers — Webhooks Setup & Payload Verification (`X-Hub-Signature-256`): `https://developers.facebook.com/docs/graph-api/webhooks/getting-started` (retrieved 2026-11-17)
- Meta Business Help Center — System Users and Access Tokens: `https://www.facebook.com/business/help/503306463479099` (retrieved 2026-11-17)
- Meta for Developers — Instagram API with Instagram Login: `https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login` (retrieved 2026-11-17)
