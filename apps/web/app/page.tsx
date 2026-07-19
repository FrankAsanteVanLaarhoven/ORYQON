import HeroBackdrop from './components/HeroBackdrop';

const FRAGMENTS = [
  'Products',
  'Storefronts',
  'Social channels',
  'Marketplaces',
  'Customers',
  'Subscriptions',
  'Analytics',
  'Approvals',
  'Rights',
  'Payments',
];

const PIPELINE = [
  ['01', 'Product', 'Verified record and evidence'],
  ['02', 'Offer', 'Price, licence, territory'],
  ['03', 'Campaign', 'Objective and hypothesis'],
  ['04', 'Verification', 'Claims, rights, policy'],
  ['05', 'Execution', 'Channels, within policy'],
  ['06', 'Revenue', 'Orders and receipts'],
  ['07', 'Learning', 'Attribution and next action'],
];

const AUTONOMY = [
  ['01', 'Observe', 'Ingest verified state across every channel.'],
  ['02', 'Draft', 'Propose bounded, typed actions — never execute.'],
  ['03', 'Approve', 'A human authorises within policy.'],
  ['04', 'Execute', 'Run inside policy limits, with a signed receipt.'],
  ['05', 'Escalate', 'Surface exceptions instead of guessing.'],
];

function Glyph() {
  return (
    <svg className="glyph" viewBox="0 0 64 64" aria-hidden="true">
      <circle
        cx="32"
        cy="32"
        r="20"
        fill="none"
        stroke="#8ad8ff"
        strokeOpacity="0.9"
        strokeWidth="3"
        strokeDasharray="90 16"
        strokeDashoffset="22"
      />
      <circle
        cx="32"
        cy="32"
        r="10"
        fill="none"
        stroke="#f4f5f2"
        strokeOpacity="0.55"
        strokeWidth="2"
      />
      <circle cx="32" cy="32" r="2.6" fill="#8ad8ff" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <a className="wordmark" href="/" aria-label="ORYQON home">
            <Glyph />
            <span>ORYQON</span>
          </a>
          <nav className="nav" aria-label="Primary">
            <a href="#operating-model">Platform</a>
            <a href="#fragmented">Solutions</a>
            <a href="#company">Company</a>
            <a className="demo" href="#request-demo">
              Request demo
            </a>
          </nav>
        </div>
      </header>

      {/* Hero ------------------------------------------------------------- */}
      <section className="hero">
        <HeroBackdrop />
        <div className="hero-veil" aria-hidden="true" />
        <div className="wrap">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="dot" aria-hidden="true" />
                Verified commercial execution
              </span>
              <h1 className="headline">
                The commercial internet.
                <br />
                <span className="quiet">Under one command layer.</span>
              </h1>
              <p className="subhead">
                Operate products, campaigns, channels, customers and revenue from
                one verified execution system — governed through evidence, policy
                and human approval.
              </p>
              <div className="cta-row">
                <a className="btn btn-primary" href="#request-demo">
                  Enter the platform
                </a>
                <a className="btn btn-ghost" href="#operating-model">
                  Watch system film
                </a>
              </div>
              <p className="trust-line">
                Execution verified by <strong>Origentra</strong>
              </p>
            </div>

            {/* Smoked-glass command panel */}
            <aside className="command-panel" aria-label="System status preview">
              <div className="panel-head">
                <span>System status</span>
                <span className="live">
                  <span className="dot" aria-hidden="true" />
                  Live
                </span>
              </div>
              <div className="panel-rows">
                <div className="panel-row">
                  <span className="label">Channels connected</span>
                  <span className="chip active">
                    <span className="dot" aria-hidden="true" />8 live
                  </span>
                </div>
                <div className="panel-row">
                  <span className="label">Execution reliability</span>
                  <span className="value">99.97%</span>
                </div>
                <div className="panel-row">
                  <span className="label">Approvals awaiting</span>
                  <span className="chip pending">
                    <span className="dot" aria-hidden="true" />3 queued
                  </span>
                </div>
                <div className="panel-row">
                  <span className="label">Product claims</span>
                  <span className="chip verified">
                    <span className="dot" aria-hidden="true" />
                    Evidence-backed
                  </span>
                </div>
                <div className="panel-row">
                  <span className="label">Last receipt</span>
                  <span className="value">21:42:18 UTC</span>
                </div>
              </div>
            </aside>
          </div>

          <div className="ticker" role="status">
            <span>
              <b>08</b> channels live
            </span>
            <span className="sep">·</span>
            <span>
              <b>99.97%</b> execution
            </span>
            <span className="sep">·</span>
            <span>
              <b>Verified</b> evidence &amp; approvals
            </span>
          </div>
        </div>
      </section>

      {/* The fragmented reality ------------------------------------------ */}
      <section className="section primary" id="fragmented">
        <div className="wrap">
          <p className="section-kicker">The fragmented reality</p>
          <h2 className="section-title">
            Commerce runs on disconnected systems.
          </h2>
          <p className="section-lede">
            Products, storefronts, channels, customers and payments each live in
            their own tool, with their own truth. Nothing verifies the others,
            and no one system can be held to account.
          </p>
          <div className="fragments">
            {FRAGMENTS.map((f) => (
              <div className="fragment" key={f}>
                {f}
              </div>
            ))}
          </div>
          <p className="converge">
            <span className="arrow" aria-hidden="true">
              ⟶
            </span>
            They converge into one command layer.
          </p>
        </div>
      </section>

      {/* The operating model --------------------------------------------- */}
      <section className="section" id="operating-model">
        <div className="wrap">
          <p className="section-kicker">The operating model</p>
          <h2 className="section-title">One verified path from product to revenue.</h2>
          <p className="section-lede">
            Every commercial action moves through the same governed sequence.
            Nothing publishes, prices or sells without evidence and approval.
          </p>
          <div className="pipeline">
            {PIPELINE.map(([n, name, desc]) => (
              <div className="stage" key={n}>
                <span className="n">{n}</span>
                <div className="name">{name}</div>
                <div className="desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bounded autonomy ------------------------------------------------- */}
      <section className="section primary" id="company">
        <div className="wrap">
          <p className="section-kicker">Bounded autonomy</p>
          <h2 className="section-title">ORYQON proposes. People authorise. Policy executes.</h2>
          <p className="section-lede">
            The intelligence never holds credentials and never executes. It drafts
            typed actions that a human approves and policy runs — each one leaving
            a signed, replayable receipt.
          </p>
          <div className="autonomy">
            {AUTONOMY.map(([idx, verb, note]) => (
              <div className="step" key={idx}>
                <span className="idx">{idx}</span>
                <div className="verb">{verb}</div>
                <div className="note">{note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing --------------------------------------------------------- */}
      <section className="section closing" id="request-demo">
        <div className="wrap">
          <p className="section-kicker">The thesis</p>
          <p className="statement">
            Commerce does not need more disconnected automation.{' '}
            <span className="quiet">It needs an operating system.</span>
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#request-demo">
              Request demo
            </a>
            <a className="btn btn-ghost" href="#operating-model">
              Read the architecture
            </a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="wrap">
          <span className="meta">© Frank Asante Van Laarhoven — ORYQON</span>
          <nav className="links" aria-label="Footer">
            <a href="#operating-model">Platform</a>
            <a href="#fragmented">Solutions</a>
            <a href="#company">Company</a>
            <a href="#request-demo">Request demo</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
