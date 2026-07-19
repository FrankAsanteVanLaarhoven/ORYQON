import type { Cell, SectionDef, StreamLine, Tone } from './types';

/* cell constructors */
const T = (v: string): Cell => ({ t: 'text', v });
const M = (v: string): Cell => ({ t: 'mut', v });
const N = (v: string): Cell => ({ t: 'num', v });
const C = (tone: Tone, v: string): Cell => ({ t: 'chip', tone, v });
const Q = (pct: number, warn?: boolean): Cell => ({ t: 'quota', pct, warn });

const seedPolicy: StreamLine[] = [
  { ts: '14:22:07', actor: 'agent.copy', text: 'publish content · publish without evidence', tone: 'deny', code: 'ORQ-9F2A' },
  { ts: '14:22:05', actor: 'agent.channel-compiler', text: 'compile channel variant · low risk allowed', tone: 'allow', code: 'ORQ-71C4' },
  { ts: '14:22:02', actor: 'ops.pricing', text: 'price change · high risk requires review', tone: 'review', code: 'ORQ-33B8' },
  { ts: '14:21:58', actor: 'agent.offer', text: 'activate offer · default deny', tone: 'deny', code: 'ORQ-1D40' },
];
const seedBroker: StreamLine[] = [
  { ts: '14:22:06', actor: 'agent.copy', text: 'shopify.publish', tone: 'ok', code: 'broker ok' },
  { ts: '14:22:03', actor: 'agent.offer', text: 'offer.price.write', tone: 'deny', code: 'approval required' },
  { ts: '14:21:59', actor: 'agent.evidence', text: 'evidence.fetch', tone: 'ok', code: 'broker ok' },
];
const seedAudit: StreamLine[] = [
  { ts: '14:22:07', actor: 'agent.copy', text: 'content published', tone: 'verified', code: '4f9a → 9b21' },
  { ts: '14:22:01', actor: 'agent.evidence', text: 'evidence validated', tone: 'verified', code: '1c8e → 4f9a' },
  { ts: '14:21:55', actor: 'ops.pricing', text: 'receipt signed', tone: 'verified', code: '77aa → 1c8e' },
];

