# Tutorial: Cloud Databases Provisioning Without Docker

`@tupynambalucas-dev/omnichannel` is engineered to run directly against managed cloud persistence layers with **zero local Docker containers required**.

This tutorial explains which cloud data stores are required versus optional, and provides step-by-step setup instructions for **PostgreSQL** (Neon / Supabase), **Redis** (Upstash / Redis Cloud), and **MongoDB** (MongoDB Atlas).

---

## 1. Persistence Responsibility Matrix

Before provisioning accounts, review the exact role of each storage engine in the Omnichannel architecture:

| Engine             | Architectural Requirement          | Role in `@tupynambalucas-dev/omnichannel`                                                                                                                                                                                           | Recommended Cloud Providers                 |
| :----------------- | :--------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------ |
| **PostgreSQL 16+** | **Required** (Primary ACID Store)  | Multi-tenant registry (`tenants`, `tenant_channels`), immutable `workflow_versions` (JSONB), durable `conversation_sessions`, `messages_log`, `opt_in_audit_trails`, and **Row-Level Security (RLS)** tenant isolation.             | Neon Serverless Postgres, Supabase Postgres |
| **Redis (Queue)**  | **Required** (BullMQ Broker)       | Backing store for `inbound-webhook`, `outbound-dispatch`, `workflow-timers`, and `status-telemetry` queues. Requires `maxmemory-policy noeviction`.                                                                                 | Redis Cloud, Upstash Redis                  |
| **Redis (State)**  | **Required** (Hot Cache & Locks)   | Sub-millisecond active FSM session checkpoints (`session:*`), 24h atomic webhook deduplication (`dedup:msg:*`), and per-conversation FIFO locks (`lock:conv:*`). Uses `volatile-ttl` / `volatile-lru`.                              | Redis Cloud, Upstash Redis                  |
| **MongoDB**        | **Optional** (Raw Payload Archive) | PostgreSQL JSONB + RLS supersedes MongoDB Replica Sets for transactional state. Enable MongoDB Atlas **only** if you desire a separate cold document sink for raw unparsed Meta webhook envelopes (`MONGODB_ARCHIVE_ENABLED=true`). | MongoDB Atlas (M0 Free / Serverless)        |

---

## 2. Provisioning Cloud PostgreSQL (Neon Serverless Postgres)

### Step 1: Create Project and Database

