import { describe, test, expect } from 'vitest';
import { buildShareUrl, parseShareUrl } from './url.js';
import type { Payload } from './payload.js';

const payload: Payload = {
  posts: [
    {
      author: { handle: 'jack', name: 'jack' },
      text: 'hello',
      timestamp: '2006-03-21T20:50:14.000Z',
    },
  ],
  focal: 0,
};

describe('buildShareUrl + parseShareUrl', () => {
  test(`should round-trip via URL`, async () => {
    // Arrange
    const src = 'x.com/jack/status/20';

    // Act
    const built = await buildShareUrl({ baseUrl: 'https://share.example/', src, payload });
    const parsed = await parseShareUrl(new URL(built));

    // Assert
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.src).toBe(src);
      expect(parsed.payload).toEqual(payload);
    }
  });

  test(`should set v=1 on built URLs`, async () => {
    // Arrange / Act
    const built = await buildShareUrl({ baseUrl: 'https://share.example/', src: 'x.com/a/status/1', payload });

    // Assert
    expect(new URL(built).searchParams.get('v')).toBe('1');
  });

  test(`should reject mismatched version`, async () => {
    // Arrange
    const url = new URL('https://share.example/?v=2&s=x.com/a/status/1&d=anything');

    // Act
    const result = await parseShareUrl(url);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('unsupported share-url version');
      expect(result.error).toContain('"2"');
    }
  });

  test(`should write the s param (not src) on built URLs`, async () => {
    // Arrange / Act
    const built = await buildShareUrl({ baseUrl: 'https://share.example/', src: 'x.com/a/status/1', payload });

    // Assert
    const u = new URL(built);
    expect(u.searchParams.get('s')).toBe('x.com/a/status/1');
    expect(u.searchParams.get('src')).toBe(null);
  });

  test(`should fail to parse when s missing`, async () => {
    // Arrange
    const url = new URL('https://share.example/?d=abc');

    // Act
    const result = await parseShareUrl(url);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('s parameter');
  });

  test(`should fail to parse when d missing`, async () => {
    // Arrange
    const url = new URL('https://share.example/?s=x.com/a/status/1');

    // Act
    const result = await parseShareUrl(url);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('d parameter');
  });
});
