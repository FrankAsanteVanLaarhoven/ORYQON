# ORYQON — Design specification

> **Cinematic outside; forensic inside.**
> Extract the principles of SpaceX (scale, mission, restraint), Anduril
> (industrial credibility, engineered products) and Palantir (connected objects,
> decisions, actions, forensic data) — do not copy their pages.

## Two aesthetics, one system

| Layer | Character |
| --- | --- |
| **Public site** | Smoked optical glass, full-bleed depth, large mission statements, real interface footage, scroll storytelling, sparse navigation. |
| **Operating console** | Solid legible surfaces, dense controlled data, tables/timelines/topology, precise status, persistent command navigation, explicit freshness labels. |

Glass belongs to the hero and selected overlays only — never behind financial
tables, alerts or operational controls.

## Design tokens

```css
--surface-void:     #050607;   /* page base            */
--surface-primary:  #0a0c0e;
--surface-elevated: #111418;

--glass-smoke:      rgba(9, 12, 15, 0.56);
--glass-border:     rgba(255, 255, 255, 0.14);
--glass-highlight:  rgba(255, 255, 255, 0.06);

--text-primary:     #f4f5f2;                    /* bone white */
--text-secondary:   rgba(244, 245, 242, 0.68);
--text-muted:       rgba(244, 245, 242, 0.42);

--signal-active:    #8ad8ff;   /* optical cyan — live execution   */
--signal-warning:   #f1b85b;   /* controlled amber — pending      */
--signal-critical:  #ef625e;   /* signal red — blocked/critical   */
--signal-verified:  #7fb08a;   /* desaturated green — verified    */
```

Monochromatic by default. One cool signal colour indicates **live system
activity**, not decoration. Status is not turned into brightly coloured badges.

## Typography

- **Headline / mission** — tightly tracked grotesque (Suisse Intl / Söhne class;
  system-ui fallback).
- **Interface** — neutral, highly readable (Inter class).
- **Technical data** — monospace only for identifiers, policies, timestamps and
  receipts; tabular figures for financial values.

Scale: `11px` labels/timestamps · `13px` metadata · `14–16px` body/controls ·
`24px` workspace titles · `48px` section statements · `72–104px` hero.

## Homepage narrative

1. **Mission hero** — *The commercial internet. Under one command layer.*
2. **The fragmented reality** — disconnected commercial systems converge into ORYQON.
3. **The operating model** — `PRODUCT → OFFER → CAMPAIGN → VERIFICATION → EXECUTION → REVENUE → LEARNING`.
4. **Live Command Centre** — a functioning console demonstration (later milestone).
5. **Product Passport** — one verified record controls every channel representation.
6. **Bounded autonomy** — observe · draft · approve · execute within policy · escalate.
7. **Enterprise deployment** — residency, SSO, customer-managed encryption, audit export, RBAC.
8. **Final mission statement** — *Commerce does not need more disconnected automation. It needs an operating system.*

## Motion & media

- Hero video is a **production asset** — real interface recordings, telemetry-derived
  abstractions, product/infrastructure footage. No synthetic decorative footage.
- Until that asset exists, the hero uses a deterministic, code-drawn commercial-network
  backdrop (no stock, no external assets), muted, with a meaningful first frame.
- Muted by default, reduced-motion functional equivalence at 100%, no rapid flashes,
  first visible frame meaningful, usable if media fails.

## Human-authored UI standard

Brand identity, page composition, information hierarchy, motion language,
enterprise terminology and interaction architecture are human-authored. Tooling
assists with boilerplate, accessibility, tests and token validation only.
