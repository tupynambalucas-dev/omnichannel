import { MetaWebhookPayloadSchema } from '@tupynambalucas-dev/omnichannel-core';
import type { MetaWebhookVerifyQuery } from '@tupynambalucas-dev/omnichannel-core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../utils/AppError.js';
import { verifyMetaHmacSignature } from './webhook.security.js';
import type { WebhookService } from './webhook.service.js';

export class WebhookController {
  private readonly service: WebhookService;
  private readonly verifyToken: string;
  private readonly appSecret: string;

  constructor(options: { service: WebhookService; verifyToken: string; appSecret: string }) {
    this.service = options.service;
    this.verifyToken = options.verifyToken;
    this.appSecret = options.appSecret;
  }

  /**
   * Handles `GET /webhooks/meta` subscription verification challenge from Meta App Dashboard.
   */
  public verifyChallenge = async (
    request: FastifyRequest<{ Querystring: MetaWebhookVerifyQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];

    if (mode === 'subscribe' && token === this.verifyToken) {
      await reply.status(200).type('text/plain').send(challenge);
      return;
    }

    throw new AppError('WEBHOOK_VERIFICATION_FAILED', 403, 'Invalid webhook verify token.');
  };

  /**
   * Handles `POST /webhooks/meta` unified WhatsApp + Instagram events.
   * Validates `X-Hub-Signature-256` against raw unparsed request bytes before parsing or queueing.
   */
  public receiveEvent = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const signatureHeader = request.headers['x-hub-signature-256'];
    const signature = typeof signatureHeader === 'string' ? signatureHeader : undefined;

    if (this.appSecret.length > 0) {
      const signatureValid = verifyMetaHmacSignature(request.rawBody, signature, this.appSecret);

      if (!signatureValid) {
        throw new AppError(
          'INVALID_WEBHOOK_SIGNATURE',
          401,
          'Meta X-Hub-Signature-256 cryptographic verification failed.',
        );
      }
    }

    const parsedPayload = MetaWebhookPayloadSchema.parse(request.body);
    const summary = await this.service.ingestMetaWebhook(parsedPayload);

    await reply.status(200).send({
      received: true,
      ...summary,
    });
  };
}
