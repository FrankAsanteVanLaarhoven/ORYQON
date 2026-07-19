/** Presentation helpers for money / percentages / counts. */

export function money(v: number, code = 'GBP'): string {
  if (!Number.isFinite(v)) return '—';
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return v.toFixed(2);
  }
}

export function pct(v: number, dp = 1): string {
  return Number.isFinite(v) ? v.toFixed(dp) + '%' : '—';
}

export function signedPct(v: number, dp = 1): string {
  if (!Number.isFinite(v)) return '—';
  return (v > 0 ? '+' : '') + v.toFixed(dp) + '%';
}

export function num(v: number): string {
  return Number.isFinite(v) ? Math.round(v).toLocaleString('en-GB') : '—';
}
