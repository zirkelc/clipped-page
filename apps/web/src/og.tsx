import { ImageResponse } from 'workers-og';
import { formatCount, type Payload } from '@clipped-page/shared';
import regularFont from './fonts/JetBrainsMono-Regular.ttf';
import semiBoldFont from './fonts/JetBrainsMono-SemiBold.ttf';

const WIDTH = 1200;
const HEIGHT = 630;
const FONT = 'JetBrains Mono';
const FG = '#e7e9ea';
const DIM = '#8b8f94';
const BG = '#0b0b0b';
const ACCENT = '#8b5cf6';

const fonts = [
  { name: FONT, data: regularFont, weight: 400 as const, style: 'normal' as const },
  { name: FONT, data: semiBoldFont, weight: 600 as const, style: 'normal' as const },
];

/** The scissors brand mark, drawn with the same geometry as the site logo. */
function Mark() {
  return (
    <svg width="46" height="46" viewBox="0 0 32 32" fill="none" stroke={FG} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="23" r="3.5" />
      <circle cx="23" cy="23" r="3.5" />
      <path d="M20.5 20.5 L18.3 18.3" />
      <path d="M13.7 13.7 L5 5" />
      <path d="M11.5 20.5 L27 5" />
    </svg>
  );
}

/** Builds the 1200x630 branded card for a clipped post (focal post only). */
function OgCard({ payload, sourceHost }: { payload: Payload; sourceHost: string }) {
  const focal = payload.posts[payload.focal] ?? payload.posts[0]!;
  const isThread = payload.posts.length > 1;
  const text = focal.text.length > 240 ? focal.text.slice(0, 237) + '…' : focal.text;

  const m = focal.metrics;
  const metrics: Array<string> = [];
  if (m?.likes != null) metrics.push(`${formatCount(m.likes)} likes`);
  if (m?.reposts != null) metrics.push(`${formatCount(m.reposts)} reposts`);
  if (m?.views != null) metrics.push(`${formatCount(m.views)} views`);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        backgroundColor: BG,
        color: FG,
        padding: '68px 72px',
        fontFamily: FONT,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Mark />
          <span style={{ fontSize: 30, fontWeight: 600, marginLeft: 16 }}>clipped.page</span>
        </div>
        <span style={{ fontSize: 24, color: DIM }}>{sourceHost}{isThread ? `  ·  thread (${payload.posts.length})` : ''}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 38, fontWeight: 600 }}>{focal.author.name}</span>
          <span style={{ fontSize: 26, color: DIM, marginLeft: 16 }}>@{focal.author.handle}</span>
        </div>
        <div style={{ display: 'flex', fontSize: 36, lineHeight: 1.4, color: FG }}>{text}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 25, color: DIM }}>{metrics.join('   ·   ')}</span>
        <span style={{ fontSize: 25, color: ACCENT }}>The link is the post.</span>
      </div>
    </div>
  );
}

/** Renders the OG image for a clipped post as a PNG response. */
export function renderOgImage(payload: Payload, src: string): ImageResponse {
  let sourceHost = 'x.com';
  try {
    sourceHost = new URL(src.startsWith('http') ? src : `https://${src}`).hostname;
  } catch {
    /* keep default */
  }
  return new ImageResponse(<OgCard payload={payload} sourceHost={sourceHost} />, {
    width: WIDTH,
    height: HEIGHT,
    format: 'png',
    fonts,
    emoji: 'twemoji',
  });
}
