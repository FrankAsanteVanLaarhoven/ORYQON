/**
 * Deterministic rollups.
 *
 * Pure aggregation over event lists — the same inputs always yield the same
 * output. Time-bucketing takes an explicit origin and window (never a wall
 * clock), so a rollup is reproducible and testable.
 */

export class AnalyticsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyticsError';
  }
}

export function countBy<T>(items: readonly T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

export interface DecisionMix {
  allow: number;
  deny: number;
  review: number;
  total: number;
  allowRate: number;
  denyRate: number;
  reviewRate: number;
}

export function decisionMix(breakdown: Record<string, number>): DecisionMix {
  const allow = breakdown.ALLOW ?? 0;
  const deny = breakdown.DENY ?? 0;
  const review = breakdown.REVIEW ?? 0;
  const total = allow + deny + review;
  return {
    allow,
    deny,
    review,
    total,
    allowRate: ratio(allow, total),
    denyRate: ratio(deny, total),
    reviewRate: ratio(review, total),
  };
}

/** Top-n entries by count, descending, ties broken by key for stable output. */
export function topN(counts: Record<string, number>, n: number): Array<{ key: string; count: number }> {
  return Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, Math.max(0, n));
}

/**
 * Bucket events into fixed windows: index = floor((at - originMs) / windowMs).
 * Events before the origin or with an unparseable timestamp are ignored.
 */
export function windowBuckets(
  events: readonly { at: string }[],
  windowMs: number,
  originMs: number,
): Record<number, number> {
  if (!(windowMs > 0)) throw new AnalyticsError('WINDOW_INVALID');
  const out: Record<number, number> = {};
  for (const e of events) {
    const t = Date.parse(e.at);
    if (Number.isNaN(t) || t < originMs) continue;
    const bucket = Math.floor((t - originMs) / windowMs);
    out[bucket] = (out[bucket] ?? 0) + 1;
  }
  return out;
}
