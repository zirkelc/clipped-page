import { encode, decode, DecodeError } from './codec.js';
import type { Payload } from './payload.js';

export const SHARE_URL_VERSION = '1';

export type ShareUrlInput = {
  baseUrl: string;
  src: string;
  payload: Payload;
};

export async function buildShareUrl({ baseUrl, src, payload }: ShareUrlInput): Promise<string> {
  const url = new URL(baseUrl);
  url.searchParams.set('v', SHARE_URL_VERSION);
  url.searchParams.set('s', src);
  url.searchParams.set('d', await encode(payload));
  return url.toString();
}

export type ParsedShareUrl =
  | { ok: true; src: string; payload: Payload }
  | { ok: false; error: string };

export async function parseShareUrl(url: URL): Promise<ParsedShareUrl> {
  /* Default to current version if `v` is absent so legacy/hand-crafted URLs
   * still work; reject explicit mismatches so a future v2 link points users
   * at a clear error rather than a cryptic schema failure. */
  const v = url.searchParams.get('v') ?? SHARE_URL_VERSION;
  if (v !== SHARE_URL_VERSION) {
    return { ok: false, error: `unsupported share-url version "${v}" (expected "${SHARE_URL_VERSION}")` };
  }
  const src = url.searchParams.get('s');
  const d = url.searchParams.get('d');
  if (!src) return { ok: false, error: 'missing s parameter' };
  if (!d) return { ok: false, error: 'missing d parameter' };
  try {
    const payload = await decode(d);
    return { ok: true, src, payload };
  } catch (e) {
    if (e instanceof DecodeError) return { ok: false, error: e.message };
    return { ok: false, error: 'unknown decode error' };
  }
}
