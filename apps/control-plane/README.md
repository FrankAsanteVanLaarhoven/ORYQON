# @oryqon/control-plane

TypeScript control plane. **Gates 0–4 are implemented and tested**; the rest of
the control plane (connectors, analytics, enterprise release) follows in later
gates.

## Gate 0 — security foundation

| Pillar | Module | Proof |
| --- | --- | --- |
| Tenant isolation | `src/security/tenant-context.ts`, `tenant-store.ts` | `test/tenant.test.ts` — cross-tenant reads isolated, missing context fails closed |
| SSRF defence | `src/security/url-guard.ts`, `ip-rules.ts` | `test/url-guard.test.ts` — metadata IP, private/loopback ranges, DNS-rebinding, schemes, creds, ports |
| Durable idempotency | `src/idempotency/*` | `test/idempotency.test.ts` — replayed key → no duplicate; legal-only lifecycle |
| Tool broker | `src/broker/tool-broker.ts` | `test/tool-broker.test.ts` — allowlist/permit/approval/kill-switch; credential never reaches the agent |

Database-level RLS (defence in depth) is in `db/migrations/0001_tenant_rls.sql`
and **verified** by `db/tests/rls_cross_tenant.sql` against PostgreSQL 16, run in
CI (`.github/workflows/ci.yml`) — see `db/README.md`.

## Gate 1 — profiles, settings, policy, roles, step-up

| Concern | Module | Proof |
| --- | --- | --- |
| Hierarchical settings | `src/settings/settings.ts` | `test/settings.test.ts` — deterministic most-specific-wins resolution + effective-version fingerprint |
| Policy-as-code (default-deny) | `src/policy/policy-engine.ts` + `policies/oryqon.rego` | `test/policy.test.ts` (engine) + `policies/oryqon_test.rego` (`opa test`, 6 cases) |
| Immutable policy versions | `src/policy/policy-registry.ts` | `test/policy.test.ts` — activation deep-freezes; mutation throws; retire-on-activate |
| Enterprise role separation | `src/rbac/roles.ts` | `test/rbac.test.ts` — propose≠approve, self-approval blocked, `db.admin` disjoint |
| Step-up auth | `src/auth/step-up.ts` | `test/step-up.test.ts` — privileged actions need a fresh, sufficiently strong step-up |

`policies/oryqon.rego` is the externalized OPA policy; it mirrors
`src/policy/policy-engine.ts` rule for rule and is unit-tested with `opa test` in
CI (`.github/workflows/ci.yml`).

## Gate 2 — products & evidence

| Concern | Module | Proof |
| --- | --- | --- |
| Immutable, content-addressed evidence | `src/products/evidence-store.ts` | `test/evidence.test.ts` — frozen on record, canonical SHA-256 hash, idempotent, tenant-scoped reads, integrity verification |
| Product Passport (one verified record) | `src/products/product-passport.ts` | `test/product-passport.test.ts` — claim → evidence verification, cross-tenant fail-closed, publish freezes |
| Publish requires evidence | `src/products/product-passport.ts` | `test/product-passport.test.ts` — a required unverified claim raises `PUBLISH_WITHOUT_EVIDENCE`; `hasRequiredEvidence()` gates the policy engine's `PUBLISH_CONTENT` decision |

Evidence is content-addressed (SHA-256 over a canonical serialization) and
deep-frozen on record, so an attestation can never be edited after the fact. A
passport publishes only when every required claim carries verified evidence —
the same `PUBLISH_WITHOUT_EVIDENCE` reason the policy engine emits — and is
immutable once published (WITHDRAWN is the only onward transition). All state is
bound to the creating tenant; cross-tenant use fails closed.

## Gate 3 — agent control plane

| Concern | Module | Proof |
| --- | --- | --- |
| Bounded-autonomy envelope | `src/agents/agent-registry.ts` | `test/agent-registry.test.ts` — allowed action types, risk ceiling, autonomy and step budget fixed at registration; capabilities frozen, status suspend/reinstate, tenant-scoped |
| Bounded run lifecycle | `src/agents/agent-run.ts` | `test/agent-run.test.ts` — ACTIVE with a step budget; terminal COMPLETED/FAILED/ABORTED; over-budget and post-terminal steps fail closed; cross-tenant fails closed |
| Proposal admission gate | `src/agents/admission.ts` | `test/agent-admission.test.ts` — kill switch, run state/budget, agent active, tenant alignment, autonomy, capability, risk ceiling — 10 fail-closed reasons + the admit → step → policy flow |

An agent may only ever *propose*, never execute. Before a proposal reaches the
policy engine or the tool broker it must be admitted: `admitProposal` is a pure,
fail-closed decision that checks the run (active, budget), the agent (registered,
active, tenant-aligned, autonomy permits proposing) and the proposal (action
type within capability, risk within ceiling). Admission performs no side effects
— the caller records the run step and forwards an admitted proposal onward.

## Gate 4 — campaigns & approvals

| Concern | Module | Proof |
| --- | --- | --- |
| Campaign aggregate | `src/campaigns/campaign.ts` | `test/campaign.test.ts` — DRAFT → ACTIVE ↔ PAUSED → COMPLETED / CANCELLED; cannot activate empty; terminal is final; tenant-scoped |
| Human authorization | `src/approvals/approval.ts` | `test/approval.test.ts` — approver must hold `campaign.approve`, cannot self-approve, and must clear step-up for privileged/high-risk actions |
| Approval queue | `src/approvals/approval.ts` (`ApprovalStore`) | `test/approval.test.ts` — tenant-scoped pending list; cross-tenant writes fail closed |

When policy returns REVIEW an approval request is raised and held pending. A
decision reuses the Gate-1 controls directly: RBAC (`campaign.approve`, with
self-approval blocked) and step-up (privileged/high-risk actions need a fresh,
sufficiently strong assertion). Authorising advances the ActionProposal from
REVIEW to AUTHORISED; every decision is immutable and tenant-bound.

## Commands

```bash
npm run test --workspace @oryqon/control-plane        # node --test (native TS, no deps)
npm run typecheck --workspace @oryqon/control-plane   # tsc --noEmit
opa test apps/control-plane/policies -v               # rego policy unit tests
```

Runtime code uses only Node built-ins; there are no production dependencies.

**Status:** Gates 0–4 CLOSED — app + database + policy + products/evidence +
agent control plane + campaigns/approvals tested (110 native `node --test` cases
+ 6 `opa test`). Gates 5–7 per `../../docs/ARCHITECTURE.md`.
