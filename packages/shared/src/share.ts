import type { Payload } from './payload.js';

/**
 * Builds the title/text for the rendered card's share button (the Web Share
 * sheet populates title/text from these). The URL is passed separately so a
 * bare "Copy" target stays clean.
 */
export function buildShareFields(payload: Payload): { title: string; text: string } {
  const focal = payload.posts[payload.focal] ?? payload.posts[0]!;
  const title = `@${focal.author.handle} ${focal.author.name}`;
  const text = focal.text;
  return { title, text };
}
