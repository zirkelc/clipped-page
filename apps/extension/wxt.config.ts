import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  entrypointsDir: 'entrypoints',
  manifest: {
    name: 'clipped.page',
    description: 'Clip any post on x.com as a self-contained URL.',
    permissions: ['activeTab'],
    host_permissions: ['https://x.com/*', 'https://twitter.com/*'],
    action: {
      default_title: 'Open clipped.page',
    },
  },
  /** Don't auto-launch a fresh Chrome on `pnpm dev`. Use your existing browser. */
  webExt: {
    disabled: true,
  },
});
