'use client';

import { useEffect } from 'react';
import { startConsole } from './engine.js';
import { CONSOLE_SHELL } from './shell';
import './console.css';

export default function OperationsConsole() {
  useEffect(() => {
    const cleanup = startConsole();
    return cleanup;
  }, []);

  return (
    <div className="oc">
      <div dangerouslySetInnerHTML={{ __html: CONSOLE_SHELL }} />
      <a className="oc-exit" href="/">↩ Exit to site</a>
    </div>
  );
}
