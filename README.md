# clipped.page

Clip an X (Twitter) post into a single self-contained URL. The whole post (author, text, images, video thumbnails, metrics, and any quoted post) is packed into the link's query string, so anyone who opens it gets the post back without an X account, the X API, or any server-side storage.

**The URL is the post.** There is no database, no auth, and nothing is saved anywhere. Decode the link and you have the original content.

## Why it exists

X posts are increasingly hard to read without logging in, and they rot: accounts go private, posts get deleted, the API is paywalled, and link unfurlers can no longer fetch them. A regular `x.com/.../status/123` link is just a pointer to content you may not be able to reach.

clipped.page inverts that. Instead of pointing at the post, the link *carries* the post. That makes it:

- **Durable.** The content survives even if the original is deleted or the account goes private. It lives in the URL.
- **Readable by anything.** Humans get a clean card. AIs and scripts can ask for JSON or Markdown. Link unfurlers (Slack, Discord, iMessage) get an Open Graph preview.
- **Stateless.** Nothing to host, nothing to leak, nothing to take down. The renderer is a stateless function: URL in, rendered post out.

## How it works

```
  Chrome extension                      clipped.page (Cloudflare Worker)
 ┌──────────────────┐                  ┌──────────────────────────────┐
 │ ✂️ on each post   │                  │  parse URL → validate         │
 │  → scrape DOM     │   the link is    │  → render by content type:    │
 │  → build Payload  │   the transport  │     • HTML card (browsers)    │
 │  → gzip + base64  │ ───────────────► │     • JSON   (scripts)  │
 │  → open URL       │                  │     • Markdown (AIs)         │
 └──────────────────┘                  │     • OG meta (unfurlers)     │
                                        └──────────────────────────────┘
```

