'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Layout, PanelDef, Rect } from './types';

const LKEY = 'oryqon.console.layout.v1';
const PAD = 10;
const GAP = 12;

function loadAll(): Record<string, Layout> {
  try {
    return JSON.parse(sessionStorage.getItem(LKEY) || '{}') || {};
  } catch {
    return {};
  }
}
function saveAll(all: Record<string, Layout>): void {
  try {
    sessionStorage.setItem(LKEY, JSON.stringify(all));
  } catch {
    /* storage unavailable — layout is ephemeral anyway */
  }
}

/** Pack panels into a tidy 12-column default layout for the given canvas width. */
function packDefault(panels: PanelDef[], width: number): Layout {
  let unit = (width - PAD * 2 - GAP * 11) / 12;
  if (unit < 24) unit = 24;
  let col = 0;
  let rowY = PAD;
  let rowH = 0;
  const out: Layout = {};
  for (const p of panels) {
    const span = Math.max(1, Math.min(12, p.w));
    if (col + span > 12) {
      rowY += rowH + GAP;
      col = 0;
      rowH = 0;
    }
    out[p.id] = { x: PAD + col * (unit + GAP), y: rowY, w: span * unit + (span - 1) * GAP, h: p.h };
    col += span;
    rowH = Math.max(rowH, p.h);
  }
  return out;
}

function clampToWidth(r: Rect, width: number): Rect {
  const w = Math.min(r.w, Math.max(240, width - 20));
  let x = r.x;
  if (x + w > width) x = Math.max(0, width - w);
  if (x < 0) x = 0;
  return { x, y: Math.max(0, r.y), w, h: r.h };
}

export interface Workspace {
  rects: Layout;
  update: (id: string, rect: Rect, commit: boolean) => void;
  bringToFront: () => number;
  reset: () => void;
}

export function useWorkspace(
  sectionKey: string,
  panels: PanelDef[],
  containerRef: RefObject<HTMLDivElement | null>,
): Workspace {
  const [rects, setRects] = useState<Layout>({});
  const savedRef = useRef<Record<string, Layout> | null>(null);
  const zRef = useRef(20);

  const saved = useCallback((): Record<string, Layout> => {
    if (savedRef.current === null) savedRef.current = loadAll();
    return savedRef.current;
  }, []);

  const build = useCallback(() => {
    const el = containerRef.current;
    const width = el ? el.clientWidth : 1200;
    const def = packDefault(panels, width);
    const persisted = saved()[sectionKey] || {};
    const merged: Layout = {};
    for (const p of panels) {
      const s = persisted[p.id];
      merged[p.id] = s ? clampToWidth(s, width) : def[p.id];
    }
    setRects(merged);
  }, [sectionKey, panels, containerRef, saved]);

  useEffect(() => {
    build();
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(build);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [build, containerRef]);

  const update = useCallback(
    (id: string, rect: Rect, commit: boolean) => {
      setRects((r) => ({ ...r, [id]: rect }));
      if (commit) {
        const all = saved();
        if (!all[sectionKey]) all[sectionKey] = {};
        all[sectionKey][id] = rect;
        saveAll(all);
      }
    },
    [sectionKey, saved],
  );

  const bringToFront = useCallback(() => {
    zRef.current += 1;
    return zRef.current;
  }, []);

  const reset = useCallback(() => {
    const all = saved();
    delete all[sectionKey];
    saveAll(all);
    build();
  }, [sectionKey, saved, build]);

  return { rects, update, bringToFront, reset };
}
