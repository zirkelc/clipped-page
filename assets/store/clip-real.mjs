import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Frames a crop of the real X-page screenshot (the injected clip button hovered
 * in the action bar, violet with its "Clip" tooltip) into the shared formats.png
 * store layout. Crop rectangle is in source-image pixels; tweak and re-run. */
const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 1280, H = 800;
const SRC = '/Users/zirkelc/.claude/image-cache/25793b4e-9200-423b-a4d5-065d18ee031c/16.png';
const SRC_W = 2000;

/** Crop rectangle in source pixels. */
const crop = { left: 572, top: 250, right: 1292, bottom: 900 };

const cropW = crop.right - crop.left;
const cropH = crop.bottom - crop.top;
const DISPLAY_W = 764;
const scale = DISPLAY_W / cropW;
const DISPLAY_H = Math.round(cropH * scale);

const html = `<!doctype html><meta charset="utf-8">
<body style="margin:0;background:#0b0b0b;color:#e6e6e6;width:${W}px;height:${H}px;box-sizing:border-box;
  padding:38px 40px;display:flex;flex-direction:column;gap:20px;overflow:hidden;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace">
  <div style="font-size:20px">One click on any post. <span style="opacity:0.45">The clip button sits right in X&#8217;s action bar.</span></div>
  <div style="flex:1;min-height:0;display:flex;align-items:flex-start;justify-content:center">
    <div style="position:relative;width:${DISPLAY_W}px;height:${DISPLAY_H}px;overflow:hidden;
      border:1px solid rgba(230,230,230,0.18);border-radius:10px">
      <img src="file://${SRC}" style="position:absolute;width:${Math.round(SRC_W * scale)}px;
        left:${-crop.left * scale}px;top:${-crop.top * scale}px">
    </div>
  </div>
</body>`;

const htmlPath = join(HERE, 'clip-real.html');
writeFileSync(htmlPath, html);
execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
  '--default-background-color=0b0b0bff', `--screenshot=${join(HERE, 'clip.png')}`,
  `--window-size=${W},${H}`, `file://${htmlPath}`], { stdio: 'ignore' });
console.log('wrote clip.png  display', DISPLAY_W, 'x', DISPLAY_H);
