'use client';

import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { PanelDef, Rect } from '../lib/types';

interface Props {
  def: PanelDef;
  rect: Rect | undefined;
  onChange: (id: string, rect: Rect, commit: boolean) => void;
  bringToFront: () => number;
  children: ReactNode;
}

const MIN_W = 240;
const MIN_H = 140;

export default function GlassPanel({ def, rect, onChange, bringToFront, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [z, setZ] = useState(1);

  if (!rect) return null;

  function startDrag(e: ReactPointerEvent) {
    if ((e.target as HTMLElement).closest('button, input, a, .oc-rz')) return;
    e.preventDefault();
    const el = ref.current;
    const base = rect as Rect;
    if (el) el.classList.add('dragging');
    setZ(bringToFront());
    const sx = e.clientX;
    const sy = e.clientY;
    const move = (ev: PointerEvent) => {
      onChange(def.id, {
        x: Math.max(0, base.x + (ev.clientX - sx)),
        y: Math.max(0, base.y + (ev.clientY - sy)),
        w: base.w,
        h: base.h,
      }, false);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (el) el.classList.remove('dragging');
      onChange(def.id, {
        x: Math.max(0, base.x + (ev.clientX - sx)),
        y: Math.max(0, base.y + (ev.clientY - sy)),
        w: base.w,
        h: base.h,
      }, true);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function startResize(e: ReactPointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const el = ref.current;
    const base = rect as Rect;
    if (el) el.classList.add('resizing');
    setZ(bringToFront());
    const sx = e.clientX;
    const sy = e.clientY;
    const move = (ev: PointerEvent) => {
      onChange(def.id, {
        x: base.x,
        y: base.y,
        w: Math.max(MIN_W, base.w + (ev.clientX - sx)),
        h: Math.max(MIN_H, base.h + (ev.clientY - sy)),
      }, false);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (el) el.classList.remove('resizing');
      onChange(def.id, {
        x: base.x,
        y: base.y,
        w: Math.max(MIN_W, base.w + (ev.clientX - sx)),
        h: Math.max(MIN_H, base.h + (ev.clientY - sy)),
      }, true);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  return (
    <section
      ref={ref}
      className="oc-panel"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: z }}
    >
      <div className="oc-ph" onPointerDown={startDrag}>
        <span className="live-dot" />
        <span className="t">{def.title}</span>
        {def.meta ? <span className="meta">{def.meta}</span> : null}
      </div>
      <div className="oc-pb">{children}</div>
      <span className="oc-rz" onPointerDown={startResize} aria-hidden="true" />
    </section>
  );
}
