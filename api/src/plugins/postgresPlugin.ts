import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createPostgresPool } from '../config/postgresConfig.js';

const postgresPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  const connectionString = server.config.DATABASE_URL.trim();

  if (connectionString.length === 0) {
    server.log.warn(
      'DATABASE_URL is not configured; using ephemeral in-memory repository fallback for local development.',
    );
    server.decorate('pgPool', null);
    return;
  }

  const pool = createPostgresPool({
    connectionString,
    sslEnabled: server.config.DATABASE_SSL_ENABLED,
    maxConnections: server.config.DATABASE_POOL_MAX,
  });

  await pool.query('SELECT 1');
  server.log.info('Connected to Cloud PostgreSQL pool.');

  server.decorate('pgPool', pool);

  server.addHook('onClose', async () => {
    await pool.end();
  });
};

export default fp(postgresPlugin, { name: 'omnichannel-postgres' });
