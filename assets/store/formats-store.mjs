import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Renders the "one link, every format" comparison at the CWS screenshot size
 * (1280x800, 24-bit, no alpha): rendered card on the left, ?f=md Markdown on
 * the right. */
const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 1280, H = 800;

const url = readFileSync(join(HERE, 'jarred.url'), 'utf8').trim();
const md = readFileSync(join(HERE, 'jarred.md'), 'utf8').trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CARD_W = 548;
const MD_W = 576;
const PANEL_H = 612;

const html = `<!doctype html><meta charset="utf-8">
<body style="margin:0;background:#0b0b0b;color:#e6e6e6;width:${W}px;height:${H}px;box-sizing:border-box;
  padding:38px 40px;display:flex;flex-direction:column;gap:20px;overflow:hidden;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace">
  <div style="font-size:20px">One link. Every format. <span style="opacity:0.45">Point your agent at it.</span></div>
  <div style="display:flex;gap:28px;align-items:flex-start;justify-content:center">
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="font-size:14px;opacity:0.55">browser &#8594; rendered card</div>
      <iframe src="${url}" scrolling="no" style="width:${CARD_W}px;height:${PANEL_H}px;border:1px solid rgba(230,230,230,0.18);border-radius:8px;background:#0b0b0b"></iframe>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;width:${MD_W}px">
      <div style="font-size:14px;opacity:0.55">?f=md &#8594; markdown</div>
      <pre style="margin:0;height:${PANEL_H}px;box-sizing:border-box;overflow:hidden;white-space:pre-wrap;word-break:break-word;font-size:14.5px;line-height:1.6;background:#131313;border:1px solid rgba(230,230,230,0.18);border-radius:8px;padding:20px">${esc(md)}</pre>
    </div>
  </div>
</body>`;

const htmlPath = join(HERE, 'formats-store.html');
const out = join(HERE, 'formats.png');
writeFileSync(htmlPath, html);
execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
  '--default-background-color=0b0b0bff', '--virtual-time-budget=6000',
  `--screenshot=${out}`, `--window-size=${W},${H}`, `file://${htmlPath}`], { stdio: 'ignore' });
console.log('wrote', out);
