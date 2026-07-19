'use client';

import { FX_SIGNALS } from '../../lib/finance/data';
import { modeledFx } from '../../lib/finance/adapters';
import { signedPct } from '../../lib/finance/format';

const REC_TONE: Record<string, string> = {
  order: 'verified',
  hold: 'nominal',
  watch: 'awaiting',
};

export default function FxRatesPanel() {
  return (
    <div className="oc-tool">
      <div className="oc-rows">
        {FX_SIGNALS.map((s) => {
          const r = modeledFx.rate('GBP', s.code);
          return (
            <div className="oc-row" key={s.code} style={{ gridTemplateColumns: '52px 1fr auto auto' }}>
              <span className="oc-num">{s.code}</span>
              <span className="oc-mut" title={s.note}>{s.note}</span>
              <span className="oc-num" style={{ color: s.trend30dPct < 0 ? 'var(--green)' : 'var(--amber)' }}>
                {signedPct(s.trend30dPct)}
              </span>
              <span className={'oc-chip ' + (REC_TONE[s.recommend] ?? 'nominal')}>
                <span className="d" />
                {s.recommend}
              </span>
            </div>
          );
        })}
      </div>
      <span className="oc-badge-modeled">
        modeled rates · base GBP · {modeledFx.asOf()} · &ldquo;order&rdquo; = favourable buy window · live adapter ready
      </span>
    </div>
  );
}
