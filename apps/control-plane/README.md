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

## Commands

```bash
npm run test --workspace @oryqon/control-plane        # node --test (native TS, no deps)
npm run typecheck --workspace @oryqon/control-plane   # tsc --noEmit
```

Runtime code uses only Node built-ins; there are no production dependencies.

**Status:** Gate 0 CLOSED — app + database layers tested. Gates 1–7 per
`../../docs/ARCHITECTURE.md`.
