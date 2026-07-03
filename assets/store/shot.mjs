import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** Reproduce the shared codec: json -> gzip -> base64url. */
function encode(payload) {
  const gz = gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'));
  return gz.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function clipUrl({ src, payload }) {
  const u = new URL('https://clipped.page/');
  u.searchParams.set('v', '1');
  u.searchParams.set('s', src);
  u.searchParams.set('d', encode(payload));
  return u.toString();
}

/** Render a URL to an exact-size PNG via headless Chrome. */
function shot(url, out, w = 1280, h = 800) {
  execFileSync(CHROME, [
    '--headless=new',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--screenshot=${out}`,
    `--window-size=${w},${h}`,
    '--default-background-color=0b0b0bff',
    url,
  ], { stdio: 'ignore' });
  console.log('wrote', out);
}

const [, , mode, arg] = process.argv;
if (mode === 'card') {
  const data = JSON.parse(readFileSync(join(HERE, arg), 'utf8'));
  const name = arg.replace(/\.json$/, '.png');
  shot(clipUrl(data), join(HERE, name));
} else if (mode === 'url') {
  const w = process.argv[5] ? Number(process.argv[5]) : 1280;
  const h = process.argv[6] ? Number(process.argv[6]) : 800;
  shot(arg, join(HERE, process.argv[4]), w, h);
} else if (mode === 'urlfile') {
  /* Read the target URL from a file so a long base64 clip URL never has to be
   * passed on the command line. */
  const url = readFileSync(arg, 'utf8').trim();
  shot(url, join(HERE, process.argv[4]));
}
