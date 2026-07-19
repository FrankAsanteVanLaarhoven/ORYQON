'use client';

import { useState } from 'react';
import { CURRENCIES } from '../../lib/finance/data';
import { modeledFx } from '../../lib/finance/adapters';
import { money } from '../../lib/finance/format';

export default function CurrencyConverter() {
  const [amount, setAmount] = useState(1000);
  const [from, setFrom] = useState('GBP');
  const [to, setTo] = useState('CNY');

  const r = modeledFx.rate(from, to);
  const converted = amount * r.rate;

  return (
    <div className="oc-tool">
      <div className="oc-field-row">
        <label className="oc-field">
          <span>Amount</span>
          <input
            className="oc-input"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
          />
        </label>
        <label className="oc-field">
          <span>From</span>
          <select className="oc-input" value={from} onChange={(e) => setFrom(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </label>
        <label className="oc-field">
          <span>To</span>
          <select className="oc-input" value={to} onChange={(e) => setTo(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="oc-out-big">{money(converted, to)}</div>
      <div className="oc-out-line">
        <span className="oc-mut">Rate</span>
        <span className="v">
          1 {from} = {Number.isFinite(r.rate) ? r.rate.toFixed(4) : '—'} {to}
        </span>
      </div>
      <span className="oc-badge-modeled">modeled · {r.asOf} · live adapter ready</span>
    </div>
  );
}
