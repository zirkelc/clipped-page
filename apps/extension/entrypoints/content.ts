import { defineContentScript } from 'wxt/utils/define-content-script';
import { buildShareFields } from '@clipped-page/shared/share';
import { toMarkdown } from '@clipped-page/shared/format';
import { extractTweetFromArticle, findTargetArticle, type ExtractedTweet } from '../lib/extract.js';
import { getClipAction, DEFAULT_CLIP_ACTION, type ClipAction } from '../lib/settings.js';

const BUTTON_MARKER = 'data-clipped-injected';

/* Cache the clip-action setting so the click handler stays synchronous up to
 * the clipboard write (an extra awaited storage read would risk spending the
 * click's transient user activation before we can write to the clipboard). */
let clipAction: ClipAction = DEFAULT_CLIP_ACTION;

/** The brand mark (scissors), sized to sit inline with X's action-bar icons. */
const CLIP_ICON =
  '<svg width="18" height="18" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="23" r="3.5"/><circle cx="23" cy="23" r="3.5"/><path d="M20.5 20.5 L18.3 18.3"/><path d="M13.7 13.7 L5 5"/><path d="M11.5 20.5 L27 5"/></svg>';

export default defineContentScript({
  matches: ['https://x.com/*', 'https://twitter.com/*'],
  runAt: 'document_idle',
  main() {
    setupClipAction();
    setupMutationObserver();
    setupMessageListener();
  },
});

function setupClipAction(): void {
  void getClipAction().then((a) => (clipAction = a));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.clipAction) clipAction = changes.clipAction.newValue as ClipAction;
  });
}

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

  const btn = makeActionButton(CLIP_ICON, 'Clip on clipped.page', 'Clip');
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    void clip(article, btn);
  });

  actionBar.appendChild(btn);
  article.setAttribute(BUTTON_MARKER, 'true');
}

/* Hover accent for the button, mirroring X's per-action colored hover (tinted
 * circle + colored icon). Distinct from X's blue/green/pink so it reads as ours. */
const ACCENT = '#8b5cf6';
const ACCENT_TINT = 'rgba(139, 92, 246, 0.12)';

/* Matches X's native action-button tooltip (measured from the Share button):
 * medium semi-transparent gray, fully-rounded pill, 11px white text, no shadow.
 * Portaled to <body> and `position: fixed` so it floats above the action bar /
 * "View quotes" row instead of being trapped in their stacking context. */
const TOOLTIP_CSS = [
  'position: fixed',
  'transform: translateX(-50%)',
  'background: rgba(70, 70, 70, 0.9)',
  'color: #fff',
  'padding: 3px 8px',
  'border-radius: 9999px',
  'font-family: system-ui, sans-serif',
  'font-size: 11px',
  'font-weight: 400',
  'line-height: 12px',
  'white-space: nowrap',
  'opacity: 0',
  'pointer-events: none',
  'transition: opacity 0.12s',
  'z-index: 2147483647',
].join(';');

function makeActionButton(iconHtml: string, label: string, tooltip: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', label);
  btn.style.cssText = [
    'all: unset',
    'cursor: pointer',
    'margin-left: 4px',
    'display: inline-flex',
    'align-items: center',
  ].join(';');

  /* Fixed square wrapper so the hover highlight is a circle (X stretches flex
   * children in the action bar, which would otherwise make an oval), and so the
   * click-feedback flash can swap the icon glyph in isolation. */
  const icon = document.createElement('span');
  icon.setAttribute('data-clipped-icon', '');
  icon.style.cssText = [
    'width: 34px',
    'height: 34px',
    'border-radius: 50%',
    'display: inline-flex',
    'align-items: center',
    'justify-content: center',
    'font-size: 14px',
    'opacity: 0.75',
    'transition: color 0.15s, background-color 0.15s, opacity 0.15s',
  ].join(';');
  icon.innerHTML = iconHtml;
  btn.appendChild(icon);

  let showTimer = 0;
  let tip: HTMLElement | null = null;
  const removeTip = () => {
    if (!tip) return;
    const t = tip;
    tip = null;
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 150);
  };
  btn.addEventListener('mouseenter', () => {
    icon.style.opacity = '1';
    icon.style.color = ACCENT;
    icon.style.backgroundColor = ACCENT_TINT;
    showTimer = window.setTimeout(() => {
      if (!btn.isConnected) return;
      const r = icon.getBoundingClientRect();
      const el = document.createElement('div');
      el.textContent = tooltip;
      el.style.cssText = TOOLTIP_CSS;
      el.style.left = `${r.left + r.width / 2}px`;
      el.style.top = `${r.bottom + 4}px`;
      document.body.appendChild(el);
      tip = el;
      requestAnimationFrame(() => {
        if (tip) tip.style.opacity = '1';
      });
    }, 300);
  });
  btn.addEventListener('mouseleave', () => {
    icon.style.opacity = '0.75';
    icon.style.color = '';
    icon.style.backgroundColor = '';
    clearTimeout(showTimer);
    removeTip();
  });
  return btn;
}

