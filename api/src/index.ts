import server from './config/fastifyInstanceConfig.js';
import registryPlugin from './plugins/registryPlugin.js';

async function startServer(): Promise<void> {
  const app = server;

  await app.register(registryPlugin);

  const shutdownGracefully = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'Received shutdown signal; closing omnichannel gateway.');
    await app.close();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdownGracefully('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdownGracefully('SIGTERM');
  });

  try {
    await app.listen({
      port: app.config.SERVER_PORT,
      host: app.config.SERVER_HOST,
    });

    app.log.info(
      `Omnichannel API gateway listening on http://${app.config.SERVER_HOST}:${String(app.config.SERVER_PORT)}`,
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void startServer();
