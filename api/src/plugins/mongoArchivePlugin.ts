import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import mongoose from 'mongoose';

interface WebhookArchiveDocument {
  objectType: string;
  payload: Record<string, unknown>;
  receivedAt: Date;
}

const NINETY_DAYS_SECONDS = 90 * 24 * 60 * 60;

const webhookArchiveSchema = new mongoose.Schema<WebhookArchiveDocument>(
  {
    objectType: { type: String, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    receivedAt: { type: Date, default: Date.now, expires: NINETY_DAYS_SECONDS },
  },
  {
    collection: 'raw_webhook_archive',
    versionKey: false,
  },
);

const mongoArchivePlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  if (!server.config.MONGODB_ARCHIVE_ENABLED || server.config.MONGODB_URI.trim().length === 0) {
    server.decorate('archiveRawWebhook', undefined);
    return;
  }

  const connection = await mongoose.createConnection(server.config.MONGODB_URI.trim()).asPromise();
  const ArchiveModel = connection.model<WebhookArchiveDocument>(
    'RawWebhookArchive',
    webhookArchiveSchema,
  );

  server.log.info('Connected to optional Cloud MongoDB Atlas webhook telemetry archive.');

  server.decorate(
    'archiveRawWebhook',
    async (objectType: string, payload: Record<string, unknown>): Promise<void> => {
      await ArchiveModel.create({
        objectType,
        payload,
        receivedAt: new Date(),
      });
    },
  );

  server.addHook('onClose', async () => {
    await connection.close();
  });
};

export default fp(mongoArchivePlugin, { name: 'omnichannel-mongo-archive' });
