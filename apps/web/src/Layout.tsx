import type { ReactNode } from 'react';
import type { Payload } from '@clipped-page/shared';

type Meta = {
  title: string;
  description: string;
  url: string;
  image?: string;
  siteName?: string;
  creator?: string;
  publishedTime?: string;
};

export function buildMeta(payload: Payload, src: string): Meta {
  const srcUrl = src.startsWith('http') ? src : `https://${src}`;
  const focal = payload.posts[payload.focal] ?? payload.posts[0]!;
  const threadSuffix = payload.posts.length > 1 ? ` · thread (${payload.posts.length})` : '';
  const title = `${focal.author.name} (@${focal.author.handle})${threadSuffix}`;
  const description = focal.text.length > 200 ? focal.text.slice(0, 197) + '...' : focal.text;
  const image = focal.images?.[0];
  let siteName = 'clipped.page';
  try { siteName = new URL(srcUrl).hostname; } catch {}
  const creator = `@${focal.author.handle}`;
  const publishedTime = focal.timestamp;
  return { title, description, url: srcUrl, image, siteName, creator, publishedTime };
}

type LayoutProps = {
  meta: Meta;
  children: ReactNode;
};

export function Layout({ meta, children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:url" content={meta.url} />
        {meta.image && <meta property="og:image" content={meta.image} />}
        {meta.siteName && <meta property="og:site_name" content={meta.siteName} />}
        {meta.publishedTime && <meta property="article:published_time" content={meta.publishedTime} />}
        <meta name="twitter:card" content={meta.image ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        {meta.image && <meta name="twitter:image" content={meta.image} />}
        {meta.creator && <meta name="twitter:creator" content={meta.creator} />}
        <link rel="canonical" href={meta.url} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: shareScript }} />
      </body>
    </html>
  );
}

const shareScript = `(()=>{
const flash=(b,t,ms=1500)=>{const o=b.textContent;b.textContent=t;if(ms)setTimeout(()=>{b.textContent=o},ms)};
const copy=document.getElementById('clipped-copy');
if(copy)copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);flash(copy,'✓ copied')}catch{flash(copy,'⚠ failed')}});
const share=document.getElementById('clipped-share');
if(share)share.addEventListener('click',async()=>{
  const url=location.href;
  const title=share.getAttribute('data-share-title')||'';
  const text=share.getAttribute('data-share-text')||'';
  if(typeof navigator.share==='function'){
    try{await navigator.share({url,title,text});return flash(share,'↗ shared')}
    catch(e){if(e&&e.name==='AbortError')return;}
  }
  try{await navigator.clipboard.writeText(url);flash(share,'✓ copied')}catch{flash(share,'⚠ failed')}
});
})();`;

export function PlainLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
