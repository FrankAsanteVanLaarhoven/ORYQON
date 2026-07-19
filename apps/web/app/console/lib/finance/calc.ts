import { FX_RATES } from './data';

/**
 * Pure, deterministic finance calculators — real arithmetic, no modeled
 * fudging. Given the same inputs they always return the same result.
 */

export function crossRate(from: string, to: string): number {
  const f = FX_RATES[from];
  const t = FX_RATES[to];
  if (!f || !t) return NaN;
  return t / f;
}

export function convert(amount: number, from: string, to: string): number {
  return amount * crossRate(from, to);
}

export interface LandedCostInput {
  unitValue: number;
  qty: number;
  freight: number;
  dutyPct: number;
  vatPct: number;
}
export interface LandedCostResult {
  goods: number;
  freight: number;
  duty: number;
  vat: number;
  total: number;
  perUnit: number;
}

/** Duty on (goods + freight); VAT on (goods + freight + duty). */
export function landedCost(i: LandedCostInput): LandedCostResult {
  const goods = i.unitValue * i.qty;
  const dutiable = goods + i.freight;
  const duty = dutiable * (i.dutyPct / 100);
  const vat = (dutiable + duty) * (i.vatPct / 100);
  const total = dutiable + duty + vat;
  return { goods, freight: i.freight, duty, vat, total, perUnit: i.qty > 0 ? total / i.qty : 0 };
}

export interface OrderInput {
  unitCost: number;
  moq: number;
  orderQty: number;
  listPrice: number;
  discountPct: number;
}
export interface OrderResult {
  meetsMoq: boolean;
  shortfall: number;
  netPrice: number;
  orderCost: number;
  revenue: number;
  grossProfit: number;
  marginPct: number;
  markupPct: number;
  /** Gross margin given up by the discount, in currency. */
  marginGivenUp: number;
}

export function orderEconomics(i: OrderInput): OrderResult {
  const meetsMoq = i.orderQty >= i.moq;
  const shortfall = meetsMoq ? 0 : i.moq - i.orderQty;
  const netPrice = i.listPrice * (1 - i.discountPct / 100);
  const orderCost = i.unitCost * i.orderQty;
  const revenue = netPrice * i.orderQty;
  const grossProfit = revenue - orderCost;
  const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const markupPct = orderCost > 0 ? (grossProfit / orderCost) * 100 : 0;
  const marginGivenUp = (i.listPrice - netPrice) * i.orderQty;
  return { meetsMoq, shortfall, netPrice, orderCost, revenue, grossProfit, marginPct, markupPct, marginGivenUp };
}
