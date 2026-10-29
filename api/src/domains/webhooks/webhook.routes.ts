import { MetaWebhookVerifyQuerySchema } from '@tupynambalucas-dev/omnichannel-core';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AppError } from '../../utils/AppError.js';

/**
 * Encapsulated webhook route scope preserving raw UTF-8 Buffer bytes (`request.rawBody`)
 * exclusively for `/webhooks/meta` so `X-Hub-Signature-256` HMAC-SHA256 validation never
 * suffers from JSON re-serialization drift.
 */
export function webhookRoutes(server: FastifyInstance): Promise<void> {
  server.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (request, body: Buffer, done) => {
      request.rawBody = body;
      if (body.length === 0) {
        done(null, {});
        return;
      }
      try {
        const parsed: unknown = JSON.parse(body.toString('utf8'));
        done(null, parsed);
      } catch {
        done(new AppError('MALFORMED_WEBHOOK_JSON', 400, 'Malformed JSON payload.'), undefined);
      }
    },
  );

  const app = server.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/meta',
    {
      schema: {
        querystring: MetaWebhookVerifyQuerySchema,
      },
    },
    server.webhookController.verifyChallenge,
  );

  app.post('/meta', server.webhookController.receiveEvent);

  return Promise.resolve();
}
