import type { ReactElement } from 'react';
import { Hono } from 'hono';
import { renderToString } from 'react-dom/server';
import { parseShareUrl, toMarkdown, SHARE_URL_VERSION } from '@clipped-page/shared';
import { Card, ErrorPage, Landing, PrivacyPolicy, LegalNotice } from './Card.js';
import { Layout, PlainLayout, buildMeta, SITE_URL } from './Layout.js';
import { renderOgImage } from './og.js';
import { track } from './analytics.js';

type Bindings = {
  ASSETS: Fetcher;
  ANALYTICS?: AnalyticsEngineDataset;
};

type Format = 'html' | 'md' | 'json';

const LANDING_DESCRIPTION =
  'Clip any X post into a self-contained URL. The whole post lives in the link, so anyone can read it with no account, no server, and no app.';
const PRIVACY_DESCRIPTION =
  'clipped.page privacy policy. No accounts, no tracking, no data collection. Post data lives in the URL, never on a server.';
const LEGAL_DESCRIPTION = 'Legal notice (Impressum) for clipped.page pursuant to § 5 DDG.';

function negotiate(req: Request, url: URL): Format {
  /* `f` short alias matches the rest of the wire vocabulary (s, d, v); `format` kept for readability. */
  const explicit = url.searchParams.get('f') ?? url.searchParams.get('format');
  if (explicit === 'md' || explicit === 'json' || explicit === 'html') return explicit;

  const accept = (req.headers.get('accept') ?? '').toLowerCase();
  if (accept.includes('text/markdown') || accept.includes('text/plain')) return 'md';
  if (accept.includes('application/json')) return 'json';
  return 'html';
}

/** `Link` header advertising the same URL's Markdown and JSON representations. */
function alternatesLink(url: URL): string {
  const link = (f: string, type: string) => {
    const u = new URL(url);
    u.searchParams.set('f', f);
    return `<${u.pathname}${u.search}>; rel="alternate"; type="${type}"`;
  };
  return `${link('md', 'text/markdown')}, ${link('json', 'application/json')}`;
}

/** Advertises the alternate representations to agents reading the raw HTML. */
const FORMAT_HINT =
  '<!-- clipped.page also serves this URL as Markdown (?f=md or Accept: text/markdown) and JSON (?f=json or Accept: application/json). -->';

function htmlResponse(node: ReactElement, status = 200): { response: Response; bytes: number } {
  const html = '<!doctype html>\n' + FORMAT_HINT + '\n' + renderToString(node);
  return {
    response: new Response(html, {
      status,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }),
    bytes: html.length,
  };
}

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', async (c) => {
  const url = new URL(c.req.url);
  const format = negotiate(c.req.raw, url);
  const ae = c.env.ANALYTICS;

  if (!url.searchParams.has('d')) {
    if (format === 'html') {
      const { response, bytes } = htmlResponse(
        <PlainLayout title="clipped.page" description={LANDING_DESCRIPTION} path="/"><Landing /></PlainLayout>,
      );
      track(ae, { version: SHARE_URL_VERSION, format: 'landing', status: 200, request: c.req.raw, responseBytes: bytes });
      return response;
    }
    const body = 'missing s or d query parameter\n';
    track(ae, { version: SHARE_URL_VERSION, format: 'error', status: 400, request: c.req.raw, responseBytes: body.length });
    return new Response(body, { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  const parsed = await parseShareUrl(url);
  if (!parsed.ok) {
    if (format === 'html') {
      const { response, bytes } = htmlResponse(
        <PlainLayout title="clipped.page · error" noindex><ErrorPage message={parsed.error} /></PlainLayout>,
        400,
      );
      track(ae, { version: SHARE_URL_VERSION, format: 'error', status: 400, request: c.req.raw, responseBytes: bytes });
      return response;
    }
    const body = parsed.error + '\n';
    track(ae, { version: SHARE_URL_VERSION, format: 'error', status: 400, request: c.req.raw, responseBytes: body.length });
    return new Response(body, { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  const { src, payload } = parsed;
  let sourceHost = '';
  try { sourceHost = new URL(src.startsWith('http') ? src : `https://${src}`).hostname; } catch { /* ignore */ }

  const link = alternatesLink(url);
  if (format === 'md') {
    const body = toMarkdown(payload, src);
    track(ae, { version: SHARE_URL_VERSION, format: 'md', status: 200, sourceHost, request: c.req.raw, responseBytes: body.length });
    return new Response(body, { headers: { 'content-type': 'text/markdown; charset=utf-8', link } });
  }
  if (format === 'json') {
    const body = JSON.stringify({ src, payload }, null, 2);
    track(ae, { version: SHARE_URL_VERSION, format: 'json', status: 200, sourceHost, request: c.req.raw, responseBytes: body.length });
    return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', link } });
  }

  const meta = buildMeta(payload, src);
  /* Always advertise the branded, generated OG card (mirrors this clip's own
   * v/s/d params on the /og route). Pinned to the canonical origin so the
   * absolute image URL is always https and on the apex host. */
  meta.image = `${SITE_URL}/og${url.search}`;
  const alt = (f: Format) => {
    const u = new URL(c.req.url);
    u.searchParams.set('f', f);
    return u.pathname + u.search;
  };
  const { response, bytes } = htmlResponse(
    <Layout meta={meta} alternates={{ md: alt('md'), json: alt('json') }}>
      <Card payload={payload} src={src} currentUrl={c.req.url} />
    </Layout>,
  );
  response.headers.set('link', link);
  track(ae, { version: SHARE_URL_VERSION, format: 'html', status: 200, sourceHost, request: c.req.raw, responseBytes: bytes });
  return response;
});

/* Branded OG card for a clipped post. Same v/s/d params as the clip URL; the
 * result is deterministic, so it's cached forever keyed on the request URL.
 * Falls back to the static site banner if the payload is unreadable or the
 * render fails, so a shared link never unfurls with a broken image. */
app.get('/og', async (c) => {
  const url = new URL(c.req.url);
  const fallback = `${SITE_URL}/og.png`;
  /* `caches.default` is a Workers extension not present on the DOM CacheStorage type. */
  const cache = (caches as unknown as { default: Cache }).default;

  const cached = await cache.match(c.req.raw);
  if (cached) return cached;

  const parsed = await parseShareUrl(url);
  if (!parsed.ok) return Response.redirect(fallback, 302);

  try {
    const body = await renderOgImage(parsed.payload, parsed.src).arrayBuffer();
    const response = new Response(body, {
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
    c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
    return response;
  } catch (e) {
    console.error('og render failed:', e);
    return Response.redirect(fallback, 302);
  }
});

app.get('/privacy', () => {
  const { response } = htmlResponse(
    <PlainLayout title="clipped.page · privacy" description={PRIVACY_DESCRIPTION} path="/privacy"><PrivacyPolicy /></PlainLayout>,
  );
  return response;
});

app.get('/legal', () => {
  /* noindex so the operator's postal address stays out of search results;
   * social/link-preview bots ignore this and unfurl normally. */
  const { response } = htmlResponse(
    <PlainLayout title="clipped.page · Legal notice" description={LEGAL_DESCRIPTION} path="/legal" noindex><LegalNotice /></PlainLayout>,
  );
  return response;
});

/* The German term is what people (and German visitors) may type; keep it as a
 * permanent alias for the canonical /legal page. */
app.get('/impressum', (c) => c.redirect('/legal', 301));

app.get('/health', (c) => c.text('ok'));

export default app;
