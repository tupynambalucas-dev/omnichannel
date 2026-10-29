import { randomBytes } from 'node:crypto';

/**
 * Generates an RFC 9562 compliant time-ordered UUIDv7 string.
 * Provides B-Tree index locality in PostgreSQL primary keys while avoiding coordination overhead.
 */
export function generateUuidV7(timestampMs: number = Date.now()): string {
  const bytes = new Uint8Array(16);
  const random = randomBytes(10);

  const timeBigInt = BigInt(Math.max(0, Math.trunc(timestampMs)));
  bytes[0] = Number((timeBigInt >> 40n) & 0xffn);
  bytes[1] = Number((timeBigInt >> 32n) & 0xffn);
  bytes[2] = Number((timeBigInt >> 24n) & 0xffn);
  bytes[3] = Number((timeBigInt >> 16n) & 0xffn);
  bytes[4] = Number((timeBigInt >> 8n) & 0xffn);
  bytes[5] = Number(timeBigInt & 0xffn);

  bytes.set(random, 6);

  // Set version 7 (0b0111xxxx) in octet 6
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // Set RFC 9562 variant (0b10xxxxxx) in octet 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Buffer.from(bytes).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
