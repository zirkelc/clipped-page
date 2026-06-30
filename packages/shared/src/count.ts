/**
 * Parses display strings used on social UIs: "1,234", "1.2K", "12M",
 * or fragments like "1.2K Likes". Returns null if no number is found.
 */
export function parseCount(input: string): number | null {
  if (!input) return null;
  const m = input.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([KMB]?)/i);
  if (!m) return null;
  const base = parseFloat(m[1] ?? '');
  if (Number.isNaN(base)) return null;
  const suffix = (m[2] ?? '').toUpperCase();
  const mult = suffix === 'K' ? 1_000 : suffix === 'M' ? 1_000_000 : suffix === 'B' ? 1_000_000_000 : 1;
  return Math.round(base * mult);
}

export function formatCount(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return trimZero((n / 1_000).toFixed(n < 10_000 ? 1 : 0)) + 'K';
  if (n < 1_000_000_000) return trimZero((n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0)) + 'M';
  return trimZero((n / 1_000_000_000).toFixed(1)) + 'B';
}

function trimZero(s: string): string {
  return s.replace(/\.0$/, '');
}
