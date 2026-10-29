import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL ?? 'info';

const loggerConfig = isDev
  ? {
      level: logLevel,
      transport: {
        targets: [
          {
            target: '@fastify/one-line-logger',
            options: {
              customColors: {
                info: 'blue',
                warn: 'yellow',
                error: 'red',
                debug: 'green',
              },
              colorize: true,
            },
          },
          {
            target: 'pino-roll',
            options: {
              file: path.join(__dirname, '../../logs/app.log'),
              frequency: 'daily',
              mkdir: true,
            },
          },
        ],
      },
    }
  : {
      level: logLevel,
      formatters: {
        level: (label: string) => ({ level: label }),
      },
    };

const server: FastifyInstance = Fastify({
  logger: loggerConfig,
  trustProxy: true,
});

export default server;
