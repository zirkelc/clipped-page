import type { Payload } from './payload.js';

/**
 * "direct" shares the original x.com URL with enhanced title/text.
 * Useful when the consumer (e.g. Apple Reminders) only needs a real link.
 * "web" shares the clipped.page renderer URL so the receiver can view a stateless
 * card or scrape the embedded payload via Accept negotiation.
 */
export type ShareMode = 'direct' | 'web';

export const DEFAULT_SHARE_MODE: ShareMode = 'direct';

export function isShareMode(value: unknown): value is ShareMode {
  return value === 'direct' || value === 'web';
}

/**
 * Builds the title/text the OS Share sheet should populate
 * (e.g. Apple Reminders maps title → reminder title, text → notes).
 * The URL is passed separately so a bare "Copy" target stays clean.
 */
export function buildShareFields(payload: Payload): { title: string; text: string } {
  const focal = payload.posts[payload.focal] ?? payload.posts[0]!;
  const title = `@${focal.author.handle} ${focal.author.name}`;
  const text = focal.text;
  return { title, text };
}
