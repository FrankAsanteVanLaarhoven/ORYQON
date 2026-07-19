'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { SectionDef } from '../lib/types';
import { useWorkspace } from '../lib/useWorkspace';
import GlassPanel from './GlassPanel';
import PanelContent from './PanelContent';

export default function Workspace({ section, resetNonce }: { section: SectionDef; resetNonce: number }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { rects, update, bringToFront, reset } = useWorkspace(section.key, section.panels, canvasRef);

  // Fire reset only when the topbar bumps resetNonce (not on section change).
  const resetRef = useRef(reset);
  resetRef.current = reset;
  const firstReset = useRef(true);
  useEffect(() => {
    if (firstReset.current) {
      firstReset.current = false;
      return;
    }
    resetRef.current();
  }, [resetNonce]);

  const contentHeight = useMemo(() => {
    let max = 0;
    for (const id in rects) {
      const r = rects[id];
      if (r.y + r.h > max) max = r.y + r.h;
    }
    return max + 10;
  }, [rects]);

  return (
    <div className="oc-canvas" ref={canvasRef} style={{ height: contentHeight > 10 ? contentHeight : undefined }}>
      {section.panels.map((p) => (
        <GlassPanel key={p.id} def={p} rect={rects[p.id]} onChange={update} bringToFront={bringToFront}>
          <PanelContent body={p.body} />
        </GlassPanel>
      ))}
    </div>
  );
}
