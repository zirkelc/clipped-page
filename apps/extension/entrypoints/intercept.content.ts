import { defineContentScript } from 'wxt/utils/define-content-script';
import { buildShareFields } from '@clipped-page/shared/share-fields';
import { extractTweetFromArticle, findArticleByStatusId } from '../lib/extract.js';

/**
 * Runs in the page's MAIN world so it can patch the real `navigator.share`
 * that X's app calls (a default ISOLATED content script gets its own
 * `navigator` and would never see the page's calls).
 *
 * When X invokes the native share for a post, we rewrite the payload to
 * "direct" share: keep the original x.com URL but set a useful title
 * (`@handle Name`) and text (the post body). This must stay synchronous —
 * `navigator.share` needs transient user activation, so we can't await the
 * gzip-based clipped.page encoder here; we only enhance title/text.
 */
export default defineContentScript({
  matches: ['https://x.com/*', 'https://twitter.com/*'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    patchNativeShare();
  },
});

function patchNativeShare(): void {
  const proto = Navigator.prototype;
  const original = proto.share;
  if (typeof original !== 'function') return;

  Object.defineProperty(proto, 'share', {
    configurable: true,
    writable: true,
    value: function (this: Navigator, data?: ShareData): Promise<void> {
      let payload = data;
      try {
        payload = rewrite(data) ?? data;
      } catch {
        /* Never let our rewrite break X's own share. */
        payload = data;
      }
      return original.call(this, payload);
    },
  });
}

function rewrite(data?: ShareData): ShareData | null {
  if (!data) return null;

  const id = statusId(data.url) ?? statusId(data.text);
  if (!id) return null;

  const article = findArticleByStatusId(id);
  if (!article) return null;

  const extracted = extractTweetFromArticle(article);
  if (!extracted) return null;

  const { title, text } = buildShareFields(extracted.payload);
  /* Direct share: keep the original tweet URL, just enrich title + text. */
  const url = data.url ?? `https://${extracted.src}`;
  return { ...data, title, text, url };
}

function statusId(s?: string): string | null {
  if (typeof s !== 'string') return null;
  const m = s.match(/status\/(\d+)/);
  return m ? m[1]! : null;
}
