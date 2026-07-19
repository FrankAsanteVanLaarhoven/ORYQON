import type { Cell, PanelBody } from '../lib/types';
import Kpis from './Kpis';
import Gauge from './Gauge';
import Stream from './Stream';
import ThreePanel from './ThreePanel';

function CellView({ cell }: { cell: Cell }) {
  switch (cell.t) {
    case 'text':
      return <span>{cell.v}</span>;
    case 'mut':
      return <span className="oc-mut">{cell.v}</span>;
    case 'num':
      return <span className="oc-num" style={{ textAlign: 'right' }}>{cell.v}</span>;
    case 'chip':
      return (
        <span className={'oc-chip ' + cell.tone}>
          <span className="d" />
          {cell.v}
        </span>
      );
    case 'quota':
      return (
        <span className="oc-quota">
          <i className={cell.warn ? 'warn' : undefined} style={{ width: cell.pct + '%' }} />
        </span>
      );
  }
}

export default function PanelContent({ body }: { body: PanelBody }) {
  switch (body.kind) {
    case 'kpis':
      return <Kpis body={body} />;
    case 'gauge':
      return <Gauge body={body} />;
    case 'three':
      return <ThreePanel />;
    case 'stream':
      return <Stream body={body} />;
    case 'quotas':
      return (
        <div className="oc-rows">
          {body.rows.map((r, i) => (
            <div className="oc-row" key={i} style={{ gridTemplateColumns: '150px 1fr 64px' }}>
              <span>{r.label}</span>
              <span className="oc-quota">
                <i className={r.warn ? 'warn' : undefined} style={{ width: r.pct + '%' }} />
              </span>
              <span className="oc-num" style={{ textAlign: 'right' }}>{r.value}</span>
            </div>
          ))}
        </div>
      );
    case 'rows':
      return (
        <div className="oc-rows">
          {body.rows.map((row, i) => (
            <div className="oc-row" key={i} style={{ gridTemplateColumns: body.cols }}>
              {row.map((cell, j) => (
                <CellView cell={cell} key={j} />
              ))}
            </div>
          ))}
        </div>
      );
  }
}
