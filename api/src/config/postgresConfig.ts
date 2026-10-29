import { Pool } from 'pg';
import type { PoolClient, PoolConfig } from 'pg';

export interface PostgresConnectionOptions {
  connectionString: string;
  sslEnabled: boolean;
  maxConnections: number;
}

/**
 * Creates a cloud-ready PostgreSQL connection pool (Neon Serverless / Supabase / Cloud SQL).
 */
export function createPostgresPool(options: PostgresConnectionOptions): Pool {
  const poolConfig: PoolConfig = {
    connectionString: options.connectionString,
    max: options.maxConnections,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: options.sslEnabled ? { rejectUnauthorized: true } : false,
  };

  return new Pool(poolConfig);
}

/**
 * Executes a callback inside a PostgreSQL transaction scoped to a specific tenant via
 * `set_config('app.current_tenant_id', tenantId, true)` so Row-Level Security (RLS)
 * policies automatically isolate every query and mutation to that tenant.
 */
export async function withTenantContext<T>(
  pool: Pool,
  tenantId: string,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