1. The **Chrome extension** injects a `✂️` button next to every post on `x.com` / `twitter.com`. Clicking it scrapes the post out of the DOM into a typed `Payload`.
2. The payload is serialized, gzipped, and base64url-encoded into the `d` query parameter. The extension opens the resulting `clipped.page` URL in a new tab.
3. The **Cloudflare Worker** at `clipped.page` parses the URL, validates the payload against the schema, and renders it. What you get back depends on how you ask (see [Content negotiation](#content-negotiation)).

Because step 3 is pure decoding, the worker never needs to talk to X. Every clipped link is fully self-describing.

## URL format

```
https://clipped.page/?v=1&s=<source>&d=<data>
```

| Param | Meaning                                                                                  |
|-------|------------------------------------------------------------------------------------------|
| `v`   | Schema version (currently `1`). Absent is treated as current; an unknown value is rejected with a clear error. |
| `s`   | The canonical source post as `host+path`, e.g. `x.com/theo/status/123`. Stored without the scheme to save bytes. |
| `d`   | The post itself: `base64url(gzip(utf8(JSON(Payload))))`.                                  |

### The `d` pipeline

The data parameter is built (and decoded in reverse) by a Zod codec pipeline:

```
Payload  ──JSON──►  string  ──utf8──►  bytes  ──gzip──►  bytes  ──base64url──►  d param
```

gzip is what makes a whole post (often with a quoted post inside it) fit in a URL. base64url keeps it URL-safe.

### Payload schema

Validated with Zod ([`packages/shared/src/payload.ts`](packages/shared/src/payload.ts)):

```ts
Payload = {
  posts: Array<Post>,   // 1..20 (threads / parent posts on permalink pages)
  focal: number,        // index of the post the link is "about"
  truncated?: boolean,  // true if a longer thread was clipped short
}

Post = {
  author: { handle, name },
  text: string,                     // may be empty for a bare quote-tweet
  timestamp: ISO 8601,
  images?: Array<URL>,              // pbs.twimg.com URLs, normalised to name=large
  videos?: Array<{ poster: URL }>,  // thumbnails only (see below)
  metrics?: { likes?, reposts?, views?, bookmarks? },
  card?: { url, title?, domain?, image? },   // link-preview card
  quote?: {                          // an embedded quoted post
    url?: string,                    // host+path; optional (text-only quotes have no static URL)
    author, text, timestamp,
    images?, videos?,
  },
}
```

**Videos store only the poster (thumbnail).** X serves video as auth-gated, ephemeral HLS streams that can't be embedded statically. The card shows the thumbnail with a `▶` overlay that links back to the post on x.com to actually play it. GIFs use the same shape (X stores them as silent `<video>` elements).

**Schema changes must stay backward compatible.** Links already shared in the wild must keep decoding, so new fields are added as optional and existing fields are never renamed.

## Content negotiation

The same URL renders differently depending on how it's requested. Precedence: `?f=` query, then `?format=`, then the `Accept` header.

| `Accept` / `?f=`              | Response               | For                     |
|-------------------------------|------------------------|-------------------------|
| `text/html`.                  | HTML                   | Humans, browsers        |
| `application/json`, `?f=json` | JSON                   | AIs, scripts, agents    |
| `text/markdown`, `?f=md`      | Markdown               | LLMs, note-taking       |
| `text/plain`                  | Markdown               | Terminals, plain fetch  |

HTML responses also embed Open Graph / Twitter Card meta tags, so pasting a clipped link into Slack, Discord, or iMessage produces a rich preview.

## Development

```sh
pnpm install
pnpm -F @clipped-page/shared test       # 28 tests
```

### Run the web renderer locally

```sh
pnpm -F @clipped-page/web dev           # worker on http://localhost:8787 (also watches Tailwind)
```

This runs the Cloudflare Worker locally with Wrangler. It does not deploy anything. Open `http://localhost:8787/` for the landing page, or paste a clipped link (swap the host for `localhost:8787`) to render a post.

### Build the extension

The extension's target URL is baked in at build time ([`apps/extension/lib/settings.ts`](apps/extension/lib/settings.ts)):

```sh
# Dev build — ✂️ buttons point at http://localhost:8787 (use with the worker above)
pnpm -F @clipped-page/extension dev

# Prod build — ✂️ buttons point at https://clipped.page
pnpm -F @clipped-page/extension build
```

Either command writes the unpacked extension to `apps/extension/.output/chrome-mv3/`. `dev` also rebuilds on file changes.

### Load the unpacked extension in Chrome

Same steps for a dev or prod build (the only difference is which URL the buttons open):

1. Go to `chrome://extensions`.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select `apps/extension/.output/chrome-mv3/`.
4. Open `x.com`, and the `✂️` button appears next to each post.

After a rebuild, click the **reload** (↻) icon on the extension card in `chrome://extensions` to pick up the new build. For end-to-end dev, run the worker and the dev extension build together so the buttons open your local renderer.

## Layout

```
apps/
  web/             Cloudflare Worker (Hono + React SSR)
    src/
      worker.tsx   Routing + content negotiation (HTML / JSON / Markdown)
      Card.tsx     The rendered post card, Landing page, ErrorPage
      Layout.tsx   <head>, Open Graph / Twitter meta, favicon
      analytics.ts Cloudflare Analytics Engine writes
    wrangler.toml  Worker name, custom-domain routes, analytics dataset

  extension/       Chrome extension (MV3, built with WXT)
    entrypoints/
      background.ts          Toolbar icon opens clipped.page; builds + opens clipped URLs
      content.ts             Injects ✂️ next to each post
    lib/
      extract.ts             X DOM → Payload (text, media, card, quote, thread walking)
      settings.ts            DEFAULT_BASE_URL (localhost in dev, clipped.page in prod)

packages/
  shared/          Framework-agnostic core, shared by web + extension
    src/
      payload.ts   Zod schemas (Author, Metrics, Card, Video, Quote, Post, Payload)
      codec.ts     base64url(gzip(utf8(JSON))) round-trip via a Zod codec pipeline
      url.ts       buildShareUrl / parseShareUrl, SHARE_URL_VERSION
      share.ts     title/text formatting for the card's share button
      format.ts    toMarkdown
      count.ts     Parse / format X's human counts ("1.1K" ↔ 1100)
```

Zod is kept out of the extension's content-world bundle for size; the shared package exposes lighter subpath entries for the bits the content script needs.

## Non-goals

- **No database.** The promise is "the URL is the post." If a payload doesn't fit, compress harder or shorten before adding state.
- **No X API.** Everything is scraped from the DOM you're already looking at.
- **No tracking of who clips what.** Analytics are anonymous request counts only.
