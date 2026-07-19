import { requireTenant } from '../security/tenant-context.ts';
import { AnalyticsError, decisionMix, ratio } from './rollup.ts';
import type { DecisionMix } from './rollup.ts';

/**
 * Tenant-scoped metrics store.
 *
 * Ingests typed analytics events — (metric, dimension, value) tuples the control
 * plane emits — and answers deterministic count / breakdown / rate queries.
 * Writes fail closed if the event's tenant does not match the active scope, and
 * every read is confined to the active tenant.
 */

export interface AnalyticsEvent {
  tenantId: string;
  metric: string;
  dimension: string;
  at: string; // ISO 8601
  value?: number; // defaults to 1 (a count)
}

export class MetricsStore {
  private sums = new Map<string, number>();
  private ingested = 0;

  private key(tenantId: string, metric: string, dimension: string): string {
    return `${tenantId}\n${metric}\n${dimension}`;
  }

  ingest(event: AnalyticsEvent): void {
    if (requireTenant() !== event.tenantId) throw new AnalyticsError('CROSS_TENANT_DENIED');
    if (!event.metric || !event.dimension) throw new AnalyticsError('EVENT_INVALID');
    const value = event.value ?? 1;
    const k = this.key(event.tenantId, event.metric, event.dimension);
    this.sums.set(k, (this.sums.get(k) ?? 0) + value);
    this.ingested += 1;
  }

  count(metric: string, dimension: string): number {
    return this.sums.get(this.key(requireTenant(), metric, dimension)) ?? 0;
  }

  breakdown(metric: string): Record<string, number> {
    const prefix = `${requireTenant()}\n${metric}\n`;
    const out: Record<string, number> = {};
    for (const [k, v] of this.sums) {
      if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
    }
    return out;
  }

  total(metric: string): number {
    const b = this.breakdown(metric);
    let sum = 0;
    for (const key in b) sum += b[key];
    return sum;
  }

  rate(metric: string, dimension: string): number {
    return ratio(this.count(metric, dimension), this.total(metric));
  }

  /** Convenience: ALLOW/DENY/REVIEW mix for a decision metric. */
  decisionMixFor(metric: string): DecisionMix {
    return decisionMix(this.breakdown(metric));
  }

  size(): number {
    return this.ingested;
  }
}
