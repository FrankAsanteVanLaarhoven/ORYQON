import type { Competitor, Currency, FxSignal, SupplyLane } from './types';

/**
 * Modeled reference data. Deterministic, illustrative, and clearly labeled as
 * modeled wherever it surfaces. Real providers replace these via the adapters
 * in ./adapters — no component changes required.
 */

export const FX_AS_OF = '2026-07-19'; // modeled snapshot date

export const CURRENCIES: Currency[] = [
  { code: 'GBP', symbol: '£', name: 'Pound sterling' },
  { code: 'USD', symbol: '$', name: 'US dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'CNY', symbol: '¥', name: 'Chinese yuan' },
  { code: 'JPY', symbol: '¥', name: 'Japanese yen' },
  { code: 'INR', symbol: '₹', name: 'Indian rupee' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE dirham' },
];

/** Units of each currency per 1 GBP (modeled). */
export const FX_RATES: Record<string, number> = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.17,
  CNY: 9.15,
  JPY: 191.5,
  INR: 106.2,
  AED: 4.66,
};

/** Modeled 30-day directional signal, framed for a GBP-based importer. */
export const FX_SIGNALS: FxSignal[] = [
  { code: 'USD', trend30dPct: -1.2, recommend: 'watch', note: 'USD softening vs GBP' },
  { code: 'EUR', trend30dPct: 0.4, recommend: 'hold', note: 'EUR broadly stable' },
  { code: 'CNY', trend30dPct: -3.1, recommend: 'order', note: 'CNY weak — favourable window to reorder China lanes' },
  { code: 'JPY', trend30dPct: -2.4, recommend: 'order', note: 'JPY weak vs GBP' },
  { code: 'INR', trend30dPct: 1.1, recommend: 'hold', note: 'INR firming — no rush' },
  { code: 'AED', trend30dPct: -1.2, recommend: 'watch', note: 'tracks USD (pegged)' },
];

export const TARIFF_COUNTRIES = [
  'United Kingdom',
  'United States',
  'European Union',
  'China',
  'Japan',
  'India',
  'UAE',
];

export const HS_CATEGORIES = [
  'Apparel & textiles',
  'Footwear',
  'Electronics',
  'Outdoor equipment',
  'Accessories',
];

/** Modeled VAT / GST rate by destination (%). */
export const VAT_BY_COUNTRY: Record<string, number> = {
  'United Kingdom': 20,
  'United States': 0,
  'European Union': 21,
  China: 13,
  Japan: 10,
  India: 18,
  UAE: 5,
};

/** Modeled import-duty rate by HS category (%). */
export const DUTY_BY_CATEGORY: Record<string, number> = {
  'Apparel & textiles': 12,
  Footwear: 16,
  Electronics: 4,
  'Outdoor equipment': 8,
  Accessories: 6,
};

export const COMPETITORS: Competitor[] = [
  { name: 'Northwind Outfitters', sku: 'Field Jacket', price: 189, currency: 'GBP', deltaPct: 4, stock: 'in' },
  { name: 'Atlas Expedition', sku: 'Field Jacket', price: 172, currency: 'GBP', deltaPct: -2, stock: 'low' },
  { name: 'Summit & Co', sku: 'Trail Runner', price: 128, currency: 'GBP', deltaPct: 1, stock: 'in' },
  { name: 'Vertex Gear', sku: 'Rain Shell', price: 96, currency: 'GBP', deltaPct: -5, stock: 'out' },
  { name: 'Meridian Supply', sku: 'Travel Pack', price: 142, currency: 'GBP', deltaPct: 3, stock: 'in' },
];

/** Our own reference list prices (for competitor position). */
export const OUR_PRICES: Record<string, number> = {
  'Field Jacket': 179,
  'Trail Runner': 125,
  'Rain Shell': 99,
  'Travel Pack': 149,
};

export const SUPPLY_LANES: SupplyLane[] = [
  { supplier: 'Hangzhou Textiles', origin: 'China', mode: 'sea', leadDays: 38, moq: 500, tariffExposurePct: 12, risk: 'med' },
  { supplier: 'Porto Leatherworks', origin: 'European Union', mode: 'road', leadDays: 9, moq: 120, tariffExposurePct: 0, risk: 'low' },
  { supplier: 'Osaka Components', origin: 'Japan', mode: 'air', leadDays: 6, moq: 200, tariffExposurePct: 4, risk: 'low' },
  { supplier: 'Chennai Mills', origin: 'India', mode: 'sea', leadDays: 41, moq: 800, tariffExposurePct: 12, risk: 'high' },
];
