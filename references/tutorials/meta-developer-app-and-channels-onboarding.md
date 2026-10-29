# Tutorial: Meta for Developers Registration and Channel Onboarding

This tutorial walks through registering a Meta for Developers account from scratch, configuring a Meta Business Portfolio, creating a unified Business App for **WhatsApp Cloud API** and **Instagram Messaging API**, generating non-expiring **System User** access tokens, and verifying your `/webhooks/meta` endpoint.

---

## Prerequisites

- A personal Facebook account with Two-Factor Authentication (2FA) enabled (required by Meta to access developer and business security settings).
- A dedicated business phone number (for production WhatsApp) or any personal WhatsApp number to receive test messages during sandbox development.
- An Instagram Professional account (**Business** or **Creator** mode enabled in the Instagram mobile app).
- `@tupynambalucas-dev/omnichannel` running locally on port `3000` and exposed via HTTPS tunnel (`cloudflared` or `ngrok`).

---

## Step 1: Register on Meta for Developers

1. Open [https://developers.facebook.com](https://developers.facebook.com) and click **Get Started** in the top navigation bar.
2. Authenticate with your Facebook account and confirm your developer contact email address.
3. Accept the **Meta Platform Terms** and **Developer Policies**.
4. Select **Developer** as your role to complete registration and enter the **My Apps** dashboard.

---

## Step 2: Create or Link a Meta Business Portfolio

Production WhatsApp Business Accounts (WABAs) and System User permanent tokens live inside a **Meta Business Portfolio** (formerly Business Manager).

1. Navigate to [https://business.facebook.com/settings](https://business.facebook.com/settings).
2. If you do not yet have a Business Portfolio, click **Create an account**, enter your legal organization name, your name, and your corporate email address.
3. Navigate to **Business Settings -> Security Center** and ensure Two-Factor Authentication requirement is set to **Everyone**.
4. _(For Production Scaling)_ Under **Security Center -> Business Verification**, submit your corporate registration documents (e.g., CNPJ certificate in Brazil) to unlock higher WhatsApp messaging tiers (1,000+ unique conversations per 24 hours).

---

## Step 3: Create the Unified Meta Business App

Both WhatsApp Cloud API and Instagram Messaging API are consolidated inside a single Meta App so they share one **App Secret** (`X-Hub-Signature-256`) and unified webhook management.

1. Return to [https://developers.facebook.com/apps](https://developers.facebook.com/apps) and click **Create App**.
2. When prompted for use case, select **Other** -> **Next**.
3. Select **Business** as the App Type -> **Next**.
4. Fill in:
   - **App Name**: e.g., `Tupynamba Omnichannel Gateway`
   - **App Contact Email**: your engineering email
   - **Business Portfolio**: select the portfolio created in Step 2
5. Click **Create App** and complete the 2FA confirmation prompt.
6. In the left sidebar, go to **App Settings -> Basic**:
   - Locate **App Secret**, click **Show**, and copy the value into your local `.env` as `META_APP_SECRET`.

> [!CAUTION]
> Never commit `META_APP_SECRET` to Git. Every inbound `POST /webhooks/meta` request is authenticated against this secret via constant-time HMAC-SHA256 verification.

---

## Step 4: Add and Configure WhatsApp Cloud API

1. From your App Dashboard, locate **WhatsApp** in the products catalog and click **Set up**.
2. Meta automatically provisions a sandbox **Test WhatsApp Business Account** and a **Test Phone Number**.
3. Navigate to **WhatsApp -> API Setup** in the left sidebar:
   - Record the **Phone Number ID** (`metadata.phone_number_id` in webhooks).
   - Record the **WhatsApp Business Account ID** (`waba_id`).
   - Under **To**, click **Manage phone number list** and register up to 5 verified destination phone numbers (via SMS/WhatsApp OTP) so you can send free sandbox messages immediately.

> [!NOTE]
> The temporary 24-hour token displayed on the **API Setup** page is strictly for quick curl tests. Proceed to Step 6 to generate a non-expiring System User token.

---

## Step 5: Add and Configure Instagram Messaging API

Meta supports the modern **Instagram API with Instagram Login** flow (`graph.instagram.com` / `graph.facebook.com`), eliminating the legacy requirement to link a Facebook Page to every Instagram account.

1. In your App Dashboard left sidebar, click **Add Product** and select **Instagram** -> **Set up**.
2. Navigate to **Instagram -> API setup with Instagram login**:
   - Click **Generate access tokens** -> **Add account** and log in with your Instagram Professional (`Business` or `Creator`) test account.
   - Record the **Instagram Account ID** (`entry[].id` in Instagram webhooks).
3. Ensure the following OAuth scopes are enabled for tenant onboarding:
   - `instagram_business_basic`
   - `instagram_business_manage_messages`
4. Under **App Roles -> Roles**, add any additional Instagram accounts as **Instagram Testers** (the account owner must accept the invitation inside the Instagram app under **Settings and activity -> Website permissions -> Apps and websites -> Tester Invites**).

---

## Step 6: Generate a Permanent System User Access Token

Temporary developer tokens expire after 24 hours. Enterprise multi-tenant deployments use a **System User** token.

1. Open [https://business.facebook.com/settings/system-users](https://business.facebook.com/settings/system-users).
2. Click **Add**, name the user `omnichannel-gateway-runtime`, and assign the **Admin** System User role.
3. Click **Assign Assets** on the newly created System User:
   - **Apps**: Select your `Tupynamba Omnichannel Gateway` app and toggle **Full control (Manage app)**.
   - **WhatsApp Accounts**: Select your WABA and toggle **Full control (Manage WhatsApp business accounts)**.
   - **Instagram Accounts**: Select your connected Instagram Business account and enable **Manage messages**.
4. Click **Generate new token**:
   - Select your `Tupynamba Omnichannel Gateway` app.
   - Set **Token expiration** to **Never**.
   - Check permissions:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
     - `instagram_business_basic`
     - `instagram_business_manage_messages`
5. Click **Generate token** and store the token encrypted inside the `tenant_channels.access_token_enc` column (or Infisical vault).

---

## Step 7: Expose Local Gateway and Verify Webhooks

Meta requires a publicly reachable HTTPS URL with a valid TLS certificate for webhook verification.

1. Set a high-entropy random string in your `.env`:
   ```ini
   META_WEBHOOK_VERIFY_TOKEN=9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c
   META_APP_SECRET=your_copied_meta_app_secret
   ```
2. Start the local Omnichannel API:
   ```bash
   pnpm dev
   ```
3. In a second terminal, expose port `3000` using Cloudflare Tunnel (no account required for quick tunnels):
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   Copy the generated HTTPS URL (e.g., `https://random-slug.trycloudflare.com`).
4. Configure the **WhatsApp Webhook**:
   - In Meta App Dashboard, navigate to **WhatsApp -> Configuration -> Webhook** -> click **Edit**.
   - **Callback URL**: `https://random-slug.trycloudflare.com/webhooks/meta`
   - **Verify token**: paste the exact `META_WEBHOOK_VERIFY_TOKEN` value.
   - Click **Verify and save**. Fastify validates `hub.mode === 'subscribe'` and `hub.verify_token`, returning `hub.challenge` with HTTP `200 OK`.
   - Click **Manage** under Webhook fields and subscribe to **`messages`**.
5. Configure the **Instagram Webhook**:
   - Navigate to **Instagram -> API setup with Instagram login -> Configure webhooks** (or **Webhooks** product -> select **Instagram** from the dropdown).
   - Provide the exact same Callback URL (`https://random-slug.trycloudflare.com/webhooks/meta`) and `META_WEBHOOK_VERIFY_TOKEN`.
   - Subscribe to **`messages`** and **`messaging_postbacks`**.

---

## Canonical Upstream Sources

- Meta for Developers — WhatsApp Cloud API Get Started: `https://developers.facebook.com/docs/whatsapp/cloud-api/get-started`
- Meta for Developers — Webhooks Setup & Payload Verification (`X-Hub-Signature-256`): `https://developers.facebook.com/docs/graph-api/webhooks/getting-started`
- Meta Business Help Center — System Users and Access Tokens: `https://www.facebook.com/business/help/503306463479099`
- Meta for Developers — Instagram API with Instagram Login: `https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login`
