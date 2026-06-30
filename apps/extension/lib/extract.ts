import { parseCount } from '@clipped-page/shared/count';
import type { Metrics, Payload, Post, PostCard, Quote, Video } from '@clipped-page/shared';

export type ExtractedTweet = {
  payload: Payload;
  src: string;
};

const MAX_POSTS = 15;

/**
 * Extract a tweet (and its thread/parent-chain context, when visible in the DOM)
 * starting from the article the user clicked.
 *
 * Chain rule: only walk on permalink pages. All articles before focal are taken
 * as conversation parents; articles after focal are taken only while the author
 * matches focal's author (thread continuation).
 */
export function extractTweetFromArticle(focal: HTMLElement): ExtractedTweet | null {
  const focalPost = extractPost(focal);
  if (!focalPost) return null;
  const src = extractCanonicalUrl(focal);
  if (!src) return null;

  const isPermalink = /\/status\/\d+/.test(location.pathname);
  if (!isPermalink) {
    return { src, payload: { posts: [focalPost], focal: 0 } };
  }

  const root = document.querySelector('[data-testid="primaryColumn"]') ?? document;
  const allArticles = Array.from(root.querySelectorAll('article[data-testid="tweet"]')) as Array<HTMLElement>;
  const focalIdx = allArticles.indexOf(focal);
  if (focalIdx === -1) {
    return { src, payload: { posts: [focalPost], focal: 0 } };
  }

  const parents: Array<Post> = [];
  for (let i = 0; i < focalIdx; i++) {
    const p = extractPost(allArticles[i]!);
    if (p) parents.push(p);
  }

  /**
   * Top-level post: walk forward through same-author continuations (thread).
   * Reply: walk backward only (parent chain). A self-reply later in the
   * conversation is not part of "between root and focal" so it stays out.
   */
  const continuations: Array<Post> = [];
  if (focalIdx === 0) {
    for (let i = focalIdx + 1; i < allArticles.length; i++) {
      const p = extractPost(allArticles[i]!);
      if (!p) continue;
      if (p.author.handle === focalPost.author.handle) continuations.push(p);
      else break;
    }
  }

  let posts = [...parents, focalPost, ...continuations];
  let focalIndex = parents.length;
  let truncated = false;

  if (posts.length > MAX_POSTS) {
    const before = Math.min(focalIndex, Math.floor(MAX_POSTS / 2));
    const after = Math.min(posts.length - focalIndex - 1, MAX_POSTS - 1 - before);
    posts = posts.slice(focalIndex - before, focalIndex + after + 1);
    focalIndex = before;
    truncated = true;
  }

  return {
    src,
    payload: { posts, focal: focalIndex, ...(truncated ? { truncated } : {}) },
  };
}

function extractPost(article: HTMLElement): Post | null {
  /* A quoted post lives inside a nested `[role="link"][tabindex="0"]` block.
   * Find it first so the outer extractors can skip its content (images, card,
   * text) when the outer post would otherwise inherit them. */
  const quoteBlock = findQuoteBlock(article);
  const author = extractAuthor(article);
  const timestamp = extractTimestamp(article);
  if (author == null || timestamp == null) return null;
  /* `text` may legitimately be empty for a bare quote-tweet (the user quoted
   * a post without adding a comment). */
  const text = extractText(article, quoteBlock) ?? '';
  const images = extractImages(article, quoteBlock);
  const videos = extractVideos(article, quoteBlock);
  const metrics = extractMetrics(article);
  const card = extractCard(article, quoteBlock);
  const quote = quoteBlock ? extractQuote(quoteBlock) : null;
  return {
    author,
    text,
    timestamp,
    ...(images.length > 0 ? { images } : {}),
    ...(videos.length > 0 ? { videos } : {}),
    ...(metrics ? { metrics } : {}),
    ...(card ? { card } : {}),
    ...(quote ? { quote } : {}),
  };
}

