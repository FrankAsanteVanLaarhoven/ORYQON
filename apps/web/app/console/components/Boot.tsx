'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const LINES: Array<[string, string]> = [
  ['control plane · authenticating operator', 'OK'],
  ['tenant context · RLS forced · fail-closed', 'OK'],
  ['policy bundle · commerce-policy-1.4.0 · immutable', 'OK'],
  ['tool broker · credential isolation verified', 'OK'],
  ['audit chain · digest continuity confirmed', 'OK'],
  ['realtime · streaming operational telemetry', 'OK'],
];

export default function Boot({ onEnter }: { onEnter: (sound: boolean) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const divs = Array.from(log.children);
    const tl = gsap.timeline();
    tl.to(divs, { opacity: 1, duration: 0.18, stagger: 0.14, ease: 'none' });
    return () => {
      tl.kill();
    };
  }, []);

  function exit(sound: boolean) {
    const root = rootRef.current;
    if (!root) {
      onEnter(sound);
      return;
    }
    gsap.to(root, { opacity: 0, duration: 0.5, ease: 'power2.out', onComplete: () => onEnter(sound) });
  }

  return (
    <div className="oc-boot" ref={rootRef}>
      <div className="k">ORYQON · Command Console</div>
      <h1>The operating system for commerce.</h1>
      <div className="log" ref={logRef}>
        {LINES.map((l, i) => (
          <div key={i}>
            › {l[0]} <span className="okk">[{l[1]}]</span>
          </div>
        ))}
      </div>
      <div className="actions">
        <button className="oc-cta oc-cta-p" type="button" onClick={() => exit(true)}>
          Enter with sound
        </button>
        <button className="oc-cta oc-cta-g" type="button" onClick={() => exit(false)}>
          Enter silently
        </button>
      </div>
    </div>
  );
}
