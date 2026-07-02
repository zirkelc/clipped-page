import { defineBackground } from 'wxt/utils/define-background';
import { buildShareUrl } from '@clipped-page/shared';
import type { ExtractedTweet } from '../lib/extract.js';
import { DEFAULT_BASE_URL } from '../lib/settings.js';

export default defineBackground(() => {
  /* Clicking the toolbar icon opens the brand site. Clipping happens via the
   * ✂️ button injected next to each post by the content script. */
  chrome.action.onClicked.addListener(() => {
    void chrome.tabs.create({ url: DEFAULT_BASE_URL, active: true });
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== 'object') return;
    if ((message as { kind?: string }).kind !== 'clip') return;

    const { data, open } = message as { data: ExtractedTweet; open?: boolean };
    buildClip(data, open ?? true)
      .then((url) => sendResponse({ ok: true, url }))
      .catch((e) => sendResponse({ ok: false, error: errMsg(e) }));
    return true;
  });
});

/** Builds the clipped URL and, when `open` is set, opens it in a new tab.
 * Returns the URL so the caller can also copy it to the clipboard. */
async function buildClip(extracted: ExtractedTweet, open: boolean): Promise<string> {
  const url = await buildShareUrl({
    baseUrl: DEFAULT_BASE_URL,
    src: extracted.src,
    payload: extracted.payload,
  });
  if (open) await chrome.tabs.create({ url, active: true });
  return url;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
