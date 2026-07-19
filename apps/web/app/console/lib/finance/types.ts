/**
 * Trade & finance domain types.
 *
 * `source` is carried on every data-bearing record so the UI can label it
 * honestly. Today everything is 'modeled' (deterministic reference data); the
 * adapter interfaces are shaped so a 'live' provider can be dropped in later
 * without touching the components.
 */

export type DataSource = 'modeled' | 'live';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export interface FxRate {
  base: string;
  quote: string;
  rate: number;
  asOf: string;
  source: DataSource;
}

export interface FxSignal {
  code: string;
  trend30dPct: number;
  recommend: 'order' | 'hold' | 'watch';
  note: string;
}

export interface TariffLine {
  country: string;
  category: string;
  dutyPct: number;
  vatPct: number;
  source: DataSource;
}

export interface Competitor {
  name: string;
  sku: string;
  price: number;
  currency: string;
  deltaPct: number;
  stock: 'in' | 'low' | 'out';
}

export interface SupplyLane {
  supplier: string;
  origin: string;
  mode: 'sea' | 'air' | 'road';
  leadDays: number;
  moq: number;
  tariffExposurePct: number;
  risk: 'low' | 'med' | 'high';
}