1. Sign in at [https://console.neon.tech](https://console.neon.tech) and click **New Project**.
2. Configure:
   - **Project Name**: `tupynambalucas-omnichannel`
   - **Postgres Version**: `16` or `17`
   - **Database Name**: `omnichannel`
   - **Region**: Choose the region closest to your application server (e.g., `AWS sa-east-1` São Paulo or `AWS us-east-1` Virginia) so Redis and Node.js share minimal RTT latency.

### Step 2: Create a Non-Superuser Runtime Role for Row-Level Security

> [!CAUTION]
> Default cloud owner roles (such as `neondb_owner` in Neon or `postgres` in Supabase) often possess table ownership or `BYPASSRLS` privileges. If your Node.js app connects as the table owner without `FORCE ROW LEVEL SECURITY` or with `BYPASSRLS`, PostgreSQL Row-Level Security policies are silently skipped. Always run migrations as the owner role and run the Fastify application as a dedicated `app_runtime` role with `NOBYPASSRLS`.

Open the **SQL Editor** in the Neon Console and run:

```sql
-- 1. Create dedicated application runtime role without RLS bypass
CREATE ROLE app_runtime WITH LOGIN PASSWORD 'REPLACE_WITH_STRONG_PASSWORD' NOBYPASSRLS;

-- 2. Grant database and schema usage
GRANT CONNECT ON DATABASE omnichannel TO app_runtime;
GRANT USAGE ON SCHEMA public TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
```

### Step 3: Apply Multi-Tenant Schema and RLS Policies

Still in the Neon SQL Editor (connected as `neondb_owner`), execute the full DDL script located in [`references/reference/postgresql-rls-multi-tenant-schema.md`](../reference/postgresql-rls-multi-tenant-schema.md), then grant permissions to `app_runtime`:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
```

### Step 4: Configure `DATABASE_URL` in `.env`

In the Neon Console, click **Connect**, select the `app_runtime` role, and choose the **Direct** (or Transaction Pooler compatible) connection string with TLS required:

```ini
DATABASE_URL=postgresql://app_runtime:REPLACE_WITH_STRONG_PASSWORD@ep-example-123456.sa-east-1.aws.neon.tech/omnichannel?sslmode=require
DATABASE_SSL_ENABLED=true
DATABASE_POOL_MAX=20
```

> [!IMPORTANT]
> Our `withTenantContext` helper sets `SELECT set_config('app.current_tenant_id', $1, true)` inside an explicit `BEGIN ... COMMIT` transaction on a single checked-out `pg.PoolClient`. This works safely with both direct connections and transaction-mode PgBouncer poolers.

---

## 3. Provisioning Cloud Redis Over TLS (Upstash or Redis Cloud)

As detailed in the architectural masterplan, **BullMQ queues** and **ephemeral session/deduplication keys** have conflicting memory eviction requirements:

- **Queue Redis (`REDIS_QUEUE_URL`)**: MUST use `noeviction` so Redis never silently drops BullMQ metadata keys under memory pressure.
- **State Redis (`REDIS_STATE_URL`)**: Should use `volatile-ttl` (or `volatile-lru`) so expired 24h webhook deduplication keys (`dedup:msg:*`) and inactive session caches (`session:*`) are automatically reclaimed.

### Option A: Upstash Redis (Serverless TLS)

1. Sign in at [https://console.upstash.com](https://console.upstash.com) and navigate to **Redis**.
2. Click **Create Database** twice to create two isolated databases in the **same cloud region** as your Neon PostgreSQL database:
   - **`omnichannel-queue`**: Enable **TLS (SSL)** and set **Eviction** to **Disabled (`noeviction`)**.
   - **`omnichannel-state`**: Enable **TLS (SSL)** and set **Eviction** to **Enabled (`volatile-ttl` / optimistic eviction)**.
3. Copy the `rediss://` connection URLs (note the double `s` in `rediss://`, which instructs `ioredis` v6 to negotiate TLS automatically) into `.env`:

```ini
REDIS_QUEUE_URL=rediss://default:QUEUE_PASSWORD@sa1-queue-example.upstash.io:6379
REDIS_STATE_URL=rediss://default:STATE_PASSWORD@sa1-state-example.upstash.io:6379
```

### Option B: Redis Cloud (Fixed RAM Subscription)

If message throughput is high and sustained (where BullMQ worker polling would generate high per-command billing on serverless pricing), use **Redis Cloud** ([https://cloud.redis.io](https://cloud.redis.io)):

1. Create two databases (a Free 30MB database for `state` with `volatile-ttl`, and a dedicated database with `noeviction` for `queue`).
2. Enable **TLS** and copy the `rediss://default:<password>@<host>:<port>` endpoints into `REDIS_QUEUE_URL` and `REDIS_STATE_URL`.

---

## 4. Provisioning MongoDB Atlas (Optional Cold Payload Archive)

You do **not** need MongoDB to run the Omnichannel gateway, workflow engine, or session persistence—PostgreSQL handles all transactional state and JSONB schemas natively. Follow these steps **only** if you want to enable optional raw webhook document archiving (`MONGODB_ARCHIVE_ENABLED=true`):

1. Log in to [https://cloud.mongodb.com](https://cloud.mongodb.com) and create a project `tupynambalucas-omnichannel`.
2. Click **Create Deployment**, select **M0 Free** (or **Flex/Dedicated** for production), choose the same AWS region as your API, and name the cluster `omnichannel-archive`.
3. Under **Security -> Database Access**, create a database user `omnichannel_archiver` with **Read and write to any database** (or scoped to `omnichannel_archive`).
4. Under **Security -> Network Access**, add your server static IP (or `0.0.0.0/0` temporarily during local workstation development).
5. Click **Connect -> Drivers -> Node.js**, copy the `mongodb+srv://` string, and update `.env`:

```ini
MONGODB_ARCHIVE_ENABLED=true
MONGODB_URI=mongodb+srv://omnichannel_archiver:PASSWORD@omnichannel-archive.abcde.mongodb.net/omnichannel_archive?retryWrites=true&w=majority
```

---

## 5. Verify Cloud Connectivity

Once `.env` is populated (or injected via `infisical run`), start the server and query the `/health` readiness endpoint:

```bash
pnpm dev
curl http://localhost:3000/health
```

Expected JSON response when cloud stores are connected:

```json
{
  "status": "ok",
  "service": "@tupynambalucas-dev/omnichannel-api",
  "stores": {
    "postgres": "connected",
    "redisQueue": "connected",
    "redisState": "connected",
    "mongoArchive": "disabled"
  }
}
```

---

## Canonical Upstream Sources

- node-postgres (`pg`) SSL & Transactions Documentation: Context7 `/brianc/node-postgres` (`docs/pages/features/ssl.mdx`, `docs/pages/features/transactions.mdx`)
- ioredis v6 TLS (`rediss://`) & `maxRetriesPerRequest` Documentation: Context7 `/redis/ioredis/v6.0.0` (`README.md`)
- Neon PostgreSQL Row-Level Security Guide: `https://neon.tech/docs/guides/row-level-security`
- Upstash BullMQ Integration Guide: `https://upstash.com/docs/redis/quickstarts/bullmq`
- MongoDB Atlas Node.js Connection Guide: `https://www.mongodb.com/docs/atlas/driver-connection/`
