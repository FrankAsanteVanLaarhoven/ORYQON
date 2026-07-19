'use client';

import { useEffect, useRef } from 'react';
import type { KpiFormat, KpisBody } from '../lib/types';

function fmt(v: number, f: KpiFormat): string {
  if (f === 'money') return '£' + Math.round(v).toLocaleString('en-GB');
  if (f === 'pct2') return v.toFixed(2);
  return Math.round(v).toString();
}

export default function Kpis({ body }: { body: KpisBody }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const tiles = body.tiles.map((def, i) => {
      const spark: number[] = [];
      for (let k = 0; k < 40; k++) spark.push(0.5);
      return {
        def,
        numEl: root.querySelector<HTMLElement>(`[data-num="${i}"]`),
        cv: root.querySelector<HTMLCanvasElement>(`[data-cv="${i}"]`),
        spark,
        val: def.value,
        tgt: def.value,
      };
    });

    let seed = 0x51ed4c9b;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    let raf = 0;
    let last = 0;
    let acc = 0;
    const draw = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      acc += dt;
      for (const tl of tiles) {
        tl.val += (tl.tgt - tl.val) * Math.min(1, dt * 4);
        if (tl.numEl) tl.numEl.textContent = fmt(tl.val, tl.def.fmt);
      }
      if (acc > 0.7) {
        acc = 0;
        for (const tl of tiles) {
          if (tl.def.fmt === 'money') tl.tgt = tl.def.value + Math.round(rnd() * 700);
          tl.spark.push(0.25 + rnd() * 0.6);
          if (tl.spark.length > 40) tl.spark.shift();
        }
      }
      for (const tl of tiles) {
        const cv = tl.cv;
        if (!cv) continue;
        const w = cv.clientWidth || 150;
        const h = 30;
        if (cv.width !== Math.round(w * dpr)) {
          cv.width = w * dpr;
          cv.height = h * dpr;
          const c0 = cv.getContext('2d');
          if (c0) c0.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        const c = cv.getContext('2d');
        if (!c) continue;
        c.clearRect(0, 0, w, h);
        const arr = tl.spark;
        const n = arr.length;
        const min = Math.min(...arr);
        const max = Math.max(...arr);
        const rng = max - min || 1;
        c.beginPath();
        for (let i = 0; i < n; i++) {
          const x = (i / (n - 1)) * w;
          const y = h - 3 - ((arr[i] - min) / rng) * (h - 6);
          if (i === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        const accent = tl.def.accent;
        const down = tl.def.deltaDir === 'down';
        c.strokeStyle = accent ? '#8ad8ff' : down ? '#f1b85b' : '#7fb08a';
        c.lineWidth = 1.4;
        c.stroke();
        c.lineTo(w, h);
        c.lineTo(0, h);
        c.closePath();
        c.fillStyle = accent ? 'rgba(138,216,255,0.12)' : down ? 'rgba(241,184,91,0.1)' : 'rgba(127,176,138,0.1)';
        c.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [body.tiles]);

  return (
    <div className="oc-tiles" ref={rootRef}>
      {body.tiles.map((t, i) => (
        <div key={t.id} className={'oc-tile' + (t.accent ? ' accent' : '')}>
          <div className="lab">{t.label}</div>
          <div className="val">
            <span data-num={i}>{fmt(t.value, t.fmt)}</span>
            {t.unit ? <span className="u">{t.unit}</span> : null}
          </div>
          <div className="sub">
            <span className={t.deltaDir === 'up' ? 'up' : 'down'}>
              {t.deltaDir === 'up' ? '▲' : '▼'} {t.deltaLabel}
            </span>
          </div>
          <canvas data-cv={i} />
        </div>
      ))}
    </div>
  );
}
