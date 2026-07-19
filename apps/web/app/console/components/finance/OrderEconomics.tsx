'use client';

import { useState } from 'react';
import { orderEconomics } from '../../lib/finance/calc';
import { money, pct } from '../../lib/finance/format';

export default function OrderEconomics() {
  const [unitCost, setUnitCost] = useState(48);
  const [moq, setMoq] = useState(500);
  const [orderQty, setOrderQty] = useState(600);
  const [listPrice, setListPrice] = useState(179);
  const [discountPct, setDiscountPct] = useState(10);

  const r = orderEconomics({ unitCost, moq, orderQty, listPrice, discountPct });

  return (
    <div className="oc-tool">
      <div className="oc-field-row">
        <label className="oc-field">
          <span>Unit cost (£)</span>
          <input className="oc-input" type="number" min={0} value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value) || 0)} />
        </label>
        <label className="oc-field">
          <span>MOQ</span>
          <input className="oc-input" type="number" min={0} value={moq} onChange={(e) => setMoq(Number(e.target.value) || 0)} />
        </label>
        <label className="oc-field">
          <span>Order qty</span>
          <input className="oc-input" type="number" min={0} value={orderQty} onChange={(e) => setOrderQty(Number(e.target.value) || 0)} />
        </label>
      </div>
      <div className="oc-field-row">
        <label className="oc-field">
          <span>List price (£)</span>
          <input className="oc-input" type="number" min={0} value={listPrice} onChange={(e) => setListPrice(Number(e.target.value) || 0)} />
        </label>
        <label className="oc-field">
          <span>Discount %</span>
          <input className="oc-input" type="number" min={0} max={100} value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value) || 0)} />
        </label>
      </div>

      <div className="oc-out-line">
        <span className="oc-mut">MOQ</span>
        <span className={'oc-chip ' + (r.meetsMoq ? 'verified' : 'awaiting')}>
          <span className="d" />
          {r.meetsMoq ? 'met' : `short ${r.shortfall}`}
        </span>
      </div>
      <div className="oc-out-line"><span className="oc-mut">Net price</span><span className="v">{money(r.netPrice)}</span></div>
      <div className="oc-out-line"><span className="oc-mut">Order cost</span><span className="v">{money(r.orderCost)}</span></div>
      <div className="oc-out-line"><span className="oc-mut">Revenue</span><span className="v">{money(r.revenue)}</span></div>
      <div className="oc-out-line"><span>Gross profit</span><span className="v" style={{ color: 'var(--green)' }}>{money(r.grossProfit)}</span></div>
      <div className="oc-out-line"><span className="oc-mut">Margin / markup</span><span className="v">{pct(r.marginPct)} · {pct(r.markupPct)}</span></div>
      <div className="oc-out-line"><span className="oc-mut">Margin given up by discount</span><span className="v" style={{ color: 'var(--amber)' }}>{money(r.marginGivenUp)}</span></div>
    </div>
  );
}
