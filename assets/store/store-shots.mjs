import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Generates the CWS screenshots that share the formats.png layout: a dark
 * 1280x800 canvas, a descriptive header, and the content in a framed panel.
 * Both are live clipped.page renders. The clip-button shot is produced
 * separately from a real X-page screenshot by clip-real.mjs. */
const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 1280, H = 800;

const jarredUrl = readFileSync(join(HERE, 'jarred.url'), 'utf8').trim();
const threadUrl = readFileSync(join(HERE, 'thread.url'), 'utf8').trim();

/** Wrap content in the shared dark canvas + descriptive header. */
function page(header, sub, body) {
  return `<!doctype html><meta charset="utf-8">
  <body style="margin:0;background:#0b0b0b;color:#e6e6e6;width:${W}px;height:${H}px;box-sizing:border-box;
    padding:38px 40px;display:flex;flex-direction:column;gap:20px;overflow:hidden;
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace">
    <div style="font-size:20px">${header} <span style="opacity:0.45">${sub}</span></div>
    <div style="flex:1;min-height:0;display:flex;align-items:flex-start;justify-content:center">${body}</div>
  </body>`;
}

const panel = 'border:1px solid rgba(230,230,230,0.18);border-radius:10px;background:#0b0b0b';
const iframe = (src, w) =>
  `<iframe src="${src}" scrolling="no" style="width:${w}px;height:700px;${panel}"></iframe>`;

const shots = [
  { name: 'single.png', html: page('Any post becomes a link.', 'Open it and clipped.page renders a clean, readable card.', iframe(jarredUrl, 760)) },
  { name: 'thread.png', html: page('Full thread capture.', 'Every reply and image, packed into the same URL.', iframe(threadUrl, 760)) },
];

for (const { name, html } of shots) {
  const htmlPath = join(HERE, name.replace(/\.png$/, '.html'));
  writeFileSync(htmlPath, html);
  execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--default-background-color=0b0b0bff', '--virtual-time-budget=6000',
    `--screenshot=${join(HERE, name)}`, `--window-size=${W},${H}`, `file://${htmlPath}`], { stdio: 'ignore' });
  console.log('wrote', name);
}
