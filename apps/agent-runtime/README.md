# oryqon-agent-runtime

Python agent runtime — reasoning and typed tool-call *proposals*. No direct
database, network, credential or execution access: an agent proposes; the
TypeScript control-plane tool broker executes under policy and human approval.

## Gate 0 — the safety boundary

`oryqon_agent_runtime` deliberately exposes only a `propose(...)` surface that
returns an inert, immutable `ToolProposal`. There is no `execute` / `invoke` /
`connect` / credential path. `tests/test_boundary.py` asserts this boundary.

```bash
cd apps/agent-runtime
python3 -m pytest -q            # boundary tests
```

Model routing, structured generation and the specialist agents arrive in
Gate 3 (agent control plane) — see `../../docs/ARCHITECTURE.md`. All of it
remains behind this proposal-only boundary.
