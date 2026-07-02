import type { ReactNode } from 'react';
import { buildShareFields, formatCount, type Payload, type Post, type Video } from '@clipped-page/shared';

/**
 * The brand mark: an open pair of scissors (clip = cut out).
 * Inherits the current text color so it themes with light/dark backgrounds.
 */
function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9" cy="23" r="3.5" />
      <circle cx="23" cy="23" r="3.5" />
      <path d="M20.5 20.5 L18.3 18.3" />
      <path d="M13.7 13.7 L5 5" />
      <path d="M11.5 20.5 L27 5" />
    </svg>
  );
}

type Props = {
  payload: Payload;
  src: string;
  currentUrl: string;
};

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  } catch {
    return iso;
  }
}

function VideoGrid({
  videos,
  href,
  maxH,
}: {
  videos: Array<Video>;
  href?: string;
  maxH: 'max-h-64' | 'max-h-48';
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {videos.map((v, idx) => {
        const inner = (
          <div className="relative inline-block">
            <img
              src={v.poster}
              alt=""
              loading="lazy"
              className={`${maxH} max-w-full`}
              style={{ border: '1px solid currentColor' }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                aria-hidden="true"
                className="text-2xl leading-none px-3 py-1"
                style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: '9999px' }}
              >
                ▶
              </span>
            </div>
          </div>
        );
        return href ? (
          <a key={idx} href={href} target="_blank" rel="noreferrer noopener" className="block">
            {inner}
          </a>
        ) : (
          <span key={idx} className="block">{inner}</span>
        );
      })}
    </div>
  );
}

function PostBlock({ post, isFocal, postUrl }: { post: Post; isFocal: boolean; postUrl?: string }) {
  const borderStyle = isFocal ? '4px double currentColor' : '1px dashed currentColor';
  const opacity = isFocal ? 'opacity-100' : 'opacity-80';
  return (
    <article
      className={`p-5 sm:p-6 leading-relaxed ${opacity}`}
      style={{ border: borderStyle }}
    >
      <header className="flex items-baseline gap-2 mb-3 text-sm">
        {isFocal && <span aria-hidden="true">→</span>}
        <span className="font-semibold">{post.author.name}</span>
        <span className="opacity-60">·</span>
        <span className="opacity-80">@{post.author.handle}</span>
      </header>

      <pre className="whitespace-pre-wrap break-words font-mono text-base m-0 p-0 bg-transparent">
{post.text}
      </pre>

      {post.images && post.images.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {post.images.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer noopener" className="block">
              <img
                src={url}
                alt=""
                loading="lazy"
                className="max-h-64 max-w-full"
                style={{ border: '1px solid currentColor' }}
              />
            </a>
          ))}
        </div>
      )}

      {post.videos && post.videos.length > 0 && (
        <VideoGrid videos={post.videos} href={postUrl} maxH="max-h-64" />
      )}

      {post.card && (
        <a
          href={post.card.url}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 flex gap-3 p-3 no-underline opacity-90 hover:opacity-100"
          style={{ border: '1px dashed currentColor' }}
        >
          {post.card.image && (
            <img
              src={post.card.image}
              alt=""
              loading="lazy"
              className="w-20 h-20 object-cover shrink-0"
              style={{ border: '1px solid currentColor' }}
            />
          )}
          <div className="flex flex-col justify-center min-w-0">
            {post.card.domain && <div className="text-xs opacity-60 truncate">{post.card.domain}</div>}
            {post.card.title && <div className="font-semibold truncate">{post.card.title}</div>}
            <div className="text-xs opacity-60 truncate">{post.card.url}</div>
          </div>
        </a>
      )}

      {post.quote && (
        <blockquote
          className="mt-4 p-4 leading-relaxed opacity-90 m-0"
          style={{ border: '1px dashed currentColor' }}
        >
          <header className="flex items-baseline gap-2 mb-2 text-sm">
            <span className="font-semibold">{post.quote.author.name}</span>
            <span className="opacity-60">·</span>
            <span className="opacity-80">@{post.quote.author.handle}</span>
          </header>
          {post.quote.text && (
            <pre className="whitespace-pre-wrap break-words font-mono text-sm m-0 p-0 bg-transparent">
{post.quote.text}
            </pre>
          )}
          {post.quote.images && post.quote.images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {post.quote.images.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer noopener" className="block">
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    className="max-h-48 max-w-full"
                    style={{ border: '1px solid currentColor' }}
                  />
                </a>
              ))}
            </div>
          )}
          {post.quote.videos && post.quote.videos.length > 0 && (
            <VideoGrid
              videos={post.quote.videos}
              href={post.quote.url ? (post.quote.url.startsWith('http') ? post.quote.url : `https://${post.quote.url}`) : undefined}
              maxH="max-h-48"
            />
          )}
          <footer className="mt-3 text-xs opacity-60">
            {post.quote.url ? (
              <a
                href={post.quote.url.startsWith('http') ? post.quote.url : `https://${post.quote.url}`}
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-dotted hover:opacity-100"
              >
                <time dateTime={post.quote.timestamp}>{formatTimestamp(post.quote.timestamp)}</time>
              </a>
            ) : (
              <time dateTime={post.quote.timestamp}>{formatTimestamp(post.quote.timestamp)}</time>
            )}
          </footer>
        </blockquote>
      )}

      {post.metrics && (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80 list-none p-0 m-0">
          {post.metrics.likes != null && <li>♥ {formatCount(post.metrics.likes)} likes</li>}
          {post.metrics.reposts != null && <li>↻ {formatCount(post.metrics.reposts)} reposts</li>}
          {post.metrics.bookmarks != null && <li>☆ {formatCount(post.metrics.bookmarks)} bookmarks</li>}
          {post.metrics.views != null && <li>👁 {formatCount(post.metrics.views)} views</li>}
        </ul>
      )}

      <footer className="mt-4 text-xs opacity-70">
        <time dateTime={post.timestamp}>{formatTimestamp(post.timestamp)}</time>
      </footer>
    </article>
  );
}