function findQuoteBlock(article: HTMLElement): HTMLElement | null {
  const candidates = Array.from(article.querySelectorAll<HTMLElement>('[role="link"][tabindex="0"]'));
  for (const el of candidates) {
    if (el.querySelector('[data-testid="tweetText"]') || el.querySelector('[data-testid="User-Name"]')) {
      return el;
    }
  }
  return null;
}

function extractQuote(block: HTMLElement): Quote | null {
  const userBlock = block.querySelector<HTMLElement>('[data-testid="User-Name"]');
  if (!userBlock) return null;
  const author = readInlineAuthor(userBlock);
  if (!author) return null;

  const textNode = block.querySelector('[data-testid="tweetText"]');
  const text = textNode ? readTextPreservingLineBreaks(textNode) : '';

  const time = block.querySelector('time[datetime]');
  const dt = time?.getAttribute('datetime');
  if (!dt) return null;
  const d = new Date(dt);
  if (isNaN(d.getTime())) return null;
  const timestamp = d.toISOString();

  /* Try to find a /<handle>/status/<id> anchor. X only renders these inside
   * the quote block when there's media (the photo/video permalink wrapper);
   * text-only quotes have no static URL we can extract, in which case we
   * still capture the rest of the quote and leave `url` undefined. */
  let url: string | undefined;
  const anchors = Array.from(block.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]'));
  for (const a of anchors) {
    const href = a.getAttribute('href') ?? '';
    const m = href.match(/^\/([A-Za-z0-9_]+)\/status\/(\d+)/);
    if (m) { url = `x.com/${m[1]}/status/${m[2]}`; break; }
  }

  const images = collectImages(block);
  const videos = collectVideos(block);
  return {
    author,
    text,
    timestamp,
    ...(url ? { url } : {}),
    ...(images.length > 0 ? { images } : {}),
    ...(videos.length > 0 ? { videos } : {}),
  };
}

/**
 * Author parser for the quote's inline User-Name block. Unlike the outer
 * post's, this block doesn't always wrap the @handle in an `<a href="/handle">`,
 * so we read it from the @handle span text instead.
 */
function readInlineAuthor(userBlock: HTMLElement): { handle: string; name: string } | null {
  const spans = Array.from(userBlock.querySelectorAll('span'));
  let handle = '';
  let name = '';
  for (const s of spans) {
    const t = (s.textContent ?? '').trim();
    if (!t) continue;
    if (!handle && /^@[A-Za-z0-9_]+$/.test(t)) {
      handle = t.slice(1);
      continue;
    }
    if (!name && !t.startsWith('@') && t !== '·' && t.length < 80) {
      name = t;
    }
  }
  if (!handle) return null;
  if (!name) name = handle;
  return { handle, name };
}

function collectImages(root: HTMLElement): Array<string> {
  const imgs = Array.from(root.querySelectorAll('[data-testid="tweetPhoto"] img')) as Array<HTMLImageElement>;
  const urls: Array<string> = [];
  for (const img of imgs) {
    const src = img.getAttribute('src');
    if (!src) continue;
    const url = new URL(src, location.href);
    if (url.searchParams.has('name')) url.searchParams.set('name', 'large');
    urls.push(url.toString());
  }
  return urls;
}

function collectVideos(root: HTMLElement): Array<Video> {
  const videos = Array.from(root.querySelectorAll('video')) as Array<HTMLVideoElement>;
  const out: Array<Video> = [];
  for (const v of videos) {
    const poster = v.getAttribute('poster');
    if (!poster) continue;
    try {
      out.push({ poster: new URL(poster, location.href).toString() });
    } catch {
      /* skip malformed poster URLs */
    }
  }
  return out;
}

