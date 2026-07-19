'use client';

interface Props {
  title: string;
  clock: string;
  onToggleRail: () => void;
  onReset: () => void;
}

export default function Topbar({ title, clock, onToggleRail, onReset }: Props) {
  return (
    <header className="oc-topbar">
      <button className="oc-iconbtn" type="button" onClick={onToggleRail} aria-label="Toggle sidebar" title="Collapse sidebar">
        ≡
      </button>
      <span className="env">PROD · EU-WEST</span>
      <span className="crumb">
        Console · <b>{title}</b>
      </span>
      <span className="spacer" />
      <button className="oc-btn-mini" type="button" onClick={onReset} title="Reset this workspace layout">
        Reset layout
      </button>
      <span className="live">
        <span className="d" />
        Live · &lt;5s
      </span>
      <span className="clock">{clock}</span>
      <span className="op">
        Operator <b>F. Van Laarhoven</b> · Platform Admin
      </span>
    </header>
  );
}
