import { z } from 'zod';
import { PayloadSchema, type Payload } from './payload.js';

export class DecodeError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DecodeError';
  }
}

const Bytes = z.instanceof(Uint8Array);

const base64UrlBytes = z.codec(z.string(), Bytes, {
  decode: (raw) => {
    /* Take the longest valid base64url prefix and ignore any trailing garbage.
     * Some OS share sheets append the post text/emoji after the URL, which lands
     * in `searchParams.get('d')` and breaks atob(). Trim ends + drop trailing `=`,
     * then prefix-match — non-alphabet chars (space, emoji) terminate the match. */
    const m = raw.trim().replace(/=+$/, '').match(/^[A-Za-z0-9_-]+/);
    if (!m) throw new Error(`d param has no valid base64url content (head=${raw.slice(0, 16)}...)`);
    const s = m[0];
    const b = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
    const bin = atob(b);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  },
  encode: (u) => {
    let bin = '';
    for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]!);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
});

const gzippedBytes = z.codec(Bytes, Bytes, {
  decode: async (compressed) => {
    const stream = new Blob([compressed as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  },
  encode: async (raw) => {
    const stream = new Blob([raw as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  },
});

const utf8Bytes = z.codec(Bytes, z.string(), {
  decode: (b) => new TextDecoder().decode(b),
  encode: (s) => new TextEncoder().encode(s),
});

const jsonPayload = z.codec(z.string(), PayloadSchema, {
  decode: (s) => JSON.parse(s),
  encode: (p) => JSON.stringify(p),
});

/**
 * Wire-format pipeline (forward = decode):
 *   base64url string → gzipped bytes → raw bytes → JSON string → Payload
 */
export const PayloadCodec = base64UrlBytes.pipe(gzippedBytes).pipe(utf8Bytes).pipe(jsonPayload);

export async function encode(payload: Payload): Promise<string> {
  try {
    const result = await z.safeEncodeAsync(PayloadCodec, payload);
    if (!result.success) throw new DecodeError(`failed to encode: ${describe(result.error)}`, result.error);
    return result.data;
  } catch (cause) {
    if (cause instanceof DecodeError) throw cause;
    throw new DecodeError(`failed to encode: ${describe(cause)}`, cause);
  }
}

export async function decode(s: string): Promise<Payload> {
  if (!s) throw new DecodeError('empty payload');
  try {
    const result = await z.safeDecodeAsync(PayloadCodec, s);
    if (!result.success) throw new DecodeError(`failed to decode: ${describe(result.error)}`, result.error);
    return result.data;
  } catch (cause) {
    if (cause instanceof DecodeError) throw cause;
    throw new DecodeError(`failed to decode: ${describe(cause)}`, cause);
  }
}

function describe(e: unknown): string {
  if (e instanceof z.ZodError) {
    const first = e.issues[0];
    return first ? `${first.path.join('.') || '<root>'}: ${first.message}` : 'validation error';
  }
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}