function iconOf(btn: HTMLButtonElement): HTMLElement {
  return btn.querySelector('[data-clipped-icon]') as HTMLElement;
}

async function clip(article: HTMLElement, btn: HTMLButtonElement): Promise<void> {
  const icon = iconOf(btn);
  const original = icon.innerHTML;
  icon.textContent = '…';
  try {
    const extracted = extractTweetFromArticle(article);
    if (!extracted) {
      flash(icon, '⚠', original);
      return;
    }
    /* Markdown is self-contained from the extracted post, so this action needs
     * neither the built URL nor a background round-trip. */
    if (clipAction === 'copy-md') {
      const md = toMarkdown(extracted.payload, extracted.src);
      flash(icon, (await copyToClipboard(md)) ? '✓' : '⚠', original);
      return;
    }
    const wantsCopy = clipAction === 'copy' || clipAction === 'copy+open';
    const wantsOpen = clipAction === 'open' || clipAction === 'copy+open';
    const wantsShare = clipAction === 'share';
    const resp = await chrome.runtime.sendMessage({ kind: 'clip', data: extracted, open: wantsOpen });
    if (!resp?.ok) {
      console.error('clipped:', resp?.error);
      flash(icon, '⚠', original);
      return;
    }
    if (wantsCopy && !(await copyToClipboard(resp.url))) {
      flash(icon, '⚠', original);
      return;
    }
    if (wantsShare) {
      const result = await shareUrl(resp.url, extracted);
      if (result === 'cancelled') {
        icon.innerHTML = original;
        return;
      }
      if (result === 'failed') {
        flash(icon, '⚠', original);
        return;
      }
    }
    flash(icon, '✓', original);
  } catch (e) {
    console.error('clipped:', e);
    flash(icon, '⚠', original);
  }
}

/** Copy text, falling back to execCommand if the async clipboard API is
 * blocked (e.g. the click's user activation lapsed during the await). */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) {
    console.error('clipped:', e);
    return false;
  }
}

/** Open the native share sheet for the clipped URL. Returns "cancelled" when
 * the user dismisses the sheet (not an error), and falls back to copying the
 * link on platforms without Web Share support. */
async function shareUrl(url: string, extracted: ExtractedTweet): Promise<'shared' | 'cancelled' | 'failed'> {
  if (typeof navigator.share !== 'function') {
    return (await copyToClipboard(url)) ? 'shared' : 'failed';
  }
  const { title, text } = buildShareFields(extracted.payload);
  try {
    await navigator.share({ url, title, text });
    return 'shared';
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return 'cancelled';
    console.error('clipped:', e);
    return 'failed';
  }
}

function flash(icon: HTMLElement, label: string, revert: string, ms = 1500): void {
  icon.textContent = label;
  if (ms > 0) setTimeout(() => (icon.innerHTML = revert), ms);
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
      .sendMessage({ kind: 'clip', data: extracted, open: true })
      .then((resp) => sendResponse(resp))
      .catch((e) => sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    return true;
  });
}
