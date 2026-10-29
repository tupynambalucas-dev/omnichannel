import type { ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';

export type RedisRole = 'queue' | 'state';

/**
 * Creates a cloud-native ioredis client supporting TLS (`rediss://`) for Upstash / Redis Cloud.
 * - `queue` role: sets `maxRetriesPerRequest: null` as required by BullMQ blocking workers.
 * - `state` role: sets bounded retries for low-latency deduplication, locks, and checkpoints.
 */
export function createCloudRedisClient(connectionUrl: string, role: RedisRole): Redis {
  const isTls = connectionUrl.startsWith('rediss://');

  const baseOptions: RedisOptions = {
    maxRetriesPerRequest: role === 'queue' ? null : 3,
    enableReadyCheck: true,
    lazyConnect: false,
    ...(isTls ? { tls: {} } : {}),
  };

  return new Redis(connectionUrl, baseOptions);
}

/**
 * Parses a `redis://` or `rediss://` URL into BullMQ `ConnectionOptions` so each Queue and
 * blocking Worker manages isolated non-contended connections safely over TLS.
 */
export function parseBullMqConnectionOptions(connectionUrl: string): ConnectionOptions {
  const parsed = new URL(connectionUrl);
  const isTls = parsed.protocol === 'rediss:';
  const port = parsed.port.length > 0 ? Number.parseInt(parsed.port, 10) : 6379;
  const dbSegment = parsed.pathname.replace(/^\/+/, '');
  const dbIndex = dbSegment.length > 0 ? Number.parseInt(dbSegment, 10) : 0;

  return {
    host: parsed.hostname,
    port: Number.isFinite(port) ? port : 6379,
    ...(parsed.username.length > 0 ? { username: decodeURIComponent(parsed.username) } : {}),
    ...(parsed.password.length > 0 ? { password: decodeURIComponent(parsed.password) } : {}),
    db: Number.isFinite(dbIndex) ? dbIndex : 0,
    maxRetriesPerRequest: null,
    ...(isTls ? { tls: {} } : {}),
  };
}
