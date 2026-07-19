import { DUTY_BY_CATEGORY, FX_AS_OF, FX_RATES, VAT_BY_COUNTRY } from './data';
import type { FxRate, TariffLine } from './types';

/**
 * Provider seams. Components depend only on these interfaces, so wiring a real
 * data source later is a one-line swap (modeledFx -> liveFx) with no UI change.
 * Each provider declares its `source` so panels can label the data honestly.
 */

export interface FxProvider {
  rate(base: string, quote: string): FxRate;
  asOf(): string;
  source(): 'modeled' | 'live';
}

export const modeledFx: FxProvider = {
  rate(base, quote) {
    const b = FX_RATES[base];
    const q = FX_RATES[quote];
    return { base, quote, rate: b && q ? q / b : NaN, asOf: FX_AS_OF, source: 'modeled' };
  },
  asOf() {
    return FX_AS_OF;
  },
  source() {
    return 'modeled';
  },
};

export interface TariffProvider {
  lookup(country: string, category: string): TariffLine;
  source(): 'modeled' | 'live';
}

export const modeledTariff: TariffProvider = {
  lookup(country, category) {
    return {
      country,
      category,
      dutyPct: DUTY_BY_CATEGORY[category] ?? 0,
      vatPct: VAT_BY_COUNTRY[country] ?? 0,
      source: 'modeled',
    };
  },
  source() {
    return 'modeled';
  },
};

// A live implementation would look like:
//   export const liveFx: FxProvider = { rate: async-backed cache, source: () => 'live' }
// wired behind the same interface, gated by the control plane's connector policy.
