import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNATURE_PREFIX = 'sha256=';

/**
 * Verifies Meta's `X-Hub-Signature-256` webhook header against the exact unparsed request Buffer.
 * Uses constant-time `crypto.timingSafeEqual` to prevent timing oracle attacks.
 */
export function verifyMetaHmacSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (
    rawBody === undefined ||
    signatureHeader === undefined ||
    !signatureHeader.startsWith(SIGNATURE_PREFIX) ||
    appSecret.length === 0
  ) {
    return false;
  }

  const providedHex = signatureHeader.slice(SIGNATURE_PREFIX.length).trim();
  if (providedHex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(providedHex)) {
    return false;
  }

  const expectedDigest = createHmac('sha256', appSecret).update(rawBody).digest();
  const providedDigest = Buffer.from(providedHex, 'hex');

  if (expectedDigest.length !== providedDigest.length) {
    return false;
  }

  return timingSafeEqual(expectedDigest, providedDigest);
}
