import type { ReactElement } from 'react';
import { Hono } from 'hono';
import { renderToString } from 'react-dom/server';
import { parseShareUrl, toMarkdown, SHARE_URL_VERSION } from '@clipped-page/shared';
import { Card, ErrorPage, Landing, PrivacyPolicy } from './Card.js';
import { Layout, PlainLayout, buildMeta } from './Layout.js';
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

app.get('/privacy', () => {
  const { response } = htmlResponse(
    <PlainLayout title="clipped.page · privacy" description={PRIVACY_DESCRIPTION} path="/privacy"><PrivacyPolicy /></PlainLayout>,
  );
  return response;
});

app.get('/health', (c) => c.text('ok'));

export default app;
