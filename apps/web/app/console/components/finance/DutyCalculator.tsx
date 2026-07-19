'use client';

import { useState } from 'react';
import { HS_CATEGORIES, TARIFF_COUNTRIES } from '../../lib/finance/data';
import { modeledTariff } from '../../lib/finance/adapters';
import { landedCost } from '../../lib/finance/calc';
import { money, pct } from '../../lib/finance/format';

export default function DutyCalculator() {
  const [unitValue, setUnitValue] = useState(24);
  const [qty, setQty] = useState(500);
  const [freight, setFreight] = useState(1200);
  const [country, setCountry] = useState('United Kingdom');
  const [category, setCategory] = useState('Apparel & textiles');

  const t = modeledTariff.lookup(country, category);
  const lc = landedCost({ unitValue, qty, freight, dutyPct: t.dutyPct, vatPct: t.vatPct });

  return (
    <div className="oc-tool">
      <div className="oc-field-row">
        <label className="oc-field">
          <span>Unit value</span>
          <input className="oc-input" type="number" min={0} value={unitValue} onChange={(e) => setUnitValue(Number(e.target.value) || 0)} />
        </label>
        <label className="oc-field">
          <span>Qty</span>
          <input className="oc-input" type="number" min={0} value={qty} onChange={(e) => setQty(Number(e.target.value) || 0)} />
        </label>
        <label className="oc-field">
          <span>Freight (£)</span>
          <input className="oc-input" type="number" min={0} value={freight} onChange={(e) => setFreight(Number(e.target.value) || 0)} />
        </label>
      </div>
      <div className="oc-field-row">
        <label className="oc-field">
          <span>Destination</span>
          <select className="oc-input" value={country} onChange={(e) => setCountry(e.target.value)}>
            {TARIFF_COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="oc-field">
          <span>HS category</span>
          <select className="oc-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {HS_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="oc-out-line"><span className="oc-mut">Goods</span><span className="v">{money(lc.goods)}</span></div>
      <div className="oc-out-line"><span className="oc-mut">Freight</span><span className="v">{money(lc.freight)}</span></div>
      <div className="oc-out-line"><span className="oc-mut">Duty · {pct(t.dutyPct, 0)}</span><span className="v">{money(lc.duty)}</span></div>
      <div className="oc-out-line"><span className="oc-mut">VAT · {pct(t.vatPct, 0)}</span><span className="v">{money(lc.vat)}</span></div>
      <div className="oc-out-line"><span>Landed total</span><span className="v" style={{ color: 'var(--cyan)' }}>{money(lc.total)}</span></div>
      <div className="oc-out-line"><span className="oc-mut">Per unit</span><span className="v">{money(lc.perUnit)}</span></div>
      <span className="oc-badge-modeled">modeled tariff schedule · live adapter ready</span>
    </div>
  );
}
