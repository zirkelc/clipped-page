const PROD_BASE_URL = 'https://clipped.page/';
const DEV_BASE_URL = 'http://localhost:8787/';

/**
 * In dev builds (`pnpm dev` → `wxt dev`), Vite replaces `import.meta.env.DEV`
 * with `true`. `MODE === 'development'` also catches `wxt build --mode development`.
 */
const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
export const DEFAULT_BASE_URL = isDev ? DEV_BASE_URL : PROD_BASE_URL;

/**
 * What the ✂ clip button does. "open" opens the clipped URL in a new tab,
 * "copy" copies the URL to the clipboard, "copy+open" does both, "share"
 * invokes the native share sheet, and "copy-md" copies the post as Markdown.
 */
export const CLIP_ACTIONS = ['open', 'copy', 'copy+open', 'share', 'copy-md'] as const;
export type ClipAction = (typeof CLIP_ACTIONS)[number];
export const DEFAULT_CLIP_ACTION: ClipAction = 'open';

function isClipAction(value: unknown): value is ClipAction {
  return typeof value === 'string' && (CLIP_ACTIONS as ReadonlyArray<string>).includes(value);
}

export async function getClipAction(): Promise<ClipAction> {
  const { clipAction } = await chrome.storage.sync.get({ clipAction: DEFAULT_CLIP_ACTION });
  return isClipAction(clipAction) ? clipAction : DEFAULT_CLIP_ACTION;
}

export async function setClipAction(action: ClipAction): Promise<void> {
  await chrome.storage.sync.set({ clipAction: action });
}
