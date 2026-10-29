import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createCloudRedisClient } from '../config/redisConfig.js';

const redisPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  const stateUrl = server.config.REDIS_STATE_URL.trim();

  if (stateUrl.length === 0) {
    server.log.warn(
      'REDIS_STATE_URL is not configured; using local in-memory deduplication and session cache.',
    );
    server.decorate('redisState', null);
    return;
  }

  const stateClient = createCloudRedisClient(stateUrl, 'state');
  await stateClient.ping();
  server.log.info('Connected to Cloud State Redis.');

  server.decorate('redisState', stateClient);

  server.addHook('onClose', async () => {
    await stateClient.quit();
  });
};

export default fp(redisPlugin, { name: 'omnichannel-redis' });
