'use client';

import './console.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import Rail from './components/Rail';
import Topbar from './components/Topbar';
import Workspace from './components/Workspace';
import GlassWipe from './components/GlassWipe';
import Boot from './components/Boot';
import { sectionByKey } from './lib/sections';

function two(n: number): string {
  return String(n).padStart(2, '0');
}

const COMMAND = sectionByKey('command')!;

export default function OperationsConsole() {
  const [activeKey, setActiveKey] = useState('command');
  const [displayKey, setDisplayKey] = useState('command');
  const [wipe, setWipe] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [booted, setBooted] = useState(false);
  const [clock, setClock] = useState('--:--:-- UTC');
  const [resetNonce, setResetNonce] = useState(0);
  const reduceRef = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    reduceRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = () => {
      const d = new Date();
      setClock(`${two(d.getUTCHours())}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())} UTC`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    const scheduled = timers.current;
    return () => {
      window.clearInterval(id);
      scheduled.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const select = useCallback(
    (key: string) => {
      setActiveKey(key);
      if (key === displayKey) return;
      if (reduceRef.current) {
        setDisplayKey(key);
        return;
      }
      setWipe(true);
      timers.current.push(window.setTimeout(() => setDisplayKey(key), 190));
      timers.current.push(window.setTimeout(() => setWipe(false), 520));
    },
    [displayKey],
  );

  const section = sectionByKey(displayKey) ?? COMMAND;
  const title = sectionByKey(activeKey)?.title ?? 'Command';

  return (
    <div className={'oc' + (collapsed ? ' rail-min' : '')}>
      <Rail active={activeKey} onSelect={select} />
      <div className="oc-main">
        <Topbar
          title={title}
          clock={clock}
          onToggleRail={() => setCollapsed((c) => !c)}
          onReset={() => setResetNonce((n) => n + 1)}
        />
        <div className="oc-stage">
          <Workspace key={displayKey} section={section} resetNonce={resetNonce} />
        </div>
      </div>
      <div className="oc-scan" aria-hidden="true" />
      <GlassWipe show={wipe} />
      <a className="oc-exit" href="/">
        ↩ Exit to site
      </a>
      {booted ? null : <Boot onEnter={() => setBooted(true)} />}
    </div>
  );
}
