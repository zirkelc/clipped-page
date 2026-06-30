import type { ReactElement } from 'react';
import { Hono } from 'hono';
import { renderToString } from 'react-dom/server';
import { parseShareUrl, toMarkdown, SHARE_URL_VERSION } from '@clipped-page/shared';
import { Card, ErrorPage, Landing } from './Card.js';
import { Layout, PlainLayout, buildMeta } from './Layout.js';
import { track } from './analytics.js';

type Bindings = {
  ASSETS: Fetcher;
  ANALYTICS?: AnalyticsEngineDataset;
  CF_BEACON_TOKEN?: string;
};

type Format = 'html' | 'md' | 'json';

function negotiate(req: Request, url: URL): Format {
  /* `f` short alias matches the rest of the wire vocabulary (s, d, v); `format` kept for readability. */
  const explicit = url.searchParams.get('f') ?? url.searchParams.get('format');
  if (explicit === 'md' || explicit === 'json' || explicit === 'html') return explicit;

  const accept = (req.headers.get('accept') ?? '').toLowerCase();
  if (accept.includes('text/markdown') || accept.includes('text/plain')) return 'md';
  if (accept.includes('application/json')) return 'json';
  return 'html';
}

function htmlResponse(node: ReactElement, status = 200): { response: Response; bytes: number } {
  const html = '<!doctype html>' + renderToString(node);
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
  const beaconToken = c.env.CF_BEACON_TOKEN || undefined;

  if (!url.searchParams.has('d')) {
    if (format === 'html') {
      const { response, bytes } = htmlResponse(
        <PlainLayout title="clipped.page" beaconToken={beaconToken}><Landing /></PlainLayout>,
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
        <PlainLayout title="clipped.page · error" beaconToken={beaconToken}><ErrorPage message={parsed.error} /></PlainLayout>,
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

  if (format === 'md') {
    const body = toMarkdown(payload, src);
    track(ae, { version: SHARE_URL_VERSION, format: 'md', status: 200, sourceHost, request: c.req.raw, responseBytes: body.length });
    return new Response(body, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
  }
  if (format === 'json') {
    const body = JSON.stringify({ src, payload }, null, 2);
    track(ae, { version: SHARE_URL_VERSION, format: 'json', status: 200, sourceHost, request: c.req.raw, responseBytes: body.length });
    return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  }

  const meta = buildMeta(payload, src);
  const { response, bytes } = htmlResponse(
    <Layout meta={meta} beaconToken={beaconToken}><Card payload={payload} src={src} currentUrl={c.req.url} /></Layout>,
  );
  track(ae, { version: SHARE_URL_VERSION, format: 'html', status: 200, sourceHost, request: c.req.raw, responseBytes: bytes });
  return response;
});

app.get('/health', (c) => c.text('ok'));

export default app;
