'use client';

import { SECTIONS } from '../lib/sections';

export default function Rail({ active, onSelect }: { active: string; onSelect: (key: string) => void }) {
  return (
    <aside className="oc-rail">
      <div className="oc-brand">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="20" fill="none" stroke="#8ad8ff" strokeOpacity="0.9" strokeWidth="3" strokeDasharray="90 16" strokeDashoffset="22" />
          <circle cx="32" cy="32" r="10" fill="none" stroke="#f4f5f2" strokeOpacity="0.55" strokeWidth="2" />
          <circle cx="32" cy="32" r="2.6" fill="#8ad8ff" />
        </svg>
        <span className="n">ORYQON</span>
      </div>
      <div className="oc-tenant">
        Tenant · Workspace<b>Lacoupe Futur · Prod</b>
      </div>
      <nav className="oc-nav">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={s.key === active ? 'active' : undefined}
            onClick={() => onSelect(s.key)}
            title={s.title}
          >
            <span className="ic" />
            {s.title}
          </button>
        ))}
      </nav>
      <div className="oc-rail-foot">
        Control plane
        <div className="ks">
          <span>Tenant isolation</span>
          <span className="badge">RLS · forced</span>
        </div>
        <div className="ks">
          <span>Emergency stop</span>
          <span className="badge">Disengaged</span>
        </div>
      </div>
    </aside>
  );
}
