'use client';

import { useEffect, useRef } from 'react';
import type { GaugeBody } from '../lib/types';

export default function Gauge({ body }: { body: GaugeBody }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const valRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cv = cvRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = 104 * dpr;
    cv.height = 104 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let cur = 90;
    const tgt = body.value;
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      cur += (tgt - cur) * Math.min(1, dt * 2);
      ctx.clearRect(0, 0, 104, 104);
      const cx = 52, cy = 52, r = 42;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 7;
      ctx.stroke();
      const frac = cur / 100;
      const a0 = -Math.PI / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a0 + frac * Math.PI * 2);
      ctx.strokeStyle = cur > 99 ? '#7fb08a' : cur > 97 ? '#8ad8ff' : '#f1b85b';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r - 11, a0, a0 + frac * Math.PI * 2);
      ctx.strokeStyle = 'rgba(138,216,255,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (valRef.current) valRef.current.textContent = cur.toFixed(1) + '%';
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [body.value]);

  return (
    <div className="oc-gauge-wrap">
      <canvas ref={cvRef} width={104} height={104} style={{ width: 104, height: 104, flex: 'none' }} />
      <div className="oc-gauge-info">
        <div className="gv" ref={valRef}>0.0%</div>
        <div className="gl">{body.label}</div>
        <div className="gr">{body.sub}</div>
      </div>
    </div>
  );
}
