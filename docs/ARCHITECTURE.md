# ORYQON — Architecture

## Two-runtime control model

```
User request or system event
        │
        ▼
  Temporal workflow  ──►  Master Planner (proposes typed, acyclic plan)
        │                        │
        │                 deterministic plan validation
        │                        │
        ▼                        ▼
  Control plane  ◄────  Specialist agents (propose only)
        │
   Tool broker ──► OPA policy decision ──► human approval where required
        │
   Connector execution ──► signed receipt + audit event
```

The planner cannot call connectors, change policy, expand its own permissions,
access secrets, approve its own plan, or execute external actions. It produces a
typed plan; the workflow engine — not the model — controls concurrency, retries,
cancellation and deadlines.

## The central safety boundary

Agents receive **no** direct database, cache, internet, OAuth, payment, platform
token, policy-write or execution access. Every model-proposed tool call passes
through a deterministic **tool broker** that enforces tenant match, actor scope,
policy result, data classification, budget, rate limit, idempotency, schema,
connector health, approval state, kill-switch status and audit logging. An agent
never receives the underlying credential.

## Foundational controls (planned, per gate ladder)

- **Tenant isolation** — PostgreSQL row-level security, `FORCE RLS`, app role
  without `BYPASSRLS`; missing tenant context fails closed.
- **Policy-as-code** — OPA bundle, default-deny; policy versions immutable after
  activation.
- **SSRF defence** — user-supplied URLs validated (scheme, port, DNS→IP range
  blocks) and fetched by an isolated worker with no route to internal services.
- **Durable idempotency** — typed `ActionProposal` + PostgreSQL unique
  constraint; the lifecycle is `PROPOSED → REVIEW → AUTHORISED → EXECUTING →
  EXECUTED`, with `DENIED / FAILED / EXPIRED / REVOKED` terminals.
- **Cache discipline** — Redis is a performance layer, never authority; no
  tokens, PII, prices, entitlements, approvals or audit evidence in cache.
- **Envelope encryption** — credentials/PII protected by a data key wrapped by a
  root key; secrets never in responses, logs, traces, cache or agent context.

## Implementation gates

| Gate | Focus |
| --- | --- |
| 0 | Secure foundation (tenancy, SSRF, idempotency, no direct tool calls) |
| 1 | Profiles, settings, policy |
| 2 | Products & evidence |
| 3 | Agent control plane |
| 4 | Campaigns & approvals |
| 5 | Official connectors |
| 6 | Analytics |
| 7 | Enterprise release readiness |

## Current status

- **Milestone 0 — public site.** `apps/web` is live and branding-clean.
- **Milestone 1 — Gate 0 (secure foundation): CLOSED.**
  `apps/control-plane` provides tenant isolation (app-layer, fail-closed),
  SSRF-safe URL validation, durable idempotency, and the deterministic tool
  broker — 27 native `node --test` cases. `apps/agent-runtime` provides the
  proposal-only agent boundary (pytest). Database-level RLS
  (`apps/control-plane/db/migrations/0001_tenant_rls.sql`) is proven by
  `db/tests/rls_cross_tenant.sql` against PostgreSQL 16 — cross-tenant isolation,
  fail-closed writes, and the idempotency unique constraint — run in CI
  (`.github/workflows/ci.yml`). Gates 1–7 remain ahead. No connector, model
  provider or live execution path exists yet.
- **Milestone 1 — Gate 1 (profiles, settings, policy): CLOSED.**
  Deterministic hierarchical settings resolution; a default-deny policy engine
  with immutable, versioned policy bundles (activation deep-freezes); enterprise
  role separation (propose ≠ approve, self-approval blocked, `db.admin`
  disjoint); and step-up authentication for privileged actions. The externalized
  OPA bundle (`apps/control-plane/policies/oryqon.rego`) mirrors the in-process
  engine and is unit-tested with `opa test` in CI. Control-plane suite: 52 native
  `node --test` cases + 6 rego cases.
- **Milestone 1 — Gate 2 (products & evidence): CLOSED.**
  Content-addressed, immutable evidence (`src/products/evidence-store.ts`) — a
  SHA-256 hash over a canonical serialization, deep-frozen on record, idempotent,
  tenant-scoped, with integrity verification. The Product Passport
  (`src/products/product-passport.ts`) holds claims that are UNVERIFIED until
  tenant-scoped evidence is attached; publishing FAILS CLOSED
  (`PUBLISH_WITHOUT_EVIDENCE`) unless every required claim is verified, and a
  published passport is immutable (WITHDRAWN is the only onward transition).
  `hasRequiredEvidence()` feeds the policy engine's evidence gate directly.
  Control-plane suite now 71 native `node --test` cases + 6 rego cases.
- **Milestone 1 — Gate 3 (agent control plane): CLOSED.**
  Agents may only *propose*, never execute. `src/agents/agent-registry.ts` fixes
  each agent's bounded-autonomy envelope at registration (allowed action types,
  risk ceiling, autonomy level, per-run step budget; capabilities frozen,
  status suspendable, tenant-scoped). `src/agents/agent-run.ts` is a bounded run
  lifecycle (ACTIVE + step budget → COMPLETED/FAILED/ABORTED; over-budget and
  post-terminal steps fail closed). `src/agents/admission.ts` is the gate:
  `admitProposal` is a pure, fail-closed decision (kill switch, run state/budget,
  agent active, tenant alignment across proposal/run/agent, autonomy, capability,
  risk ceiling) that must pass before a proposal reaches the policy engine or the
  tool broker. Control-plane suite now 94 native `node --test` cases + 6 rego
  cases.
- **Milestone 1 — Gate 4 (campaigns & approvals): CLOSED.**
  A campaign aggregate (`src/campaigns/campaign.ts`) groups proposals toward one
  objective through a guarded lifecycle (DRAFT → ACTIVE ↔ PAUSED → COMPLETED;
  CANCELLED from any non-terminal state; cannot activate empty). The approval
  workflow (`src/approvals/approval.ts`) turns a policy REVIEW into a pending
  request and, on decision, reuses Gate-1 RBAC (the approver must hold
  `campaign.approve` and cannot approve their own proposal) and Gate-1 step-up
  (privileged/high-risk actions need a fresh, sufficiently strong assertion) to
  advance the ActionProposal from REVIEW to AUTHORISED. Control-plane suite now
  110 native `node --test` cases + 6 rego cases.
- **Milestone 1 — Gate 5 (official connectors): CLOSED, interface-first.**
  Connectors are governed channel adapters and the only components that could
  touch an external system — and none does.
  `src/connectors/connector-registry.ts` holds a credential *reference* (never a
  secret; inline secrets are rejected), starts every connector DISCONNECTED, and
  treats REVOKED as terminal. `src/connectors/dispatch.ts` admits a request (kill
  switch, connected, tenant, capability) and then applies a fail-closed
  live-execution guard that is OFF by default; even opted in, the shipped
  `NoopConnector` returns NOT_EXECUTED, so no external side effect can occur. A
  live connector would implement the same interface, execute via the tool broker,
  and run only under explicit authorization with real credentials. Control-plane
  suite now 125 native `node --test` cases + 6 rego cases.