export function Card({ payload, src, currentUrl }: Props) {
  const srcHref = src.startsWith('http') ? src : `https://${src}`;
  const sourceHost = (() => {
    try { return new URL(srcHref).hostname; } catch { return 'source'; }
  })();
  const multi = payload.posts.length > 1;
  const fmtHref = (f: string) => {
    try {
      const u = new URL(currentUrl);
      u.searchParams.set('f', f);
      return u.pathname + u.search;
    } catch {
      return `?f=${f}`;
    }
  };
  const { title: shareTitle, text: shareText } = buildShareFields(payload);

  return (
    <main className="min-h-screen flex items-start justify-center p-6 font-mono">
      <div className="w-full max-w-[720px] flex flex-col gap-3 my-8">
        {multi && (
          <div className="text-xs uppercase tracking-wider opacity-70 flex justify-between">
            <span>Thread · {payload.posts.length} posts{payload.truncated && ' (truncated)'}</span>
            <span>{sourceHost}</span>
          </div>
        )}

        {payload.posts.map((post, i) => (
          <PostBlock key={i} post={post} isFocal={i === payload.focal} postUrl={srcHref} />
        ))}

        <footer className="text-xs opacity-70 flex items-center gap-2 flex-wrap mt-2">
          <a href={srcHref} target="_blank" rel="noreferrer noopener" className="underline decoration-dotted hover:opacity-100">
            → {sourceHost}
          </a>
          <span>·</span>
          <button
            type="button"
            id="clipped-share"
            data-share-title={shareTitle}
            data-share-text={shareText}
            className="underline decoration-dotted cursor-pointer hover:opacity-100 bg-transparent border-0 p-0 font-mono text-xs opacity-100"
          >
            ↗ share
          </button>
          <span>·</span>
          <span className="opacity-60">view</span>
          <a href={fmtHref('md')} className="underline decoration-dotted hover:opacity-100">md</a>
          <span className="opacity-40">|</span>
          <a href={fmtHref('json')} className="underline decoration-dotted hover:opacity-100">json</a>
          <span>·</span>
          <span className="opacity-60">copy</span>
          <button
            type="button"
            id="clipped-copy-url"
            className="underline decoration-dotted cursor-pointer hover:opacity-100 bg-transparent border-0 p-0 font-mono text-xs opacity-100"
          >
            url
          </button>
          <span className="opacity-40">|</span>
          <button
            type="button"
            id="clipped-copy-md"
            className="underline decoration-dotted cursor-pointer hover:opacity-100 bg-transparent border-0 p-0 font-mono text-xs opacity-100"
          >
            md
          </button>
        </footer>
      </div>
    </main>
  );
}