export const SECTIONS: SectionDef[] = [
  {
    key: 'command',
    title: 'Command',
    panels: [
      {
        id: 'kpi', title: 'Performance · KPIs', w: 12, h: 148,
        body: {
          kind: 'kpis',
          tiles: [
            { id: 'rev', label: 'Revenue · today', value: 128450, fmt: 'money', deltaDir: 'up', deltaLabel: '+3.2%' },
            { id: 'rel', label: 'Execution reliability', value: 99.94, unit: '%', fmt: 'pct2', deltaDir: 'up', deltaLabel: 'nominal' },
            { id: 'dec', label: 'Decisions · per min', value: 52, fmt: 'int', accent: true, deltaDir: 'up', deltaLabel: 'live' },
            { id: 'apr', label: 'Approvals awaiting', value: 5, fmt: 'int', deltaDir: 'down', deltaLabel: 'triaging' },
            { id: 'units', label: 'Autonomous units', value: 24, fmt: 'int', accent: true, deltaDir: 'up', deltaLabel: 'active' },
          ],
        },
      },
      { id: 'integrity', title: 'System Integrity', w: 4, h: 232, body: { kind: 'gauge', value: 99.2, label: 'Composite health', sub: 'all systems nominal' } },
      { id: 'topology', title: 'Commercial Topology', meta: '8 connected', w: 4, h: 232, body: { kind: 'three' } },
      {
        id: 'lifecycle', title: 'Action Proposals · Lifecycle', w: 4, h: 232,
        body: { kind: 'quotas', rows: [
          { label: 'Proposed', pct: 72, value: '34' },
          { label: 'Review', pct: 24, value: '8' },
          { label: 'Authorised', pct: 18, value: '6' },
          { label: 'Executing', pct: 34, value: '11' },
          { label: 'Executed · 24h', pct: 96, value: '1,204' },
        ] },
      },
      {
        id: 'ops', title: 'Active Operations', meta: '11 in flight', w: 4, h: 210,
        body: { kind: 'rows', cols: '1fr auto auto', rows: [
          [T('Executing within policy'), N('42'), C('executing', 'exec')],
          [T('Monitoring outcomes'), N('12'), C('cyan', 'watch')],
          [T('Awaiting verified data'), N('6'), C('awaiting', 'hold')],
          [T('Compiling channel variants'), N('5'), C('cyan', 'build')],
        ] },
      },
      {
        id: 'approvals', title: 'Approvals Queue', meta: 'human authorization · policy-gated', w: 8, h: 232,
        body: { kind: 'rows', cols: '92px 1fr auto auto auto', rows: [
          [{ t: 'mut', v: 'ORQ-4471' }, T('price change'), C('stepup', 'step-up'), M('92s'), C('awaiting', 'await')],
          [{ t: 'mut', v: 'ORQ-3902' }, T('refund issue'), C('cyan', 'AAL-1'), M('140s'), C('awaiting', 'await')],
          [{ t: 'mut', v: 'ORQ-5514' }, T('entitlement grant'), C('stepup', 'step-up'), M('61s'), C('awaiting', 'await')],
          [{ t: 'mut', v: 'ORQ-6120' }, T('activate offer'), C('cyan', 'AAL-1'), M('178s'), C('awaiting', 'await')],
        ] },
      },
      { id: 'policy', title: 'Policy Decision Stream', meta: 'default-deny · commerce-policy-1.4.0', w: 7, h: 250, body: { kind: 'stream', cols: '68px 132px 1fr auto', seed: seedPolicy, live: true } },
      {
        id: 'channels', title: 'Channel Health', w: 5, h: 220,
        body: { kind: 'rows', cols: '1fr auto auto 84px', rows: [
          [T('Shopify'), C('nominal', 'ok'), M('24ms'), Q(72)],
          [T('Instagram'), C('nominal', 'ok'), M('38ms'), Q(58)],
          [T('YouTube'), C('nominal', 'ok'), M('44ms'), Q(61)],
          [T('Email'), C('degraded', 'deg'), M('80ms'), Q(88, true)],
          [T('Marketplace'), C('nominal', 'ok'), M('31ms'), Q(74)],
        ] },
      },
      {
        id: 'evidence', title: 'Evidence & Claims', w: 5, h: 220,
        body: { kind: 'rows', cols: '1fr auto auto', rows: [
          [T('Waterproof to 10,000mm'), M('LR-0912'), C('verified', 'verified')],
          [T('78% recycled shell'), M('SC-334'), C('verified', 'verified')],
          [T('Ships carbon-neutral'), M('CN-118'), C('verified', 'verified')],
          [T('Battery · 40h runtime'), M('LR-1180'), C('awaiting', 'pending')],
          [T('Rights · paid + organic'), M('RIGHTS-OK'), C('verified', 'verified')],
        ] },
      },
      { id: 'broker', title: 'Tool Broker · Agent Runs', meta: 'credential never leaves the broker', w: 7, h: 230, body: { kind: 'stream', cols: '68px 128px 1fr auto', seed: seedBroker } },
      { id: 'audit', title: 'Audit Stream · Hash-Chained', meta: 'digest continuity confirmed', w: 12, h: 232, body: { kind: 'stream', cols: '68px 132px 1fr 180px', seed: seedAudit } },
    ],
  },

  {
    key: 'operations',
    title: 'Operations',
    panels: [
      { id: 'active', title: 'Active Operations', w: 4, h: 214, body: { kind: 'rows', cols: '1fr auto auto', rows: [
        [T('Executing within policy'), N('42'), C('executing', 'exec')],
        [T('Monitoring outcomes'), N('12'), C('cyan', 'watch')],
        [T('Awaiting verified data'), N('6'), C('awaiting', 'hold')],
        [T('Compiling channel variants'), N('5'), C('cyan', 'build')],
      ] } },
      { id: 'units', title: 'Autonomous Units', meta: '24 online', w: 4, h: 214, body: { kind: 'rows', cols: '1fr auto auto', rows: [
        [T('agent.channel-compiler'), M('load 0.62'), C('online', 'online')],
        [T('agent.copy'), M('load 0.41'), C('online', 'online')],
        [T('agent.evidence'), M('load 0.28'), C('online', 'online')],
        [T('agent.pricing'), M('paused'), C('idle', 'idle')],
        [T('agent.analytics'), M('load 0.55'), C('online', 'online')],
      ] } },
      { id: 'queue', title: 'Execution Queue', w: 4, h: 214, body: { kind: 'rows', cols: '1fr auto auto', rows: [
        [T('publish content'), M('agent.copy'), C('executing', 'exec')],
        [T('compile variant'), M('agent.channel-compiler'), C('executing', 'exec')],
        [T('activate offer'), M('ops.pricing'), C('awaiting', 'review')],
        [T('import product'), M('ops.discovery'), C('allow', 'allow')],
      ] } },
      { id: 'tput', title: 'Throughput · by stage', w: 12, h: 190, body: { kind: 'quotas', rows: [
        { label: 'Proposed', pct: 72, value: '34' },
        { label: 'Review', pct: 24, value: '8' },
        { label: 'Authorised', pct: 18, value: '6' },
        { label: 'Executing', pct: 34, value: '11' },
        { label: 'Executed · 24h', pct: 96, value: '1,204' },
      ] } },
    ],
  },

  {
    key: 'products',
    title: 'Products',
    panels: [
      { id: 'registry', title: 'Product Passport · Registry', meta: '5 products', w: 7, h: 244, body: { kind: 'rows', cols: '1fr auto auto auto', rows: [
        [T('Aurora Field Jacket'), M('12 claims'), C('verified', 'verified'), M('6 ch')],
        [T('Tempo Trail Runner'), M('9 claims'), C('verified', 'verified'), M('5 ch')],
        [T('Halcyon Travel Pack'), M('14 claims'), C('awaiting', '3 pending'), M('4 ch')],
        [T('Nimbus Rain Shell'), M('8 claims'), C('verified', 'verified'), M('6 ch')],
        [T('Vertex Trekking Pole'), M('5 claims'), C('verified', 'verified'), M('3 ch')],
      ] } },
      { id: 'claims', title: 'Claim Verification', w: 5, h: 244, body: { kind: 'rows', cols: '1fr auto auto', rows: [
        [T('Waterproof to 10,000mm'), M('LR-0912'), C('verified', 'verified')],
        [T('78% recycled shell'), M('SC-334'), C('verified', 'verified')],
        [T('Battery · 40h runtime'), M('LR-1180'), C('awaiting', 'pending')],
        [T('Ships carbon-neutral'), M('CN-118'), C('verified', 'verified')],
        [T('Fair-labour certified'), M('FL-771'), C('awaiting', 'review')],
      ] } },
      { id: 'coverage', title: 'Catalog Coverage · by channel', w: 12, h: 190, body: { kind: 'quotas', rows: [
        { label: 'Shopify', pct: 96, value: '96%' },
        { label: 'Instagram', pct: 82, value: '82%' },
        { label: 'YouTube', pct: 61, value: '61%' },
        { label: 'Marketplace', pct: 74, value: '74%' },
        { label: 'Email', pct: 88, value: '88%' },
      ] } },
    ],
  },

  {
    key: 'campaigns',
    title: 'Campaigns',
    panels: [
      { id: 'active', title: 'Active Campaigns', meta: '4 live', w: 7, h: 244, body: { kind: 'rows', cols: '1fr auto auto auto', rows: [
        [T('Autumn Field · launch'), M('Shopify · IG · Email'), C('executing', 'live'), N('£42.1k')],
        [T('Trail Runner · retarget'), M('IG · YouTube'), C('executing', 'live'), N('£18.4k')],
        [T('Travel Pack · preorder'), M('Shopify · Market'), C('awaiting', 'review'), N('£6.2k')],
        [T('Rain Shell · seasonal'), M('Email · Pinterest'), C('nominal', 'scheduled'), N('—')],
      ] } },
      { id: 'exp', title: 'Experiment Variants', w: 5, h: 244, body: { kind: 'rows', cols: '1fr auto auto', rows: [
        [T('Hero copy · A'), M('conv 3.1%'), C('cyan', 'control')],
        [T('Hero copy · B'), M('conv 3.9%'), C('verified', 'winning')],
        [T('Price anchor · A'), M('conv 2.7%'), C('cyan', 'control')],
        [T('Price anchor · B'), M('conv 2.6%'), C('awaiting', 'flat')],
      ] } },
      { id: 'roas', title: 'Spend vs Revenue · 7d', w: 12, h: 190, body: { kind: 'quotas', rows: [
        { label: 'Spend', pct: 38, value: '£11.4k' },
        { label: 'Attributed revenue', pct: 86, value: '£68.9k' },
        { label: 'ROAS', pct: 60, value: '6.0x' },
        { label: 'Blended CAC', pct: 24, value: '£18.20' },
      ] } },
    ],
  },

  {
    key: 'channels',
    title: 'Channels',
    panels: [
      { id: 'health', title: 'Channel Health', w: 5, h: 232, body: { kind: 'rows', cols: '1fr auto auto 84px', rows: [
        [T('Shopify'), C('nominal', 'ok'), M('24ms'), Q(72)],
        [T('Instagram'), C('nominal', 'ok'), M('38ms'), Q(58)],
        [T('YouTube'), C('nominal', 'ok'), M('44ms'), Q(61)],
        [T('LinkedIn'), C('nominal', 'ok'), M('52ms'), Q(40)],
        [T('Email'), C('degraded', 'deg'), M('80ms'), Q(88, true)],
        [T('Marketplace'), C('nominal', 'ok'), M('31ms'), Q(74)],
      ] } },
      { id: 'connectors', title: 'Connector Status', w: 7, h: 232, body: { kind: 'rows', cols: '1fr auto auto auto', rows: [
        [T('Shopify Admin API'), M('oauth'), C('verified', 'connected'), M('scopes ok')],
        [T('Instagram Graph'), M('oauth'), C('verified', 'connected'), M('scopes ok')],
        [T('YouTube Data v3'), M('oauth'), C('verified', 'connected'), M('scopes ok')],
        [T('Email · SMTP relay'), M('key'), C('degraded', 'degraded'), M('retrying')],
        [T('Marketplace feed'), M('key'), C('verified', 'connected'), M('scopes ok')],
      ] } },
      { id: 'pubq', title: 'Publish Queue', w: 12, h: 180, body: { kind: 'rows', cols: '64px 140px 1fr auto', rows: [
        [M('14:22'), M('Shopify'), T('Aurora Field Jacket · PDP'), C('executing', 'publishing')],
        [M('14:22'), M('Instagram'), T('Trail Runner · carousel'), C('awaiting', 'review')],
        [M('14:21'), M('YouTube'), T('Travel Pack · short'), C('nominal', 'queued')],
        [M('14:21'), M('Email'), T('Rain Shell · segment B'), C('nominal', 'queued')],
      ] } },
    ],
  },

  {
    key: 'customers',
    title: 'Customers',
    panels: [
      { id: 'seg', title: 'Segments', w: 4, h: 232, body: { kind: 'rows', cols: '1fr auto', rows: [
        [T('New · 30d'), N('4,182')], [T('Returning'), N('11,904')], [T('At-risk'), N('612')], [T('Dormant'), N('2,140')], [T('VIP'), N('318')],
      ] } },
      { id: 'funnel', title: 'Lifecycle Funnel', w: 4, h: 232, body: { kind: 'quotas', rows: [
        { label: 'Visited', pct: 100, value: '100' }, { label: 'Considered', pct: 62, value: '62' }, { label: 'Purchased', pct: 24, value: '24' }, { label: 'Repeat', pct: 11, value: '11' }, { label: 'Advocate', pct: 4, value: '4' },
      ] } },
      { id: 'consent', title: 'Consent & Rights', w: 4, h: 232, body: { kind: 'rows', cols: '1fr auto', rows: [
        [T('Marketing consent'), C('verified', 'granted')],
        [T('Data residency · EU'), C('verified', 'enforced')],
        [T('Right-to-erasure queue'), N('3')],
        [T('Rights · paid + organic'), C('verified', 'ok')],
      ] } },
      { id: 'top', title: 'Top Accounts · by LTV', w: 12, h: 180, body: { kind: 'rows', cols: '1fr auto auto auto', rows: [
        [T('Lacoupe Futur · retail'), M('acct 4471'), N('£182k'), C('verified', 'active')],
        [T('Northwind Outfitters'), M('acct 3902'), N('£128k'), C('verified', 'active')],
        [T('Atlas Expedition Co.'), M('acct 5514'), N('£96k'), C('review', 'review')],
      ] } },
    ],
  },

  {
    key: 'entitlements',
    title: 'Entitlements',
    panels: [
      { id: 'grants', title: 'Entitlement Grants', meta: 'ledger', w: 7, h: 244, body: { kind: 'rows', cols: '1fr auto auto auto', rows: [
        [T('Pro · seat'), M('acct 4471'), C('executed', 'granted'), M('exp 2026-12')],
        [T('Team · 25 seats'), M('acct 3902'), C('executed', 'granted'), M('exp 2027-03')],
        [T('Enterprise · unlimited'), M('acct 5514'), C('awaiting', 'step-up'), M('pending')],
        [T('Trial · 14d'), M('acct 6120'), C('executed', 'granted'), M('exp 8d')],
      ] } },
      { id: 'usage', title: 'Seat / License Usage', w: 5, h: 244, body: { kind: 'quotas', rows: [
        { label: 'Pro', pct: 78, value: '78%' }, { label: 'Team', pct: 54, value: '54%' }, { label: 'Enterprise', pct: 41, value: '41%' }, { label: 'Trial', pct: 90, value: '90%', warn: true },
      ] } },
      { id: 'gapp', title: 'Grant Approvals', w: 6, h: 186, body: { kind: 'rows', cols: '1fr auto auto', rows: [
        [T('Enterprise · unlimited'), C('stepup', 'step-up'), C('awaiting', 'await')],
        [T('Refund · goodwill credit'), C('stepup', 'step-up'), C('awaiting', 'await')],
      ] } },
      { id: 'revs', title: 'Revocations · 24h', w: 6, h: 186, body: { kind: 'rows', cols: '1fr auto auto', rows: [
        [T('Trial expired · auto'), M('acct 5981'), C('nominal', 'revoked')],
        [T('Chargeback · fraud'), M('acct 6034'), C('blocked', 'revoked')],
      ] } },
    ],
  },

  {
    key: 'intelligence',
    title: 'Intelligence',
    panels: [
      { id: 'signals', title: 'Signals', w: 7, h: 244, body: { kind: 'rows', cols: '1fr auto', rows: [
        [T('Demand spike · Rain Shell · DE'), C('cyan', '+38%')],
        [T('Margin risk · Trail Runner · promo'), C('review', 'watch')],
        [T('Sell-through · Field Jacket'), C('verified', '+12%')],
        [T('Sentiment lift · post-launch'), C('verified', '+0.4')],
      ] } },
      { id: 'anom', title: 'Anomaly Detection', w: 5, h: 244, body: { kind: 'rows', cols: '1fr auto', rows: [
        [T('Refund rate · Trail Runner'), C('review', '2.1σ')],
        [T('Latency · Email relay'), C('review', 'spike')],
        [T('Conversion · Marketplace'), C('nominal', 'normal')],
        [T('Fraud score · new accounts'), C('nominal', 'normal')],
      ] } },
      { id: 'fc', title: 'Forecast · 14d revenue', w: 6, h: 186, body: { kind: 'quotas', rows: [
        { label: 'P10', pct: 40, value: '£0.83M' }, { label: 'P50', pct: 64, value: '£1.02M' }, { label: 'P90', pct: 88, value: '£1.28M' },
      ] } },
      { id: 'agperf', title: 'Agent Performance', w: 6, h: 186, body: { kind: 'rows', cols: '1fr auto auto', rows: [
        [T('agent.copy'), M('success 98.4%'), C('verified', 'ok')],
        [T('agent.channel-compiler'), M('success 99.1%'), C('verified', 'ok')],
        [T('agent.pricing'), M('success 96.2%'), C('review', 'watch')],
      ] } },
    ],
  },

  {
    key: 'evidence',
    title: 'Evidence',
    panels: [
      { id: 'ledger', title: 'Evidence Ledger', meta: 'content-addressed', w: 7, h: 244, body: { kind: 'rows', cols: '1fr auto auto auto', rows: [
        [T('Waterproof to 10,000mm'), M('LAB · LR-0912'), M('4f9a…c2'), C('verified', 'verified')],
        [T('78% recycled shell'), M('CERT · SC-334'), M('9b21…7d'), C('verified', 'verified')],
        [T('Ships carbon-neutral'), M('AUDIT · CN-118'), M('1c8e…40'), C('verified', 'verified')],
        [T('Battery · 40h runtime'), M('LAB · LR-1180'), M('77aa…19'), C('awaiting', 'pending')],
        [T('Rights · paid + organic'), M('RIGHTS-OK'), M('a5d0…8f'), C('verified', 'verified')],
      ] } },
      { id: 'vq', title: 'Verification Queue', w: 5, h: 244, body: { kind: 'rows', cols: '1fr auto', rows: [
        [T('Battery runtime · re-test'), C('awaiting', 'in lab')],
        [T('Fair-labour · audit renewal'), C('awaiting', 'review')],
        [T('Water column · seasonal'), C('nominal', 'scheduled')],
      ] } },
      { id: 'links', title: 'Claim → Evidence Links', w: 6, h: 200, body: { kind: 'rows', cols: '1fr auto auto', rows: [
        [T('Field Jacket · waterproof'), M('→ LR-0912'), C('verified', 'bound')],
        [T('Rain Shell · recycled'), M('→ SC-334'), C('verified', 'bound')],
        [T('Trail Runner · battery'), M('→ LR-1180'), C('awaiting', 'unbound')],
      ] } },
      { id: 'prov', title: 'Provenance · Hash Chain', w: 6, h: 200, body: { kind: 'rows', cols: '64px 1fr auto', rows: [
        [M('14:22'), T('4f9a → 9b21'), C('verified', 'ok')],
        [M('14:21'), T('9b21 → 1c8e'), C('verified', 'ok')],
        [M('14:20'), T('1c8e → 77aa'), C('verified', 'ok')],
      ] } },
    ],
  },

  {
    key: 'system',
    title: 'System',
    panels: [
      { id: 'cp', title: 'Control-Plane Health', w: 4, h: 232, body: { kind: 'rows', cols: '1fr auto', rows: [
        [T('Tenant isolation · RLS'), C('verified', 'forced')],
        [T('Policy bundle'), M('commerce-policy-1.4.0')],
        [T('Immutable registry'), C('verified', 'sealed')],
        [T('Tool broker'), C('verified', 'isolated')],
        [T('Emergency stop'), C('nominal', 'disengaged')],
      ] } },
      { id: 'tenancy', title: 'Tenancy', w: 4, h: 232, body: { kind: 'rows', cols: '1fr auto', rows: [
        [T('Workspace'), M('Lacoupe Futur · Prod')],
        [T('Region'), M('EU-WEST')],
        [T('Data residency'), C('verified', 'EU-only')],
        [T('Customer-managed keys'), C('verified', 'enabled')],
      ] } },
      { id: 'audint', title: 'Audit Integrity', w: 4, h: 232, body: { kind: 'rows', cols: '1fr auto', rows: [
        [T('Chain continuity'), C('verified', 'confirmed')],
        [T('Entries · 24h'), N('18,204')],
        [T('Last digest'), M('77aa…19')],
        [T('Export · signed'), C('verified', 'ready')],
      ] } },
      { id: 'sec', title: 'Security Posture', w: 12, h: 180, body: { kind: 'quotas', rows: [
        { label: 'SSO coverage', pct: 100, value: '100%' },
        { label: 'MFA enrolment', pct: 96, value: '96%' },
        { label: 'Encryption at rest', pct: 100, value: '100%' },
        { label: 'Secrets rotation', pct: 88, value: '88%' },
        { label: 'Least-privilege', pct: 92, value: '92%' },
      ] } },
    ],
  },
];

export const SECTION_KEYS = SECTIONS.map((s) => s.key);
export function sectionByKey(key: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.key === key);
}
