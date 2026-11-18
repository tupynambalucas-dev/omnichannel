# Tutorial: Run Your First Conversation Locally (Zero-Config Mode)

This tutorial walks through running `@tupynambalucas-dev/omnichannel` on your workstation with **zero external databases or Docker containers**, verifying the `/health` readiness endpoint, and executing a complete multi-turn WhatsApp onboarding conversation.

---

## What You Will Accomplish

1. Boot `@tupynambalucas-dev/omnichannel-api` in deterministic in-memory fallback mode.
2. Verify the auto-bootstrapped enterprise tenant (`tupynamba-lucas-enterprise`) and `/health` readiness response.
3. Run the automated multi-turn conversational simulation and signed webhook test suites.

---

## Step 1: Install and Build the Workspace

From the repository root, install dependencies and build both workspace packages (`core` and `api`):

```bash
pnpm install
pnpm build
```

Expected output:

```text
Tasks: 2 successful, 2 total
```

---

## Step 2: Start the Gateway in Zero-Config Mode

When `DATABASE_URL`, `REDIS_QUEUE_URL`, and `REDIS_STATE_URL` are left blank, the gateway automatically activates its in-memory repositories and inline queue execution, and bootstraps the default enterprise tenant (`tupynamba-lucas-enterprise`) bound to WhatsApp phone number ID `106540352242922` with the `enterprise-standard-onboarding` workflow:

```bash
pnpm api:dev
```

Expected startup log output:

```text
DATABASE_URL is not configured; using ephemeral in-memory repository fallback for local development.
REDIS_STATE_URL is not configured; using local in-memory deduplication and session cache.
REDIS_QUEUE_URL is not configured; executing inbound and outbound pipelines inline for local development.
Bootstrapped default enterprise tenant and standard onboarding workflow.
```

---

## Step 3: Verify the `/health` Endpoint

In a second terminal, query the readiness endpoint:

```bash
curl http://localhost:3000/health
```

Expected JSON response:

```json
{
  "status": "ok",
  "service": "@tupynambalucas-dev/omnichannel-api",
  "environment": "development",
  "datastores": {
    "postgresql": "memory-fallback",
    "redisState": "memory-fallback",
    "redisQueue": "inline-fallback",
    "mongoArchive": "disabled"
  },
  "timestamp": "2026-11-17T22:00:00.000Z"
}
```

---

## Step 4: Verify the Auto-Bootstrapped Tenant

List the registered tenants via the REST API:

```bash
curl http://localhost:3000/api/v1/tenants
```

Expected JSON response:

```json
{
  "items": [
    {
      "id": "0195f4a0-7c10-7000-8000-000000000001",
      "slug": "tupynamba-lucas-enterprise",
      "displayName": "Tupynamba Lucas Enterprise Suite",
      "timezone": "America/Sao_Paulo",
      "status": "ACTIVE",
      "createdAt": "2026-11-17T22:00:00.000Z"
    }
  ]
}
```

---

## Step 5: Execute the End-to-End Multi-Turn Conversation Simulations

Run the workspace test suite to execute the full 7-turn `enterprise-standard-onboarding` and `enterprise-guided-prototype` conversational state machines (including Brazilian CPF Modulo-11 validation, interactive list selection, and signed `POST /webhooks/meta` injection):

```bash
pnpm test
```

Expected result: all test suites pass with zero external infrastructure dependencies.

---

## Next Steps

- Connect a live WhatsApp Cloud API or Instagram account: [Meta for Developers Registration and Channel Onboarding](./meta-developer-app-and-channels-onboarding.md)
- Provision Cloud PostgreSQL and Dual TLS Redis: [Cloud Databases Provisioning Without Docker](./cloud-databases-provisioning-without-docker.md)
