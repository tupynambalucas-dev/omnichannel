import { META_ERROR_CODES } from '@tupynambalucas-dev/omnichannel-core';
import type { CompiledProviderRequest } from './outbound.compiler.js';

export interface MetaGraphErrorPayload {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export class MetaGraphDispatchError extends Error {
  public readonly httpStatus: number;
  public readonly metaCode?: number;
  public readonly metaSubcode?: number;
  public readonly isRateLimitError: boolean;
  public readonly isPermanentPolicyError: boolean;
  public readonly retryAfterMs?: number;

  constructor(options: {
    message: string;
    httpStatus: number;
    metaCode?: number;
    metaSubcode?: number;
    retryAfterMs?: number;
  }) {
    super(options.message);
    this.name = 'MetaGraphDispatchError';
    this.httpStatus = options.httpStatus;
    this.metaCode = options.metaCode;
    this.metaSubcode = options.metaSubcode;
    this.retryAfterMs = options.retryAfterMs;

    this.isRateLimitError =
      options.httpStatus === 429 ||
      options.metaCode === META_ERROR_CODES.WA_THROUGHPUT_LIMIT ||
      options.metaCode === META_ERROR_CODES.WA_PAIR_RATE_LIMIT;

    this.isPermanentPolicyError =
      options.metaCode === META_ERROR_CODES.WA_UNDELIVERABLE_OR_WINDOW ||
      options.metaCode === META_ERROR_CODES.WA_REENGAGEMENT_REQUIRED ||
      (options.metaCode === META_ERROR_CODES.IG_POLICY_VIOLATION &&
        options.metaSubcode === META_ERROR_CODES.IG_OUTSIDE_WINDOW_SUBCODE) ||
      (options.httpStatus >= 400 && options.httpStatus < 500 && !this.isRateLimitError);
  }
}

export interface MetaGraphClientOptions {
  baseUrl: string;
  apiVersion: string;
}

export interface MetaDispatchResult {
  providerMessageId: string;
  httpStatus: number;
}

export class MetaGraphClient {
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(options: MetaGraphClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiVersion = options.apiVersion;
  }

  /**
   * Resolves a tenant's access token from environment/Infisical secret reference at call time.
   */
  public resolveAccessToken(secretRef: string): string {
    const token = process.env[secretRef];
    if (token === undefined || token.trim().length === 0) {
      throw new MetaGraphDispatchError({
        message: `Access token secret reference "${secretRef}" is not present in runtime environment.`,
        httpStatus: 401,
      });
    }
    return token.trim();
  }

  /**
   * Dispatches a compiled WhatsApp or Instagram message payload to Meta Graph API.
   */
  public async sendCompiledMessage(
    request: CompiledProviderRequest,
    accessToken: string,
  ): Promise<MetaDispatchResult> {
    const endpointUrl = `${this.baseUrl}/${this.apiVersion}/${encodeURIComponent(request.endpointAccountId)}/messages`;

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(10_000),
    });

    const rawText = await response.text();
    let parsedBody: Record<string, unknown> = {};
    if (rawText.length > 0) {
      try {
        parsedBody = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        parsedBody = {};
      }
    }

    if (!response.ok) {
      const errorEnvelope = parsedBody as MetaGraphErrorPayload;
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterSeconds =
        retryAfterHeader !== null ? Number.parseInt(retryAfterHeader, 10) : Number.NaN;

      throw new MetaGraphDispatchError({
        message:
          errorEnvelope.error?.message ??
          `Meta Graph API request failed with HTTP ${String(response.status)}`,
        httpStatus: response.status,
        metaCode: errorEnvelope.error?.code,
        metaSubcode: errorEnvelope.error?.error_subcode,
        retryAfterMs: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : undefined,
      });
    }

    // WhatsApp returns { messages: [{ id: "wamid..." }] }; Instagram returns { message_id: "m_..." }
    let providerMessageId = 'unknown';
    if (typeof parsedBody.message_id === 'string') {
      providerMessageId = parsedBody.message_id;
    } else if (Array.isArray(parsedBody.messages) && parsedBody.messages.length > 0) {
      const firstMessage = parsedBody.messages[0] as Record<string, unknown>;
      if (typeof firstMessage.id === 'string') {
        providerMessageId = firstMessage.id;
      }
    }

    return {
      providerMessageId,
      httpStatus: response.status,
    };
  }
}
