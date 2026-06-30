import { defineContentScript } from 'wxt/utils/define-content-script';
import { extractTweetFromArticle, findTargetArticle, type ExtractedTweet } from '../lib/extract.js';

const BUTTON_MARKER = 'data-clipped-injected';

export default defineContentScript({
  matches: ['https://x.com/*', 'https://twitter.com/*'],
  runAt: 'document_idle',
  main() {
    setupMutationObserver();
    setupMessageListener();
  },
});

function setupMutationObserver(): void {
  const tryInject = () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    articles.forEach((a) => injectButton(a as HTMLElement));
  };
  tryInject();
  const obs = new MutationObserver(() => tryInject());
  obs.observe(document.body, { childList: true, subtree: true });
}

function injectButton(article: HTMLElement): void {
  if (article.getAttribute(BUTTON_MARKER) === 'true') return;
  const actionBar = article.querySelector('[role="group"]');
  if (!actionBar) return;

  const btn = makeActionButton('✂️', 'Clip on clipped.page');
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    void clip(article, btn);
  });

  actionBar.appendChild(btn);
  article.setAttribute(BUTTON_MARKER, 'true');
}

function makeActionButton(label: string, title: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = title;
  btn.setAttribute('aria-label', title);
  btn.style.cssText = [
    'all: unset',
    'cursor: pointer',
    'padding: 6px 8px',
    'margin-left: 4px',
    'border-radius: 9999px',
    'font: inherit',
    'font-size: 14px',
    'opacity: 0.6',
    'display: inline-flex',
    'align-items: center',
  ].join(';');
  btn.textContent = label;
  btn.addEventListener('mouseenter', () => (btn.style.opacity = '1'));
  btn.addEventListener('mouseleave', () => (btn.style.opacity = '0.6'));
  return btn;
}

async function clip(article: HTMLElement, btn: HTMLButtonElement): Promise<void> {
  const original = btn.textContent ?? '';
  btn.textContent = '…';
  try {
    const extracted = extractTweetFromArticle(article);
    if (!extracted) {
      flash(btn, '⚠', original);
      return;
    }
    const resp = await chrome.runtime.sendMessage({ kind: 'open-clipped', data: extracted });
    if (resp?.ok) flash(btn, '✓', original);
    else {
      console.error('clipped:', resp?.error);
      flash(btn, '⚠', original);
    }
  } catch (e) {
    console.error('clipped:', e);
    flash(btn, '⚠', original);
  }
}

function flash(btn: HTMLButtonElement, label: string, revert: string, ms = 1500): void {
  btn.textContent = label;
  if (ms > 0) setTimeout(() => (btn.textContent = revert), ms);
}

/* Popup can ask us to clip the focal/topmost tweet on the current page. */
function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== 'object') return false;
    if ((message as { kind?: string }).kind !== 'clip-current') return false;
    const article = findTargetArticle();
    if (!article) {
      sendResponse({ ok: false, error: 'No tweet found on this page.' });
      return false;
    }
    const extracted: ExtractedTweet | null = extractTweetFromArticle(article);
    if (!extracted) {
      sendResponse({ ok: false, error: 'Failed to extract tweet content.' });
      return false;
    }
    chrome.runtime
      .sendMessage({ kind: 'open-clipped', data: extracted })
      .then((resp) => sendResponse(resp))
      .catch((e) => sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    return true;
  });
}