function extractCard(article: HTMLElement, excludeIn?: HTMLElement | null): PostCard | undefined {
  const wrapper = article.querySelector('[data-testid="card.wrapper"]');
  if (!wrapper) return undefined;
  if (excludeIn && excludeIn.contains(wrapper)) return undefined;
  const anchor = wrapper.querySelector('a[href]') as HTMLAnchorElement | null;
  if (!anchor) return undefined;
  const url = anchor.getAttribute('href');
  if (!url) return undefined;

  const title = (anchor.textContent ?? '').trim() || undefined;
  /* aria-label format: "<domain> <title>". Title may match anchor text. */
  const aria = (anchor.getAttribute('aria-label') ?? '').trim();
  let domain: string | undefined;
  if (title && aria.endsWith(title)) {
    domain = aria.slice(0, aria.length - title.length).trim() || undefined;
  } else if (aria) {
    domain = aria.split(/\s+/)[0];
  }

  let image: string | undefined;
  const imgEl = wrapper.querySelector('img');
  const imgSrc = imgEl?.getAttribute('src');
  if (imgSrc) {
    try {
      const u = new URL(imgSrc, location.href);
      if (u.searchParams.has('name')) u.searchParams.set('name', 'large');
      image = u.toString();
    } catch {
      /* ignore malformed src */
    }
  }

  return {
    url,
    ...(title ? { title } : {}),
    ...(domain ? { domain } : {}),
    ...(image ? { image } : {}),
  };
}

function extractText(article: HTMLElement, excludeIn?: HTMLElement | null): string | null {
  const nodes = Array.from(article.querySelectorAll('[data-testid="tweetText"]'));
  for (const node of nodes) {
    if (excludeIn && excludeIn.contains(node)) continue;
    return readTextPreservingLineBreaks(node);
  }
  return null;
}

function readTextPreservingLineBreaks(root: Node): string {
  const parts: Array<string> = [];
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) { parts.push(n.textContent ?? ''); return; }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const el = n as HTMLElement;
    if (el.tagName === 'BR') { parts.push('\n'); return; }
    if (el.tagName === 'IMG') {
      const alt = el.getAttribute('alt');
      if (alt) parts.push(alt);
      return;
    }
    for (const child of Array.from(el.childNodes)) walk(child);
  };
  walk(root);
  return parts.join('').replace(/ /g, ' ').trim();
}

function extractAuthor(article: HTMLElement): { handle: string; name: string } | null {
  const userBlock = article.querySelector('[data-testid="User-Name"]');
  if (!userBlock) return null;
  const links = Array.from(userBlock.querySelectorAll('a[href^="/"]')) as Array<HTMLAnchorElement>;
  let handle = '';
  let name = '';
  for (const a of links) {
    const href = a.getAttribute('href') ?? '';
    const m = href.match(/^\/([A-Za-z0-9_]+)(?:$|\/)/);
    if (!m) continue;
    if (handle === '') handle = m[1] ?? '';
    const t = (a.textContent ?? '').trim();
    if (name === '' && t && !t.startsWith('@')) name = t;
  }
  if (!handle) return null;
  if (!name) name = handle;
  return { handle, name };
}

