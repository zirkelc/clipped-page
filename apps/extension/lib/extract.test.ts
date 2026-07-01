import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';
import { afterEach, test, expect } from 'vitest';
import { extractTweetFromArticle } from './extract.js';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__');

let dom: JSDOM | undefined;

/**
 * Load a fixture into a jsdom document and expose the globals the extractor
 * reads (document, location, Node). `url` controls `location.pathname`, which
 * decides whether extraction treats the page as a permalink (thread walking).
 */
function load(name: string, url: string): Document {
  dom = new JSDOM(readFileSync(join(FIXTURES, `${name}.html`), 'utf8'), { url });
  const g = globalThis as any;
  g.window = dom.window;
  g.document = dom.window.document;
  g.location = dom.window.location;
  g.Node = dom.window.Node;
  return dom.window.document;
}

function articleByStatusId(doc: Document, id: string): HTMLElement {
  const articles = Array.from(doc.querySelectorAll('article[data-testid="tweet"]')) as Array<HTMLElement>;
  return articles.find((a) => a.querySelector('time[datetime]')?.closest('a')?.getAttribute('href')?.endsWith(`/status/${id}`))!;
}

afterEach(() => {
  dom?.window.close();
  dom = undefined;
  const g = globalThis as any;
  g.window = undefined;
  g.document = undefined;
  g.location = undefined;
  g.Node = undefined;
});

const PROFILE = 'https://x.com/home';

test(`should extract a plain text post with metrics`, () => {
  // Arrange
  const doc = load('plain', PROFILE);
  const article = doc.querySelector('article[data-testid="tweet"]') as HTMLElement;

  // Act
  const result = extractTweetFromArticle(article);

  // Assert
  expect(result).not.toBe(null);
  expect(result!.src).toBe('x.com/theo/status/2072066764465393917');
  expect(result!.payload.posts.length).toBe(1);
  expect(result!.payload.focal).toBe(0);
  const post = result!.payload.posts[0]!;
  expect(post.author).toEqual({ handle: 'theo', name: 'Theo - t3.gg' });
  expect(post.text).toBe('Sonnet 5 cost MORE than Opus 4.8 on the Artificial Analysis Intelligence Index');
  expect(post.timestamp).toBe('2026-06-30T21:16:28.000Z');
  expect(post.metrics).toEqual({ likes: 2_300, reposts: 139, bookmarks: 218, views: 541_200 });
  expect(post.images).toBe(undefined);
  expect(post.videos).toBe(undefined);
  expect(post.card).toBe(undefined);
  expect(post.quote).toBe(undefined);
});

test(`should extract a video post as a video, keeping emoji and line breaks in the text`, () => {
  // Arrange
  const doc = load('video', PROFILE);
  const article = doc.querySelector('article[data-testid="tweet"]') as HTMLElement;

  // Act
  const result = extractTweetFromArticle(article);

  // Assert
  const post = result!.payload.posts[0]!;
  expect(result!.src).toBe('x.com/theo/status/2072165349139886490');
  expect(post.text).toBe('Big day for Claude fans! We now have Sonnet 5 and Fable is back tomorrow 🙏\n\nI saw a lot of misunderstandings about Sonnet 5, so I rushed out a video to try and break it down.');
  expect(post.timestamp).toBe('2026-07-01T03:48:12.000Z');
  expect(post.videos).toEqual([{ poster: 'https://pbs.twimg.com/amplify_video_thumb/2072164851032674304/img/5-hnkJCKvxfe6WCF.jpg' }]);
  expect(post.images).toBe(undefined);
  expect(post.metrics).toEqual({ likes: 401, reposts: 14, bookmarks: 84, views: 28_000 });
});

test(`should extract multiple images and normalise them to name=large`, () => {
  // Arrange
  const doc = load('images', PROFILE);
  const article = doc.querySelector('article[data-testid="tweet"]') as HTMLElement;

  // Act
  const result = extractTweetFromArticle(article);

  // Assert
  const post = result!.payload.posts[0]!;
  expect(post.images).toEqual([
    'https://pbs.twimg.com/media/AAA111?format=jpg&name=large',
    'https://pbs.twimg.com/media/BBB222?format=jpg&name=large',
  ]);
  expect(post.videos).toBe(undefined);
  expect(post.metrics).toEqual({ likes: 1_200, views: 50_000 });
});

test(`should extract a link-preview card with domain, title, and normalised image`, () => {
  // Arrange
  const doc = load('card', PROFILE);
  const article = doc.querySelector('article[data-testid="tweet"]') as HTMLElement;

  // Act
  const result = extractTweetFromArticle(article);

  // Assert
  const post = result!.payload.posts[0]!;
  expect(post.card).toEqual({
    url: 'https://t.co/abc123XYZ',
    title: 'Apple announces the new thing',
    domain: 'theverge.com',
    image: 'https://pbs.twimg.com/card_img/111/abc?format=jpg&name=large',
  });
});

test(`should extract a quote with an image and derive its url from the photo permalink`, () => {
  // Arrange
  const doc = load('quote-image', PROFILE);
  const article = doc.querySelector('article[data-testid="tweet"]') as HTMLElement;

  // Act
  const result = extractTweetFromArticle(article);

  // Assert
  const post = result!.payload.posts[0]!;
  expect(post.text).toBe('Look at this!');
  /* The only image is inside the quote block, so the outer post must not inherit it. */
  expect(post.images).toBe(undefined);
  expect(post.quote).toEqual({
    url: 'x.com/origauthor/status/555444333222111000',
    author: { handle: 'origauthor', name: 'Orig Author' },
    text: 'Original post with a photo',
    timestamp: '2026-05-31T09:00:00.000Z',
    images: ['https://pbs.twimg.com/media/QQQ999?format=jpg&name=large'],
  });
});

test(`should extract a text-only quote without a url or images`, () => {
  // Arrange
  const doc = load('quote-text', PROFILE);
  const article = doc.querySelector('article[data-testid="tweet"]') as HTMLElement;

  // Act
  const result = extractTweetFromArticle(article);

  // Assert
  const post = result!.payload.posts[0]!;
  expect(post.author).toEqual({ handle: 'angelbrodin', name: 'angel' });
  expect(post.text).toBe('Our team is really incredible');
  expect(post.quote).toEqual({
    author: { handle: 'theo', name: 'Theo - t3.gg' },
    text: "Filmed a video about why OpenAI models are so efficient. With Sonnet 5's insane inefficiencies, feels like a good time to post it :)",
    timestamp: '2026-06-30T22:53:32.000Z',
  });
  expect(post.quote!.url).toBe(undefined);
  expect(post.quote!.images).toBe(undefined);
});

test(`should walk a thread forward through same-author posts and stop at a different author`, () => {
  // Arrange
  const doc = load('thread', 'https://x.com/theo/status/2000000000000000001');
  const focal = articleByStatusId(doc, '2000000000000000001');

  // Act
  const result = extractTweetFromArticle(focal);

  // Assert
  expect(result!.src).toBe('x.com/theo/status/2000000000000000001');
  expect(result!.payload.posts.length).toBe(3);
  expect(result!.payload.focal).toBe(0);
  expect(result!.payload.truncated).toBe(undefined);
  expect(result!.payload.posts.map((p) => p.text)).toEqual(['Thread part 1', 'Thread part 2', 'Thread part 3']);
  expect(result!.payload.posts.every((p) => p.author.handle === 'theo')).toBe(true);
});
