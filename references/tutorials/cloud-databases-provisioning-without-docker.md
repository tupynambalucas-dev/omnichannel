# Tutorial: Cloud Databases Provisioning Without Docker

`@tupynambalucas-dev/omnichannel` is engineered to run directly against managed cloud persistence layers with **zero local Docker containers required**.

This tutorial walks through provisioning **PostgreSQL 16+** (Neon / Supabase), **Dual TLS Redis** (Upstash / Redis Cloud), and optional **MongoDB Atlas**, applying [`api/migrations/0001_initial_schema.sql`](../../api/migrations/0001_initial_schema.sql), and verifying connectivity via `/health`.

---

## 1. Persistence Responsibility Matrix

| Engine             | Architectural Requirement          | Role in `@tupynambalucas-dev/omnichannel`                                                                                                                                              | Recommended Cloud Providers                 |
| :----------------- | :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------ |
| **PostgreSQL 16+** | **Required** (Primary ACID Store)  | Multi-tenant registry (`tenants`, `tenant_channels`), immutable `workflow_definitions` (JSONB), durable `conversation_sessions`, `opt_in_audit_trail`, and `FORCE ROW LEVEL SECURITY`. | Neon Serverless Postgres, Supabase Postgres |
| **Redis (Queue)**  | **Required** (BullMQ Broker)       | Backing store for `omnichannel-inbound-events`, `omnichannel-outbound-dispatch`, and `omnichannel-delayed-timers`. Requires `maxmemory-policy noeviction`.                             | Redis Cloud, Upstash Redis                  |
| **Redis (State)**  | **Required** (Hot Cache & Locks)   | Sub-millisecond active FSM session checkpoints (`session:*`), 24h atomic webhook deduplication (`dedup:msg:*`), and per-conversation FIFO locks (`lock:conv:*`). Uses `volatile-ttl`.  | Redis Cloud, Upstash Redis                  |
| **MongoDB**        | **Optional** (Raw Payload Archive) | Enable MongoDB Atlas **only** if you want a cold document sink for raw unparsed Meta webhook payloads (`MONGODB_ARCHIVE_ENABLED=true`).                                                | MongoDB Atlas (M0 Free / Serverless)        |

---

## 2. Provision Cloud PostgreSQL (Neon Serverless Postgres)

### Step 1: Create Project and Database

1. Sign in at [https://console.neon.tech](https://console.neon.tech) and click **New Project**.
2. Set **Postgres Version** to `16` or `17`, **Database Name** to `omnichannel`, and select the cloud region closest to your API runtime.

### Step 2: Create a Non-Superuser Runtime Role for Row-Level Security

> [!CAUTION]
> Default cloud owner roles (such as `neondb_owner` in Neon or `postgres` in Supabase) often possess `BYPASSRLS` privileges. Always run schema migrations as the owner role and connect the Fastify application as a dedicated `app_runtime` role created with `NOBYPASSRLS`.

Open the **SQL Editor** in the Neon Console and execute:

```sql
CREATE ROLE app_runtime WITH LOGIN PASSWORD '<YOUR_STRONG_DB_PASSWORD>' NOBYPASSRLS;
GRANT CONNECT ON DATABASE omnichannel TO app_runtime;
GRANT USAGE ON SCHEMA public TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
```

### Step 3: Apply the Authoritative Migration Script

Still in the Neon SQL Editor (connected as `neondb_owner`), execute the full SQL migration in [`api/migrations/0001_initial_schema.sql`](../../api/migrations/0001_initial_schema.sql) (also documented in [`references/reference/postgresql-rls-multi-tenant-schema.md`](../reference/postgresql-rls-multi-tenant-schema.md)), then grant table privileges to `app_runtime`:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
```

### Step 4: Configure `DATABASE_URL`

Set your connection string (using `app_runtime` and `?sslmode=require`) in Infisical or `.env`:

```ini
DATABASE_URL=postgresql://app_runtime:<YOUR_STRONG_DB_PASSWORD>@ep-example.sa-east-1.aws.neon.tech/omnichannel?sslmode=require
DATABASE_SSL_ENABLED=true
DATABASE_POOL_MAX=20
```

---

## 3. Provision Cloud Redis Over TLS (Upstash or Redis Cloud)

Create two isolated TLS Redis databases in the same cloud region as your PostgreSQL instance:

1. **Queue Redis (`REDIS_QUEUE_URL`)**: Enable **TLS (`rediss://`)** and set eviction policy to **`noeviction`**.
2. **State Redis (`REDIS_STATE_URL`)**: Enable **TLS (`rediss://`)** and set eviction policy to **`volatile-ttl`**.

Configure both URLs in `.env`:

```ini
REDIS_QUEUE_URL=rediss://default:<YOUR_REDIS_QUEUE_PASSWORD>@sa1-queue-example.upstash.io:6379
REDIS_STATE_URL=rediss://default:<YOUR_REDIS_STATE_PASSWORD>@sa1-state-example.upstash.io:6379
```

---

## 4. Provision MongoDB Atlas (Optional Cold Payload Archive)

Skip this section unless you want raw unparsed webhook payload archival (`MONGODB_ARCHIVE_ENABLED=true`):

1. Create an M0 Free or Serverless cluster in [https://cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user scoped to `omnichannel_archive` and allow your runtime IP address.
3. Configure `.env`:
   ```ini
   MONGODB_ARCHIVE_ENABLED=true
   MONGODB_URI=mongodb+srv://omnichannel_archiver:<YOUR_MONGODB_PASSWORD>@cluster0.example.mongodb.net/omnichannel_archive?retryWrites=true&w=majority
   ```

---

## 5. Verify Cloud Connectivity via `/health`

Start the gateway and query `/health`:

```bash
pnpm api:dev
curl http://localhost:3000/health
```

Expected JSON response when PostgreSQL and both Redis instances are connected:

```json
{
  "status": "ok",
  "service": "@tupynambalucas-dev/omnichannel-api",
  "environment": "development",
  "datastores": {
    "postgresql": "connected",
    "redisState": "connected",
    "redisQueue": "connected",
    "mongoArchive": "disabled"
  },
  "timestamp": "2026-11-17T22:00:00.000Z"
}
```

---

## Canonical Upstream Sources

- Neon PostgreSQL Row-Level Security Guide: `https://neon.tech/docs/guides/row-level-security` (retrieved 2026-11-17)
- Upstash BullMQ Integration Guide: `https://upstash.com/docs/redis/quickstarts/bullmq` (retrieved 2026-11-17)
- ioredis v6 TLS (`rediss://`) Configuration: `https://github.com/redis/ioredis` (Context7 `/redis/ioredis/v6.0.0`, retrieved 2026-11-17)
