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

const CONSOLE_NAV = [
  'Command',
  'Operations',
  'Products',
  'Campaigns',
  'Channels',
  'Customers',
  'Evidence',
  'System',
];

const TOPOLOGY = [
  ['Shopify', 'Orders'],
  ['Product', 'Passport'],
  ['Instagram', 'Content'],
];

const ACTIVE_OPS: Array<[string, string, string]> = [
  ['42', 'Executing within policy', 'active'],
  ['11', 'Monitoring outcomes', 'active'],
  ['6', 'Awaiting verified data', 'pending'],
];

const EXCEPTIONS: Array<[string, string, string]> = [
  ['3', 'Approvals awaiting a human', 'pending'],
  ['1', 'Degraded connector', 'warning'],
  ['2', 'Claim conflicts', 'critical'],
];

const CLAIMS: Array<[string, string]> = [
  ['Waterproof to 10,000 mm', 'LAB · LR-0912'],
  ['78% recycled shell', 'CERT · SC-334'],
  ['Ships carbon-neutral', 'AUDIT · CN-118'],
];

const CHANNELS = [
  'Shopify',
  'Instagram',
  'YouTube',
  'LinkedIn',
  'Pinterest',
  'Email',
  'Digital delivery',
];

const ENTERPRISE: Array<[string, string, string]> = [
  ['Deployment', 'Private cloud', 'Dedicated, isolated environments per organisation.'],
  ['Data', 'Data residency', 'Pin storage and processing to permitted regions.'],
  ['Identity', 'SSO — OIDC & SAML', 'Federate existing enterprise identity; step-up for privileged actions.'],
  ['Encryption', 'Customer-managed keys', 'Envelope encryption with a root key you control.'],
  ['Audit', 'Evidence export', 'Immutable, signed receipts and full audit export.'],
  ['Access', 'Role-based control', 'Granular scopes, service accounts, break-glass admin.'],
  ['Scale', 'Multi-brand environments', 'Many brands and workspaces under one command layer.'],
  ['Extend', 'API & SDK access', 'Programmatic control behind the same policy and audit.'],
];

const AUTONOMY: Array<[string, string, string]> = [
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
            <a href="#command-centre">Console</a>
            <a href="#enterprise">Enterprise</a>
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
                <a className="btn btn-ghost" href="/theater">
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

      {/* Live Command Centre — forensic console -------------------------- */}
      <section className="section primary" id="command-centre">
        <div className="wrap">
          <p className="section-kicker">Live Command Centre</p>
          <h2 className="section-title">Cinematic outside. Forensic inside.</h2>
          <p className="section-lede">
            The console is the opposite of the hero: solid surfaces, dense
            controlled data, precise status and explicit freshness. Every object
            is connected to the decisions and actions it drives.
          </p>

          <div className="console" role="img" aria-label="ORYQON command centre preview">
            <nav className="console-nav" aria-hidden="true">
              <div className="brandline">ORYQON</div>
              {CONSOLE_NAV.map((item, i) => (
                <a
                  href="#command-centre"
                  key={item}
                  className={i === 0 ? 'active' : undefined}
                >
                  {item}
                </a>
              ))}
            </nav>

            <div className="console-main">
              <div className="console-topbar">
                <span>System status</span>
                <span className="clock">21:42:18 UTC</span>
              </div>

              <div className="topology">
                {TOPOLOGY.map(([t, s], i) => (
                  <div key={t} style={{ display: 'contents' }}>
                    <div className="topo-node">
                      <div className="t">{t}</div>
                      <div className="s">{s}</div>
                    </div>
                    {i < TOPOLOGY.length - 1 && (
                      <span className="topo-link" aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>

              <div className="console-panels">
                <div className="console-panel">
                  <h4>Active operations</h4>
                  {ACTIVE_OPS.map(([count, label, status]) => (
                    <div className="op-row" key={label}>
                      <span className="count">{count}</span>
                      <span className="label">{label}</span>
                      <span className={`dot ${status}`} aria-hidden="true" />
                    </div>
                  ))}
                </div>
                <div className="console-panel">
                  <h4>Exceptions</h4>
                  {EXCEPTIONS.map(([count, label, status]) => (
                    <div className="op-row" key={label}>
                      <span className="count">{count}</span>
                      <span className="label">{label}</span>
                      <span className={`dot ${status}`} aria-hidden="true" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Passport ------------------------------------------------ */}
      <section className="section" id="product-passport">
        <div className="wrap">
          <p className="section-kicker">Product Passport</p>
          <h2 className="section-title">One verified record controls every channel.</h2>
          <p className="section-lede">
            A single passport binds each claim to its evidence and rights. Every
            channel representation is compiled from it — so what you publish can
            always be traced back to what is true.
          </p>

          <div className="passport">
            <div className="passport-head">
              <div>
                <div className="name">Field Shell — All-Weather</div>
                <div className="sku">SKU · ORQ-4821 — version 7</div>
              </div>
              <span className="chip verified">
                <span className="dot" aria-hidden="true" />
                Verified
              </span>
            </div>
            <div className="passport-body">
              <div className="passport-row">
                <div className="k">Claims &amp; evidence</div>
                {CLAIMS.map(([claim, ev]) => (
                  <div className="claim" key={claim}>
                    <span>{claim}</span>
                    <span className="ev">{ev}</span>
                  </div>
                ))}
              </div>
              <div className="passport-row">
                <div className="k">Rights</div>
                <div className="claim">
                  <span>Imagery &amp; copy cleared for paid and organic use</span>
                  <span className="ev">RIGHTS · OK</span>
                </div>
              </div>
              <div className="passport-row">
                <div className="k">Channel eligibility</div>
                <div className="channel-chips">
                  {CHANNELS.map((c) => (
                    <span className="channel-chip" key={c}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bounded autonomy ------------------------------------------------- */}
      <section className="section primary" id="bounded-autonomy">
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

      {/* Enterprise deployment ------------------------------------------- */}
      <section className="section" id="enterprise">
        <div className="wrap">
          <p className="section-kicker">Enterprise deployment</p>
          <h2 className="section-title">Built for organisations that must be able to prove it.</h2>
          <p className="section-lede">
            Residency, identity, encryption, audit and access — the controls an
            enterprise needs before it puts real revenue behind an operating
            system.
          </p>
          <div className="enterprise-grid">
            {ENTERPRISE.map(([badge, title, desc]) => (
              <div className="ent-tile" key={title}>
                <span className="badge">{badge}</span>
                <div className="t">{title}</div>
                <div className="d">{desc}</div>
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
            <a href="#command-centre">Console</a>
            <a href="#enterprise">Enterprise</a>
            <a href="#request-demo">Request demo</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
