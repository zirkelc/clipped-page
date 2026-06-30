const PROD_BASE_URL = 'https://clipped.page/';
const DEV_BASE_URL = 'http://localhost:8787/';

/**
 * In dev builds (`pnpm dev` → `wxt dev`), Vite replaces `import.meta.env.DEV`
 * with `true`. `MODE === 'development'` also catches `wxt build --mode development`.
 */
const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
export const DEFAULT_BASE_URL = isDev ? DEV_BASE_URL : PROD_BASE_URL;
