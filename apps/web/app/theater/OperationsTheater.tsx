'use client';

import { useEffect } from 'react';
import { startTheater } from './engine.js';
import './theater.css';

export default function OperationsTheater() {
  useEffect(() => {
    const cleanup = startTheater();
    return cleanup;
  }, []);

  return (
    <div className="ot">
      <div className="stage">
        <canvas id="scene" aria-hidden="true" />
        <canvas id="overlay" aria-hidden="true" />
        <div className="vignette" />

        <div className="hud">
          <div className="hud-row">
            <div>
              <a className="wordmark" href="/" aria-label="ORYQON home">
                <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
                  <circle cx="32" cy="32" r="20" fill="none" stroke="#8ad8ff" strokeOpacity="0.9" strokeWidth="3" strokeDasharray="90 16" strokeDashoffset="22" />
                  <circle cx="32" cy="32" r="10" fill="none" stroke="#f4f5f2" strokeOpacity="0.55" strokeWidth="2" />
                  <circle cx="32" cy="32" r="2.6" fill="#8ad8ff" />
                </svg>
                <span className="name">ORYQON</span>
              </a>
              <div className="eyebrow">Global Operations · Command Layer</div>
            </div>
            <div className="status" id="status">
              <div className="clock" id="clock">--:--:-- UTC</div>
              <div className="state"><span className="dot" /><span id="stateText">System Nominal</span></div>
            </div>
          </div>

          <div className="hud-row" style={{ alignItems: 'flex-end' }}>
            <div className="readout" id="readout">
              <span className="metric"><span>Personnel</span><b id="mPersonnel">0</b></span>
              <span className="sep">·</span>
              <span className="metric cyan"><span>Autonomous</span><b id="mUnits">0</b></span>
              <span className="sep">·</span>
              <span className="metric"><span>Links</span><b id="mLinks">0</b></span>
              <span className="sep">·</span>
              <span className="metric"><span>Throughput</span><b id="mThru">0</b></span>
              <span className="sep">·</span>
              <span className="metric"><span>Scan</span><b id="mBearing">000°</b></span>
            </div>
            <div className="legend">
              <span><i className="mk person" />Personnel</span>
              <span><i className="mk unit" />Autonomous unit</span>
            </div>
          </div>
        </div>

        <div className="alert-banner" id="alertBanner">
          <span className="diamond" /><span id="alertText">Anomaly detected</span>
        </div>

        <a className="exit" href="/">Exit theater</a>

        <button className="sound-btn muted" id="soundBtn" type="button" aria-pressed="false" aria-label="Toggle sound">
          <span className="bars" aria-hidden="true"><i /><i /><i /><i /></span>
          <span id="soundLabel">Sound off</span>
        </button>

        <div className="start" id="start">
          <div className="kicker">ORYQON · Operations Theater</div>
          <h1>The commercial internet, <span className="q">under command.</span></h1>
          <p>A live global field — personnel and autonomous units coordinating in real time under a single verified command layer. Best experienced full-screen, with sound.</p>
          <div className="actions">
            <button className="cta cta-primary" id="enterSound" type="button">Enter with sound</button>
            <button className="cta cta-ghost" id="enterSilent" type="button">Enter silently</button>
          </div>
        </div>
      </div>
    </div>
  );
}
