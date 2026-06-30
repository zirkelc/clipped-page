import { formatCount } from './count.js';
import type { Metrics, Payload } from './payload.js';

export function toMarkdown(p: Payload, src: string): string {
  const lines: Array<string> = [];
  const multi = p.posts.length > 1;
  if (multi) lines.push(`**Thread (${p.posts.length} posts)** · Source: ${srcLink(src)}`, '');

  for (let i = 0; i < p.posts.length; i++) {
    const post = p.posts[i]!;
    const isFocal = i === p.focal;
    if (i > 0) lines.push('', '---', '');
    const marker = multi && isFocal ? '→ ' : '';
    lines.push(`${marker}**${post.author.name}** @${post.author.handle}`);
    lines.push('');
    lines.push(post.text);
    if (post.images && post.images.length > 0) {
      lines.push('');
      for (const url of post.images) lines.push(`![image](${url})`);
    }
    if (post.videos && post.videos.length > 0) {
      lines.push('');
      for (const v of post.videos) lines.push(`![video poster](${v.poster}) (▶ play on ${srcLink(src)})`);
    }
    if (post.card) {
      const label = post.card.title || post.card.domain || post.card.url;
      lines.push('', `→ [${label}](${post.card.url})`);
    }
    if (post.quote) {
      const q = post.quote;
      lines.push('');
      lines.push(`> **${q.author.name}** @${q.author.handle}`);
      lines.push('>');
      for (const ln of q.text.split('\n')) lines.push(`> ${ln}`);
      if (q.images && q.images.length > 0) {
        lines.push('>');
        for (const url of q.images) lines.push(`> ![image](${url})`);
      }
      if (q.videos && q.videos.length > 0) {
        lines.push('>');
        for (const v of q.videos) lines.push(`> ![video poster](${v.poster})`);
      }
      lines.push('>');
      lines.push(q.url ? `> Posted: ${q.timestamp} · ${srcLink(q.url)}` : `> Posted: ${q.timestamp}`);
    }
    const m = formatMetricsLine(post.metrics);
    if (m) lines.push('', m);
    lines.push('', `Posted: ${post.timestamp}`);
  }

  if (!multi) {
    lines.push('', '---', `Source: ${srcLink(src)}`);
  }
  if (p.truncated) lines.push('(truncated)');
  return lines.join('\n') + '\n';
}

function srcLink(src: string): string {
  return src.startsWith('http') ? src : `https://${src}`;
}

function formatMetricsLine(m: Metrics | undefined): string | null {
  if (!m) return null;
  const parts: Array<string> = [];
  if (m.likes != null) parts.push(`${formatCount(m.likes)} likes`);
  if (m.reposts != null) parts.push(`${formatCount(m.reposts)} reposts`);
  if (m.bookmarks != null) parts.push(`${formatCount(m.bookmarks)} bookmarks`);
  if (m.views != null) parts.push(`${formatCount(m.views)} views`);
  if (parts.length === 0) return null;
  return parts.join(' · ');
}