function extractTimestamp(article: HTMLElement): string | null {
  const time = article.querySelector('time[datetime]');
  if (!time) return null;
  const dt = time.getAttribute('datetime');
  if (!dt) return null;
  const d = new Date(dt);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function extractCanonicalUrl(article: HTMLElement): string | null {
  const time = article.querySelector('time[datetime]');
  const anchor = time?.closest('a[role="link"]') as HTMLAnchorElement | null;
  let href = anchor?.getAttribute('href') ?? null;
  if (!href) {
    const link = article.querySelector('a[role="link"][href*="/status/"]') as HTMLAnchorElement | null;
    href = link?.getAttribute('href') ?? null;
  }
  if (!href) return null;
  if (!/\/status\/\d+/.test(href)) return null;
  /* Strip protocol+host normalization: store host+path only (e.g. "x.com/handle/status/123").
   * Renderers prepend `https://` when building hrefs. Saves ~14 URL chars per share. */
  if (href.startsWith('/')) return `x.com${href}`;
  return href.replace(/^https?:\/\//, '').replace(/^twitter\.com/, 'x.com');
}

function extractMetrics(article: HTMLElement): Metrics | undefined {
  const m: Metrics = {};
  const likes = countFromButton(article, ['like', 'unlike']);
  const reposts = countFromButton(article, ['retweet', 'unretweet']);
  const bookmarks = countFromButton(article, ['bookmark', 'removeBookmark']);
  const views = countFromAnalytics(article);
  if (likes != null) m.likes = likes;
  if (reposts != null) m.reposts = reposts;
  if (bookmarks != null) m.bookmarks = bookmarks;
  if (views != null) m.views = views;
  return Object.keys(m).length > 0 ? m : undefined;
}

function countFromButton(article: HTMLElement, testIds: Array<string>): number | null {
  for (const id of testIds) {
    const el = article.querySelector(`[data-testid="${id}"]`);
    if (!el) continue;
    const txt = el.querySelector('[data-testid="app-text-transition-container"]');
    const raw = (txt?.textContent ?? el.getAttribute('aria-label') ?? '').trim();
    const n = parseCount(raw);
    if (n != null) return n;
    return 0;
  }
  return null;
}

function countFromAnalytics(article: HTMLElement): number | null {
  const link = article.querySelector('a[href*="/analytics"]');
  if (!link) return null;
  const txt = link.querySelector('[data-testid="app-text-transition-container"]');
  const raw = (txt?.textContent ?? link.getAttribute('aria-label') ?? '').trim();
  const n = parseCount(raw);
  return n ?? 0;
}

function extractImages(article: HTMLElement, excludeIn?: HTMLElement | null): Array<string> {
  const imgs = Array.from(article.querySelectorAll('[data-testid="tweetPhoto"] img')) as Array<HTMLImageElement>;
  const urls: Array<string> = [];
  for (const img of imgs) {
    if (excludeIn && excludeIn.contains(img)) continue;
    const src = img.getAttribute('src');
    if (!src) continue;
    const url = new URL(src, location.href);
    if (url.searchParams.has('name')) url.searchParams.set('name', 'large');
    urls.push(url.toString());
  }
  return urls;
}

function extractVideos(article: HTMLElement, excludeIn?: HTMLElement | null): Array<Video> {
  const videos = Array.from(article.querySelectorAll('video')) as Array<HTMLVideoElement>;
  const out: Array<Video> = [];
  for (const v of videos) {
    if (excludeIn && excludeIn.contains(v)) continue;
    const poster = v.getAttribute('poster');
    if (!poster) continue;
    try {
      out.push({ poster: new URL(poster, location.href).toString() });
    } catch {
      /* skip malformed poster URLs */
    }
  }
  return out;
}

/**
 * Find the rendered tweet whose permalink ends in `/status/<id>`. Used by the
 * native-share interceptor to locate the post X is about to share.
 */
export function findArticleByStatusId(id: string): HTMLElement | null {
  const root = document.querySelector('[data-testid="primaryColumn"]') ?? document;
  const articles = Array.from(root.querySelectorAll('article[data-testid="tweet"]')) as Array<HTMLElement>;
  for (const a of articles) {
    const time = a.querySelector('time[datetime]');
    const href = (time?.closest('a') as HTMLAnchorElement | null)?.getAttribute('href') ?? '';
    if (href.endsWith('/status/' + id)) return a;
  }
  return null;
}

/**
 * On a tweet permalink page, returns the focal article (the one whose status id
 * matches the URL). On other pages, returns the topmost tweet currently in viewport.
 */
export function findTargetArticle(): HTMLElement | null {
  const root = document.querySelector('[data-testid="primaryColumn"]') ?? document;
  const articles = Array.from(root.querySelectorAll('article[data-testid="tweet"]')) as Array<HTMLElement>;
  if (articles.length === 0) return null;

  const m = location.pathname.match(/\/status\/(\d+)/);
  if (m) {
    const id = m[1];
    for (const a of articles) {
      const time = a.querySelector('time[datetime]');
      const href = (time?.closest('a') as HTMLAnchorElement | null)?.getAttribute('href') ?? '';
      if (href.endsWith('/status/' + id)) return a;
    }
    return articles[0] ?? null;
  }

  for (const a of articles) {
    const r = a.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight) return a;
  }
  return articles[0] ?? null;
}
