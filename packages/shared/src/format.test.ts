import { describe, test, expect } from 'vitest';
import { formatCount, parseCount } from './count.js';
import { toMarkdown } from './format.js';
import type { Payload } from './payload.js';

const single: Payload = {
  posts: [
    {
      author: { handle: 'jack', name: 'jack' },
      text: 'just setting up my twttr',
      images: ['https://pbs.twimg.com/media/abc?format=jpg&name=large'],
      timestamp: '2006-03-21T20:50:14.000Z',
    },
  ],
  focal: 0,
};

const thread: Payload = {
  posts: [
    {
      author: { handle: 'jack', name: 'jack' },
      text: 'thread root',
      timestamp: '2026-04-30T12:00:00.000Z',
    },
    {
      author: { handle: 'jack', name: 'jack' },
      text: 'continuation 1',
      timestamp: '2026-04-30T12:01:00.000Z',
    },
    {
      author: { handle: 'jack', name: 'jack' },
      text: 'continuation 2',
      timestamp: '2026-04-30T12:02:00.000Z',
    },
  ],
  focal: 1,
};

const src = 'https://x.com/jack/status/20';

describe('toMarkdown', () => {
  test(`should render a single post without thread header`, () => {
    // Arrange / Act
    const result = toMarkdown(single, src);

    // Assert
    expect(result).toContain('**jack**');
    expect(result).toContain('just setting up my twttr');
    expect(result).toContain('![image](https://pbs.twimg.com/media/abc?format=jpg&name=large)');
    expect(result).toContain(`Source: ${src}`);
    expect(result).not.toContain('Thread (');
  });

  test(`should render a thread with header and focal marker`, () => {
    // Arrange / Act
    const result = toMarkdown(thread, src);

    // Assert
    expect(result).toContain('Thread (3 posts)');
    expect(result).toContain('thread root');
    expect(result).toContain('→ **jack**');
    expect(result).toContain('continuation 1');
    expect(result).toContain('continuation 2');
    expect(result.match(/^---$/gm)?.length).toBe(2);
  });
});

describe('parseCount', () => {
  test(`should parse plain integers and comma-grouped numbers`, () => {
    // Arrange / Act / Assert
    expect(parseCount('0')).toBe(0);
    expect(parseCount('1234')).toBe(1234);
    expect(parseCount('1,234')).toBe(1234);
  });

  test(`should parse K, M, B suffixes case-insensitively`, () => {
    // Arrange / Act / Assert
    expect(parseCount('1.2K')).toBe(1200);
    expect(parseCount('12M')).toBe(12_000_000);
    expect(parseCount('2.5b')).toBe(2_500_000_000);
  });

  test(`should pull a number out of label fragments`, () => {
    // Arrange / Act / Assert
    expect(parseCount('1,234 Likes')).toBe(1234);
  });

  test(`should return null for input without digits`, () => {
    // Arrange / Act / Assert
    expect(parseCount('')).toBe(null);
    expect(parseCount('Like')).toBe(null);
  });
});

describe('formatCount', () => {
  test(`should leave counts under 1k as plain integers`, () => {
    // Arrange / Act / Assert
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
  });

  test(`should use K with one decimal under 10k and no decimal under 1M`, () => {
    // Arrange / Act / Assert
    expect(formatCount(1_200)).toBe('1.2K');
    expect(formatCount(12_345)).toBe('12K');
    expect(formatCount(999_000)).toBe('999K');
  });

  test(`should use M and B suffixes for large counts`, () => {
    // Arrange / Act / Assert
    expect(formatCount(1_500_000)).toBe('1.5M');
    expect(formatCount(2_000_000_000)).toBe('2B');
  });
});

describe('card rendering', () => {
  const withCard: Payload = {
    posts: [
      {
        ...single.posts[0]!,
        card: {
          url: 'https://t.co/abc',
          title: 'Changelog - Claude Code Docs',
          domain: 'code.claude.com',
          image: 'https://pbs.twimg.com/card_img/x.jpg?name=large',
        },
      },
    ],
    focal: 0,
  };

  test(`should include card link in markdown`, () => {
    // Arrange / Act
    const result = toMarkdown(withCard, src);

    // Assert
    expect(result).toContain('→ [Changelog - Claude Code Docs](https://t.co/abc)');
  });
});

describe('metrics rendering', () => {
  test(`should include a metrics line in markdown when metrics present`, () => {
    // Arrange
    const p: Payload = {
      posts: [
        {
          ...single.posts[0]!,
          metrics: { likes: 1200, reposts: 30, bookmarks: 5, views: 12_345 },
        },
      ],
      focal: 0,
    };

    // Act
    const result = toMarkdown(p, src);

    // Assert
    expect(result).toContain('1.2K likes · 30 reposts · 5 bookmarks · 12K views');
  });
});
