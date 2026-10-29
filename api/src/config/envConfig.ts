export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  SERVER_HOST: string;
  SERVER_PORT: number;
  LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  CORS_ALLOWED_ORIGINS: string;
  META_GRAPH_BASE_URL: string;
  META_GRAPH_API_VERSION: string;
  META_WEBHOOK_VERIFY_TOKEN: string;
  META_APP_SECRET: string;
  DATABASE_URL: string;
  DATABASE_SSL_ENABLED: boolean;
  DATABASE_POOL_MAX: number;
  REDIS_QUEUE_URL: string;
  REDIS_STATE_URL: string;
  MONGODB_ARCHIVE_ENABLED: boolean;
  MONGODB_URI: string;
  SENTRY_DSN: string;
}

export const envSchema = {
  type: 'object',
  required: ['NODE_ENV', 'SERVER_HOST', 'SERVER_PORT'],
  properties: {
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'production', 'test'],
      default: 'development',
    },
    SERVER_HOST: {
      type: 'string',
      default: '0.0.0.0',
    },
    SERVER_PORT: {
      type: 'number',
      default: 3000,
    },
    LOG_LEVEL: {
      type: 'string',
      enum: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
      default: 'info',
    },
    CORS_ALLOWED_ORIGINS: {
      type: 'string',
      default: 'http://localhost:3000,http://localhost:5173',
    },
    META_GRAPH_BASE_URL: {
      type: 'string',
      default: 'https://graph.facebook.com',
    },
    META_GRAPH_API_VERSION: {
      type: 'string',
      default: 'v22.0',
    },
    META_WEBHOOK_VERIFY_TOKEN: {
      type: 'string',
      default: 'dev-verify-token',
    },
    META_APP_SECRET: {
      type: 'string',
      default: '',
    },
    DATABASE_URL: {
      type: 'string',
      default: '',
    },
    DATABASE_SSL_ENABLED: {
      type: 'boolean',
      default: true,
    },
    DATABASE_POOL_MAX: {
      type: 'number',
      default: 20,
    },
    REDIS_QUEUE_URL: {
      type: 'string',
      default: '',
    },
    REDIS_STATE_URL: {
      type: 'string',
      default: '',
    },
    MONGODB_ARCHIVE_ENABLED: {
      type: 'boolean',
      default: false,
    },
    MONGODB_URI: {
      type: 'string',
      default: '',
    },
    SENTRY_DSN: {
      type: 'string',
      default: '',
    },
  },
} as const;
