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
  alternates?: { md: string; json: string };
  children: ReactNode;
};

export function Layout({ meta, alternates, children }: LayoutProps) {
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
        {alternates && (
          <>
            <link rel="alternate" type="text/markdown" href={alternates.md} />
            <link rel="alternate" type="application/json" href={alternates.json} />
          </>
        )}
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
const flash=(b,t)=>{if(b.dataset.orig===undefined)b.dataset.orig=b.textContent;if(b._t)clearTimeout(b._t);b.textContent=t;b._t=setTimeout(()=>{b.textContent=b.dataset.orig;b._t=0},1500)};
const copy=async(b,text)=>{try{await navigator.clipboard.writeText(text);flash(b,'✓')}catch{flash(b,'⚠')}};
const copyUrl=document.getElementById('clipped-copy-url');
if(copyUrl)copyUrl.addEventListener('click',()=>copy(copyUrl,location.href));
const copyMd=document.getElementById('clipped-copy-md');
if(copyMd)copyMd.addEventListener('click',async()=>{
  try{const u=new URL(location.href);u.searchParams.set('f','md');const r=await fetch(u);if(!r.ok)throw 0;await copy(copyMd,await r.text());}
  catch{flash(copyMd,'⚠')}
});
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
