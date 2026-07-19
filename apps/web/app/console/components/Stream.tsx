'use client';

import { useEffect, useState } from 'react';
import type { StreamBody, StreamLine, Tone } from '../lib/types';

const ACTORS = ['agent.copy', 'agent.channel-compiler', 'ops.pricing', 'agent.evidence', 'agent.offer', 'ops.support'];
const ACTIONS: Array<[string, Tone]> = [
  ['compile channel variant · low risk allowed', 'allow'],
  ['price change · high risk requires review', 'review'],
  ['activate offer · publish without evidence', 'deny'],
  ['import product · low risk allowed', 'allow'],
];

function two(n: number): string {
  return String(n).padStart(2, '0');
}

export default function Stream({ body }: { body: StreamBody }) {
  const [lines, setLines] = useState<StreamLine[]>(body.seed);

  useEffect(() => {
    if (!body.live) return;
    let seed = 0x2f1a77c3;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const id = window.setInterval(() => {
      const d = new Date();
      const ts = `${two(d.getUTCHours())}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())}`;
      const action = ACTIONS[Math.floor(rnd() * ACTIONS.length)];
      const actor = ACTORS[Math.floor(rnd() * ACTORS.length)];
      const code = 'ORQ-' + Math.floor(rnd() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
      setLines((prev) => [{ ts, actor, text: action[0], tone: action[1], code }, ...prev].slice(0, 8));
    }, 1600);
    return () => window.clearInterval(id);
  }, [body.live]);

  return (
    <div className="oc-stream">
      {lines.map((l, i) => (
        <div className="ln" key={l.code + '-' + i} style={{ gridTemplateColumns: body.cols }}>
          <span className="ts">{l.ts}</span>
          <span className="oc-mut">{l.actor}</span>
          <span>{l.text}</span>
          <span className={'oc-chip ' + l.tone}>
            <span className="d" />
            {l.code}
          </span>
        </div>
      ))}
    </div>
  );
}
