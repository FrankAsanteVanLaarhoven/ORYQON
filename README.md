# ORYQON

**A verified command layer for operating products, campaigns, channels and revenue across the commercial internet.**

ORYQON unifies product intelligence, content operations, channel distribution,
customer workflows and live commercial analytics — governed through verifiable,
human-approved execution. Cinematic at the perimeter; forensic at the centre.

---

## Design principle

> **Black glass at the perimeter. Solid operational truth at the centre.**

- **Public site** — cinematic: smoked optical glass, mission statements, real
  interface footage, scroll-controlled storytelling.
- **Operating console** — forensic: solid legible surfaces, dense controlled
  data, precise status, explicit freshness, evidence and approval states.

Glass is reserved for the hero and transition layers. It never sits behind
financial tables, alerts or operational controls.

## Architecture

A controlled two-runtime system (see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)):

| Runtime | Responsibility |
| --- | --- |
| **TypeScript control plane** | Authn/authz, tenancy, settings, policy evaluation, products/offers, campaign commands, approvals, connectors, audit, idempotency, real-time events. |
| **Python agent runtime** | Reasoning, model routing, structured generation, evidence extraction, planning, typed tool-call *proposals* — with no direct database, network, credential or execution access. |

The agent runtime never executes. It proposes; the control plane verifies,
gates on human approval, and executes within policy.

## Repository layout

```
apps/
  web/            Public marketing site (Next.js App Router, cinematic)
  control-plane/  TypeScript control plane            (next milestone)
  agent-runtime/  Python agent runtime                (next milestone)
packages/         Shared contracts, security, cache   (next milestone)
docs/             Architecture & design specification
scripts/          Branding guard and build tooling
```

## Getting started

```bash
npm install
npm run dev        # public site — http://localhost:3000
npm run check      # branding guard + production build
```

## Branding & attribution guard

`npm run check:branding` fails the build if any default framework logo asset,
template marketing boilerplate, or unapproved authorship/credit line enters the
tree. ORYQON ships with **no framework "N"/vendor logo branding** in the UI or
codebase, and a single Git identity.

## Ownership

© Frank Asante Van Laarhoven. All rights reserved.
