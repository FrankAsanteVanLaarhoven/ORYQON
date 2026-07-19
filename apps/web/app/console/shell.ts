export const CONSOLE_SHELL = `<div class="app">
  <aside class="rail">
    <div class="brand">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="20" fill="none" stroke="#8ad8ff" stroke-opacity="0.9" stroke-width="3" stroke-dasharray="90 16" stroke-dashoffset="22"></circle>
        <circle cx="32" cy="32" r="10" fill="none" stroke="#f4f5f2" stroke-opacity="0.55" stroke-width="2"></circle>
        <circle cx="32" cy="32" r="2.6" fill="#8ad8ff"></circle>
      </svg>
      <span class="n">ORYQON</span>
    </div>
    <div class="tenant">Tenant · Workspace<b>Lacoupe Futur · Prod</b></div>
    <nav class="nav" id="nav"></nav>
    <div class="rail-foot">
      Control plane
      <div class="ks"><span>Tenant isolation</span><span class="badge">RLS · forced</span></div>
      <div class="ks"><span>Emergency stop</span><span class="badge" id="killState">Disengaged</span></div>
    </div>
  </aside>

  <div class="main">
    <header class="topbar">
      <span class="env">PROD · EU-WEST</span>
      <span class="crumb">Command · <b>Operations</b></span>
      <span class="spacer"></span>
      <span class="live"><span class="d"></span>Live · &lt;5s</span>
      <span class="clock" id="clock">--:--:-- UTC</span>
      <span class="op">Operator <b>F. Van Laarhoven</b> · Platform Admin</span>
    </header>

    <div class="board">
      <div class="tiles" id="tiles"></div>

      <div class="grid">
        <section class="panel c3">
          <div class="ph"><span class="live-dot"></span><span class="t">System Integrity</span></div>
          <div class="pb">
            <div class="gauge-wrap">
              <canvas id="gauge" width="104" height="104"></canvas>
              <div class="gauge-info">
                <div class="gv" id="gaugeVal">0.0<span style="font-size:14px">%</span></div>
                <div class="gl">Composite health</div>
                <div class="gr" id="gaugeSub">all systems nominal</div>
              </div>
            </div>
            <canvas id="wave" width="600" height="92"></canvas>
          </div>
        </section>

        <section class="panel c5">
          <div class="ph"><span class="live-dot"></span><span class="t">Commercial Topology</span><span class="meta" id="topoMeta">8 connected</span></div>
          <div class="pb"><div class="topo" id="topo"></div></div>
        </section>

        <section class="panel c4">
          <div class="ph"><span class="live-dot"></span><span class="t">Action Proposals · Lifecycle</span></div>
          <div class="pb"><div class="life" id="life"></div></div>
        </section>

        <section class="panel c4">
          <div class="ph"><span class="live-dot"></span><span class="t">Active Operations</span><span class="meta" id="opsMeta"></span></div>
          <div class="pb"><div class="rows" id="ops"></div></div>
        </section>

        <section class="panel c8">
          <div class="ph"><span class="live-dot"></span><span class="t">Approvals Queue</span><span class="meta">human authorization · policy-gated</span></div>
          <div class="pb"><div class="rows" id="approvals"></div></div>
        </section>

        <section class="panel c7">
          <div class="ph"><span class="live-dot"></span><span class="t">Policy Decision Stream</span><span class="meta">default-deny · commerce-policy-1.4.0</span></div>
          <div class="pb"><div class="stream" id="policy"></div></div>
        </section>

        <section class="panel c5">
          <div class="ph"><span class="live-dot"></span><span class="t">Channel Health</span></div>
          <div class="pb"><div class="rows" id="channels"></div></div>
        </section>

        <section class="panel c5">
          <div class="ph"><span class="live-dot"></span><span class="t">Evidence &amp; Claims</span></div>
          <div class="pb"><div class="rows" id="evidence"></div></div>
        </section>

        <section class="panel c7">
          <div class="ph"><span class="live-dot"></span><span class="t">Tool Broker · Agent Runs</span><span class="meta">credential never leaves the broker</span></div>
          <div class="pb"><div class="stream" id="broker"></div></div>
        </section>

        <section class="panel c12">
          <div class="ph"><span class="live-dot"></span><span class="t">Audit Stream · Hash-Chained</span>
            <span class="meta" style="margin-left:auto"></span>
            <div class="scrub" style="margin-left:auto; min-width:340px">
              <span class="lbl">Decision replay</span>
              <input type="range" id="scrub" min="0" max="100" value="100" aria-label="Temporal decision replay">
              <span class="lbl now" id="scrubNow">live</span>
            </div>
          </div>
          <div class="pb"><div class="stream" id="audit"></div></div>
        </section>
      </div>
    </div>
  </div>
</div>

<div class="scan" aria-hidden="true"></div>

<button class="sound-btn muted" id="soundBtn" type="button" aria-pressed="false" aria-label="Toggle sound">
  <span class="bars" aria-hidden="true"><i></i><i></i><i></i></span><span id="soundLabel">Sound off</span>
</button>

<div class="boot" id="boot">
  <div class="k">ORYQON · Command Console</div>
  <h1>The operating system for commerce.</h1>
  <div class="log" id="bootlog"></div>
  <div class="actions">
    <button class="cta cta-p" id="enterSound" type="button">Enter with sound</button>
    <button class="cta cta-g" id="enterSilent" type="button">Enter silently</button>
  </div>
</div>`;
