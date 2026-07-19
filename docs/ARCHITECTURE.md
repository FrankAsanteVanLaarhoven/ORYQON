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
- **Milestone 1 — Gate 0 (secure foundation): implemented and tested.**
  `apps/control-plane` provides tenant isolation (app-layer, fail-closed),
  SSRF-safe URL validation, durable idempotency, and the deterministic tool
  broker — 27 native `node --test` cases. `apps/agent-runtime` provides the
  proposal-only agent boundary (pytest). Database-level RLS
  (`apps/control-plane/db/migrations/0001_tenant_rls.sql`) is written but requires
  a live PostgreSQL to verify — **Gate 0 is not fully closed until that runs in
  CI**. Gates 1–7 remain ahead. No connector, model provider or live execution
  path exists yet.
