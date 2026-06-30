import { describe, test, expect } from 'vitest';
import { encode, decode, DecodeError } from './codec.js';
import type { Payload, Post } from './payload.js';

const samplePost: Post = {
  author: { handle: 'jack', name: 'jack' },
  text: 'just setting up my twttr',
  timestamp: '2006-03-21T20:50:14.000Z',
};

const samplePayload: Payload = {
  posts: [samplePost],
  focal: 0,
};

describe('codec', () => {
  test(`should round-trip a single-post payload`, async () => {
    // Arrange
    const input = samplePayload;

    // Act
    const encoded = await encode(input);
    const decoded = await decode(encoded);

    // Assert
    expect(decoded).toEqual(input);
  });

  test(`should round-trip a thread payload with images, metrics, unicode`, async () => {
    // Arrange
    const input: Payload = {
      posts: [
        {
          author: { handle: 'foo', name: 'Foo 🦄' },
          text: 'Thread root',
          timestamp: '2026-04-30T12:34:56.000Z',
          metrics: { likes: 1200, reposts: 30, views: 8300 },
        },
        {
          author: { handle: 'foo', name: 'Foo 🦄' },
          text: 'Continuation — émoji 🎉',
          images: ['https://pbs.twimg.com/media/abc?format=jpg&name=large'],
          timestamp: '2026-04-30T12:35:00.000Z',
        },
      ],
      focal: 0,
    };

    // Act
    const encoded = await encode(input);
    const decoded = await decode(encoded);

    // Assert
    expect(decoded).toEqual(input);
  });

  test(`should produce a base64url string with no padding or unsafe chars`, async () => {
    // Arrange
    const input = samplePayload;

    // Act
    const encoded = await encode(input);

    // Assert
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test(`should compress: a 5-post thread fits under 1500 base64url chars`, async () => {
    // Arrange
    const input: Payload = {
      posts: Array.from({ length: 5 }, (_, i) => ({
        author: { handle: 'longform_writer', name: 'Longform Writer' },
        text:
          'This is post ' +
          (i + 1) +
          ' in a thread about something with enough words to be realistic for a tweet length, including some repeated phrases and structure.',
        timestamp: `2026-05-0${i + 1}T12:00:00.000Z`,
        metrics: { likes: 1234, reposts: 56, views: 12_000, bookmarks: 7 },
      })),
      focal: 0,
    };

    // Act
    const encoded = await encode(input);

    // Assert
    expect(encoded.length).toBeLessThan(1500);
  });

  test(`should tolerate trailing garbage from OS share sheets (text/emoji appended)`, async () => {
    // Arrange
    const clean = await encode(samplePayload);
    const dirty = clean + ' Some trailing tweet text 🧵 with emoji';

    // Act
    const decoded = await decode(dirty);

    // Assert
    expect(decoded).toEqual(samplePayload);
  });

  test(`should reject DecodeError on empty input`, async () => {
    // Arrange / Act / Assert
    await expect(decode('')).rejects.toThrow(DecodeError);
  });

  test(`should reject DecodeError on invalid base64url`, async () => {
    // Arrange / Act / Assert
    await expect(decode('!!!not-base64!!!')).rejects.toThrow(DecodeError);
  });

  test(`should reject DecodeError when bytes are not valid gzip`, async () => {
    // Arrange
    const bytes = new TextEncoder().encode('plain not gzipped');
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
    const bad = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Act / Assert
    await expect(decode(bad)).rejects.toThrow(DecodeError);
  });

  test(`should reject DecodeError when JSON valid but schema fails`, async () => {
    // Arrange
    const bytes = new TextEncoder().encode(JSON.stringify({ foo: 'bar' }));
    const stream = new Response(bytes).body!.pipeThrough(new CompressionStream('gzip'));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    let bin = '';
    for (let i = 0; i < compressed.length; i++) bin += String.fromCharCode(compressed[i]!);
    const bad = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Act / Assert
    await expect(decode(bad)).rejects.toThrow(DecodeError);
  });

  test(`should reject when focal index out of range`, async () => {
    // Arrange
    const broken = { posts: [samplePost], focal: 5 } as unknown as Payload;

    // Act / Assert
    await expect(encode(broken)).rejects.toThrow();
  });

  test(`should reject when posts array empty`, async () => {
    // Arrange
    const broken = { posts: [], focal: 0 } as unknown as Payload;

    // Act / Assert
    await expect(encode(broken)).rejects.toThrow();
  });
});
