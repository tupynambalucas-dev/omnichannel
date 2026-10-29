import * as Sentry from '@sentry/node';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { AppError } from '../utils/AppError.js';

const sentryPlugin: FastifyPluginAsync = (server: FastifyInstance) => {
  if (server.config.SENTRY_DSN.trim().length === 0) {
    return Promise.resolve();
  }

  server.log.info('Sentry error telemetry initialized.');

  Sentry.init({
    dsn: server.config.SENTRY_DSN,
    tracesSampleRate: server.config.NODE_ENV === 'production' ? 0.2 : 1.0,
    environment: server.config.NODE_ENV,
    beforeSend(event, hint) {
      const error = hint.originalException;

      if (error instanceof AppError) {
        return null;
      }

      if (error !== null && typeof error === 'object' && 'statusCode' in error) {
        const status = (error as { statusCode?: unknown }).statusCode;
        if (typeof status === 'number' && status < 500) {
          return null;
        }
      }

      return event;
    },
  });

  return Promise.resolve();
};

export default fp(sentryPlugin, { name: 'omnichannel-sentry' });