/**
 * Clipped links to showcase on the landing page. Each `url` can be a relative
 * clipped link (e.g. `/?v=1&s=...&d=...`) or an absolute one. The Examples
 * section is hidden while this list is empty.
 */
const EXAMPLES: Array<{ label: string; url: string }> = [
  // { label: 'Example post', url: '/?v=1&s=x.com/...&d=...' },
];

export function Landing() {
  return (
    <main className="cursor-scissors min-h-screen flex items-center justify-center p-6 font-mono">
      <article className="w-full max-w-[720px] p-8 leading-relaxed" style={{ border: '4px double currentColor' }}>
        <header>
          <LogoMark size={40} className="mb-3" />
          <h1 className="text-2xl mb-1">clipped<span className="opacity-50">.page</span></h1>
          <p className="opacity-70 text-sm">Clip a post. Get a self-contained URL.</p>
        </header>

        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-widest opacity-60 mb-3">What</h2>
          <p className="opacity-80 text-sm">
            The post lives inside the URL — author, text, images, metrics — gzipped and
            base64url-encoded into the query string. This page decodes it and renders a
            stateless card. No database, no API, no auth. Open the link from anywhere; it
            works forever.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xs uppercase tracking-widest opacity-60 mb-3">Clip</h2>
          <p className="opacity-80 text-sm mb-3">
            The extension adds a <span aria-hidden="true">✂️</span> button to every post. One click
            scrapes the post straight from the page, then builds the payload parameter that carries it:
          </p>
          <pre className="text-xs opacity-60 overflow-x-auto m-0 mb-4 p-0 bg-transparent">
{`HTML ─scrape→ Post ─serialize→ JSON ─compress:gzip→ bytes ─encode:base64url→ string`}
          </pre>
          <p className="opacity-80 text-sm mb-3">
            The link opens straight away. Nothing touches the X API, and nothing is stored. The link is the post.
          </p>
          <p className="text-sm opacity-80">
            <span className="opacity-60">›</span>{' '}
            <a
              href="https://github.com/zirkelc/clipped-page"
              className="underline decoration-dotted hover:opacity-100"
            >
              Install the Chrome extension →
            </a>
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xs uppercase tracking-widest opacity-60 mb-3">Read</h2>
          <p className="opacity-80 text-sm mb-2">Same URL, four shapes — pick whichever your tool wants:</p>
          <ul className="list-none p-0 m-0 text-sm opacity-80 space-y-1">
            <li><span className="opacity-60">›</span> Browser → rendered page</li>
            <li>
              <span className="opacity-60">›</span> <code className="text-xs">?f=md</code> or{' '}
              <code className="text-xs">Accept: text/markdown</code> → markdown
            </li>
            <li>
              <span className="opacity-60">›</span> <code className="text-xs">?f=json</code> or{' '}
              <code className="text-xs">Accept: application/json</code> → json
            </li>
            <li>
              <span className="opacity-60">›</span> Link unfurlers (Slack, Discord, iMessage) → OpenGraph card
            </li>
          </ul>
        </section>

        {EXAMPLES.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs uppercase tracking-widest opacity-60 mb-3">Examples</h2>
            <ul className="list-none p-0 m-0 text-sm opacity-80 space-y-2">
              {EXAMPLES.map((ex) => (
                <li key={ex.url}>
                  <span className="opacity-60">›</span>{' '}
                  <a href={ex.url} className="underline decoration-dotted hover:opacity-100">{ex.label}</a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-8 pt-4 text-xs opacity-50 flex flex-wrap items-center justify-between gap-2" style={{ borderTop: '1px dashed currentColor' }}>
          <span>Made for AIs. Works for humans.</span>
          <a href="https://github.com/zirkelc/clipped-page" className="underline decoration-dotted hover:opacity-100">
            source →
          </a>
        </footer>
      </article>
    </main>
  );
}

export function ErrorPage({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 font-mono">
      <article className="w-full max-w-[720px] p-8" style={{ border: '4px double currentColor' }}>
        <h1 className="text-xl mb-2">clipped.page · error</h1>
        <p className="opacity-80">{message}</p>
      </article>
    </main>
  );
}

export function PrivacyPolicy() {
  const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <section className="mt-6">
      <h2 className="text-xs uppercase tracking-widest opacity-60 mb-2">{title}</h2>
      <div className="opacity-80 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  );
  return (
    <main className="min-h-screen flex items-start justify-center p-6 font-mono">
      <article className="w-full max-w-[720px] p-8 leading-relaxed my-8" style={{ border: '4px double currentColor' }}>
        <header>
          <h1 className="text-2xl mb-1">Privacy Policy</h1>
          <p className="opacity-60 text-sm">clipped.page browser extension · last updated July 2, 2026</p>
        </header>

        <Section title="Summary">
          <p>
            The clipped.page extension turns an X (Twitter) post into a single self-contained link.
            It reads a post only when you click its ✂ button, packs that post into the link, and then
            opens and/or copies the link. There is no account, no database, and nothing about you or the
            posts you clip is stored on any server.
          </p>
        </Section>

        <Section title="What the extension accesses">
          <p>
            When you click the ✂ button on a post, the extension reads that post's publicly visible
            content from the page you are viewing: author name and handle, text, image and video-thumbnail
            URLs, post metrics, timestamp, and any quoted post. It runs only on <code>x.com</code> and{' '}
            <code>twitter.com</code>.
          </p>
        </Section>

        <Section title="What it does with it">
          <p>
            That content is encoded directly into a <code>clipped.page</code> URL. Depending on your
            setting, the extension opens the link in a new tab, copies it to your clipboard, or both.
            The data lives inside the link itself — decoding the link reproduces the post.
          </p>
        </Section>

        <Section title="What is stored">
          <p>
            Nothing is collected or stored server-side: no database, no accounts, no logs of the posts
            you clip. The only data the extension saves is your clip-button preference (open / copy /
            copy+open), kept in your browser via <code>chrome.storage</code> and synced by your browser
            if you have extension sync enabled.
          </p>
        </Section>

        <Section title="Permissions">
          <ul className="list-none p-0 m-0 space-y-1">
            <li><span className="opacity-60">›</span> <b>activeTab</b> and host access to x.com / twitter.com — to add the ✂ button and read the post you clip.</li>
            <li><span className="opacity-60">›</span> <b>storage</b> — to remember your clip-button preference.</li>
          </ul>
        </Section>

        <Section title="Analytics and third parties">
          <p>
            The extension contains no analytics or tracking. The clipped.page website records anonymous,
            aggregate request counts (format requested, response status, coarse country, referrer host)
            with no cookies, no stored IP addresses, and no personal identifiers. Your data is never sold
            or shared, and nothing is sent to any third party beyond the clipped.page link you generate.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Source code and issues:{' '}
            <a href="https://github.com/zirkelc/clipped-page" className="underline decoration-dotted hover:opacity-100">
              github.com/zirkelc/clipped-page
            </a>
            .
          </p>
        </Section>
      </article>
    </main>
  );
}
