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
    if ((message as { kind?: string }).kind !== 'open-clipped') return;

    const { data } = message as { data: ExtractedTweet };
    buildAndOpen(data)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: errMsg(e) }));
    return true;
  });
});

async function buildAndOpen(extracted: ExtractedTweet): Promise<void> {
  const url = await buildShareUrl({
    baseUrl: DEFAULT_BASE_URL,
    src: extracted.src,
    payload: extracted.payload,
  });
  await chrome.tabs.create({ url, active: true });
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
