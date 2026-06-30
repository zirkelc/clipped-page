/**
 * Cloudflare Analytics Engine ingest helper.
 *
 * Schema (positional, fixed once recorded — adding new fields is fine,
 * reordering breaks past queries):
 *   indexes[0]  = version          (sampling key — events with the same index sample together)
 *   blobs[0]    = format           ("html" | "md" | "json" | "landing" | "error")
 *   blobs[1]    = status           (HTTP status as string)
 *   blobs[2]    = sourceHost       (hostname of `src`, e.g. "x.com"; empty for landing/error)
 *   blobs[3]    = userAgentKind    ("bot" | "browser" | "cli" | "unknown")
 *   blobs[4]    = country          (cf-ipcountry header, ISO 3166-1 alpha-2; "XX" if absent)
 *   blobs[5]    = refererHost      (Referer header's hostname; empty if missing)
 *   doubles[0]  = urlLength        (length of incoming request URL)
 *   doubles[1]  = responseBytes    (size of response body, when known)
 */

type Ae = AnalyticsEngineDataset | undefined;

type TrackArgs = {
  version: string;
  format: 'html' | 'md' | 'json' | 'landing' | 'error';
  status: number;
  sourceHost?: string;
  request: Request;
  responseBytes?: number;
};

export function track(ae: Ae, args: TrackArgs): void {
  if (!ae) return;
  const ua = args.request.headers.get('user-agent') ?? '';
  const country = args.request.headers.get('cf-ipcountry') ?? 'XX';
  let refererHost = '';
  const referer = args.request.headers.get('referer');
  if (referer) {
    try { refererHost = new URL(referer).hostname; } catch { /* ignore */ }
  }
  ae.writeDataPoint({
    indexes: [args.version],
    blobs: [
      args.format,
      String(args.status),
      args.sourceHost ?? '',
      classifyUserAgent(ua),
      country,
      refererHost,
    ],
    doubles: [args.request.url.length, args.responseBytes ?? 0],
  });
}

function classifyUserAgent(ua: string): 'bot' | 'browser' | 'cli' | 'unknown' {
  if (!ua) return 'unknown';
  const lower = ua.toLowerCase();
  if (/bot|crawl|spider|slurp|fetch|preview|unfurl|discord|slack|whatsapp|telegram|facebookexternalhit|claude|gpt|openai|anthropic/i.test(lower)) {
    return 'bot';
  }
  if (lower.startsWith('curl/') || lower.startsWith('wget/') || lower.startsWith('httpie/')) {
    return 'cli';
  }
  if (lower.includes('mozilla/') || lower.includes('webkit/') || lower.includes('chrome/') || lower.includes('safari/')) {
    return 'browser';
  }
  return 'unknown';
}
