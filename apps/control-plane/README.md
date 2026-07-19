# @oryqon/control-plane

TypeScript control plane. **Gate 0 (secure foundation) is implemented and
tested**; the rest of the control plane (settings, policy engine, connectors,
real-time events) follows in later gates.

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

## Commands

```bash
npm run test --workspace @oryqon/control-plane        # node --test (native TS, no deps)
npm run typecheck --workspace @oryqon/control-plane   # tsc --noEmit
opa test apps/control-plane/policies -v               # rego policy unit tests
```

Runtime code uses only Node built-ins; there are no production dependencies.

**Status:** Gates 0 and 1 CLOSED — app + database + policy layers tested.
Gates 2–7 per `../../docs/ARCHITECTURE.md`.
