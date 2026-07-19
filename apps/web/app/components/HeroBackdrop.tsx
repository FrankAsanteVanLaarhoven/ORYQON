'use client';

import { useEffect, useRef } from 'react';

/**
 * A deterministic, code-drawn "commercial network" backdrop.
 *
 * No stock footage, no external assets, no synthetic video. A seeded set of
 * nodes with faint connective edges and a handful of slow optical-cyan signal
 * pulses. Honours prefers-reduced-motion by rendering a single static frame.
 */
export default function HeroBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    // Deterministic PRNG — stable layout every load, no Math.random.
    let seed = 0x9e3779b9;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    const NODE_COUNT = 52;
    // Nodes in normalised [0,1] space, weighted toward the right so the left
    // stays clear for the headline.
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: 0.18 + rand() * 0.86,
      y: 0.08 + rand() * 0.86,
      r: 0.6 + rand() * 1.6,
    }));

    // Edges between nearby nodes (computed once in normalised space).
    const edges: Array<[number, number, number]> = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d = Math.hypot(dx, dy);
        if (d < 0.17) edges.push([i, j, d]);
      }
    }

    // Signal pulses travelling along a subset of edges.
    const pulses = Array.from({ length: 10 }, () => ({
      edge: Math.floor(rand() * edges.length),
      t: rand(),
      speed: 0.0016 + rand() * 0.0032,
    }));

    let width = 0;
    let height = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const px = (n: number) => n * width;
    const py = (n: number) => n * height;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Edges
      for (const [a, b, d] of edges) {
        const alpha = 0.05 + (0.17 - d) * 0.5;
        ctx.beginPath();
        ctx.moveTo(px(nodes[a].x), py(nodes[a].y));
        ctx.lineTo(px(nodes[b].x), py(nodes[b].y));
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(alpha, 0.14)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Nodes
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(px(n.x), py(n.y), n.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(244,245,242,0.5)';
        ctx.fill();
      }

      // Signal pulses (optical cyan)
      for (const p of pulses) {
        const e = edges[p.edge];
        if (!e) continue;
        const [a, b] = e;
        const x = px(nodes[a].x + (nodes[b].x - nodes[a].x) * p.t);
        const y = py(nodes[a].y + (nodes[b].y - nodes[a].y) * p.t);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 6);
        g.addColorStop(0, 'rgba(138,216,255,0.95)');
        g.addColorStop(1, 'rgba(138,216,255,0)');
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
    };

    const tick = () => {
      for (const p of pulses) {
        p.t += p.speed;
        if (p.t >= 1) {
          p.t = 0;
          p.edge = (p.edge + 7) % edges.length;
        }
      }
      draw();
      raf = window.requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('resize', resize);

    if (reduceMotion) {
      draw(); // single static frame
    } else {
      raf = window.requestAnimationFrame(tick);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-backdrop" aria-hidden="true" />;
}
