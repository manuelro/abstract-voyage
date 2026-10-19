# Quote: one capability-complete base, three specializations that inherit all of it

**Status:** Plan only, not implemented, on 2026-10-13. Every "current state"
claim was read from source this session (files cited inline). Nothing here is
built or runtime-verified; §10 is the gate before any "done" claim.

**Scope requested:** `pages/wall.tsx` and `experiences/abstract/components/Quote/config.ts`.
Delivering it necessarily also touches `editorialConfig.ts`, `EditorialQuote.tsx`,
`EditorialQuote.panel.ts`, `Quote.panel.ts`, `editorialLiveDesign.ts`, `themes.ts`,
`pages/quote-lab.tsx`, `pages/WallQuoteItem.tsx`. Stated, not hidden.

---

## 1. The thesis (what is actually being asked)

There is **one** quote component with a large set of hard-won capabilities:
typography, measure/leading/tracking, four-side padding, palette surface, the
**gradient render modes (`unified` and `css`, both with integrity)**, the hologram
layer, **proximity elevation**, **cast shadow** (independently switchable),
backgrounds, derived/solid text ink, the source **heading**, the source **link**,
the **top rule**, adaptive type-fitting, quotation marks, author line.

The three "types" — **featured / plain / solid** — are **not** separate components
and **not** a reduced subset. They are a **segregation and specialization of that
one base**: each must inherit **every** base capability in full, then differ only
by (a) its **default values** and (b) genuinely **type-specific additions on top**.
A specialization may change what a capability *defaults to*; it may **never
subtract, force, or hide** a capability.

**Exhaustive, not illustrative.** The capability list above (and the full field
inventory of `QuoteConfig` + `EditorialQuoteConfig`) is the set to reconcile and
reuse — *all of it*, not the render-mode/elevation/shadow examples I happened to
name. Step 0 of implementation is to **enumerate every field/capability** of both
configs and prove each one is reconciled into the single base and reachable by all
three types. "Every single capability" is the acceptance bar (§11), checked field
by field.

**Two engineering principles that are non-negotiable here:**

- **Zero duplication.** The three types must be **data, not code**. There is
  exactly **one** renderer, **one** config schema/normalizer, **one** panel
  builder, **one** of each shared part. A type is a small default-override record
  (plus any additions) fed into that single machinery — never a second or third
  copy of the same rendering/config/panel logic. Triplicated code (which this
  codebase already has in the per-variant heading/link appearance fields and the
  per-variant panel spread) is treated as a defect to remove, not a pattern to
  extend.
- **Capability-complete inheritance.** Centralization is enforced, not trusted
  (§3.1, §9): if a type cannot reach a base capability, a test fails.

My previous draft inverted this. It tried to extract a *thin* base (just
background + text color) and treated heading/link as the headline. Wrong. The base
is the **complete** capability set; heading and link are just two of the many
capabilities every type inherits. Background + text color were examples the
original request gave, not the boundary.

## 2. Why it is broken today (verified in source)

The current design *claims* inheritance via `EditorialQuoteConfig = QuoteConfig & {…}`
plus a panel that spreads `QUOTE_PANEL.fields`. But it then **actively removes**
base capabilities from the specializations:

| Lost capability | Where it is stripped | Effect on the 3 types |
| --- | --- | --- |
| `css` **render mode** (half of "both render modes") | `editorialConfig.ts:96` hard-forces `gradientInkRenderMode:'unified'`; `EditorialQuote.panel.ts:10,21` hides the field | No type can ever use CSS-glyph ink; only unified mesh. Base defaults to `css` (`config.ts:590`) — the types can't reach it. |
| Independent **gradient enable** | forced from `backgroundMode` (`editorialConfig.ts:95`), hidden in panel | Can't opt gradient ink on/off independently of the background selector. |
| Independent **palette enable** | forced from `backgroundMode` (`:97`), hidden in panel | Same — the base's own palette switch is shadowed. |
| **Background concept duplicated** | `backgroundMode` was bolted on *over* the base's own `paletteBackgroundEnabled`/`gradientInkEnabled`, and now *overrides* them | Two competing representations of one concept; the base mechanisms become unreachable rather than composed. |

Elevation (`elevationEnabled`, `config.ts:423`) and cast shadow (`shadowEnabled`,
`:430`) are independent base switches and *are* spread into the type panels — but
whether they render **with integrity** inside EditorialQuote's `<article>` wrapper
and under the `backgroundMode` surface styles (`EditorialQuote.tsx:129`,
`position:relative;zIndex:1` + lift transform on the same node) is **unverified**
and is an explicit §10 check, not an assumption.

**Root cause:** capability reaches a type only through a TypeScript intersection
plus a hand-maintained panel spread with ad-hoc `hiddenKeys` and runtime forcing.
Nothing *guarantees* a base capability is present, configurable, and persistable on
every type; it is easy (and already done) to silently drop one. That is the exact
failure mode `PLAN-SHARED-COMPONENT-CAPABILITY-PROPAGATION.md` (commit `b7827315`)
was written to eliminate.

## 3. Target architecture — inheritance by construction

### 3.1 The base owns every capability as a descriptor

Model each Quote capability as a **ComponentCapability descriptor** (the pattern
from commit `b7827315`): id/version, its config field definitions, its normalized
shared defaults, and its resolved render contract. The base Quote is the single
registry of these descriptors. Capabilities include every item listed in §1 —
including **heading** and **source link** as two descriptors.

A **type** (featured/plain/solid) is a **registered specialization** that:
- **automatically receives all descriptors** — available, configurable,
  persistable — with no per-type wiring (contract #1–#2 of that plan);
- supplies only a **default-override record** (partial) for the fields whose
  default differs from the base;
- may register **additional** type-specific capabilities on top.

Consequences that fix §2:
- No `hiddenKeys` removing render mode / palette / gradient from a type.
- No `normalizeEditorialQuoteConfig` hard-forcing `gradientInkRenderMode:'unified'`.
- Adding a *new* base capability later appears on all three types automatically,
  with working `UPDATE DIFF`, without editing any type (contract #3).

### 3.2 Background becomes a composable selector, not an override

Keep one surface concept, but make it **compose** with the base render-mode
capability instead of replacing it. `backgroundMode` (`none | solid | palette |
gradient`) selects *which surface is active*; it must **not** force the render mode
or disable the independent toggles. Choosing `gradient` still lets the operator
pick `unified` **or** `css` render mode (both, with integrity); choosing `solid`
adds the configurable solid color; `palette` uses the base palette+derived-ink
pipeline. Reconcile the duplicated representation: `backgroundMode` is the single
author-facing switch, and the legacy `paletteBackgroundEnabled`/`gradientInkEnabled`
booleans are derived **outputs** of the resolver — not a second set of writable,
hideable switches. (This keeps the earlier plan's single-switch intent while
*restoring* the render-mode choice the current code strips.)

### 3.3 Heading and link: shared sub-component capabilities of the base

Because they are base descriptors, **every** type inherits them, and their
appearance (Tailwind-backed `fontSize`, `fontWeight`, four-side padding, `gap`,
link `icon`/placement/size, and a **color that defaults to the quote's computed
ink** — see §3.4 — or an explicit value) is **edited once and reflected on every
quote**. Per-type concerns that legitimately differ — **visibility** (featured
shows the heading, plain hides it), **placement**, **alignment**, **label/content**
— stay in the type's default-override record. Sharing the *look*, specializing the
*presence/placement/content*, is the "truly shared component" the request asks for,
and it is consistent with inheritance rather than an exception to it.

### 3.4 One shared ink resolver (so "inherit" is real and single-sourced)

The quote's computed ink is derived inside `Quote.tsx` today and not exposed
(`Quote.tsx:333-359`: gradient→`gradientInkTextColorValue`, palette→
`deriveQuoteTextColor`). Heading/link render as siblings of the Quote inside the
`<article>`, so a CSS variable on the Quote root won't cascade. Extract a pure
`resolveQuoteInk(config)` into `config.ts`; refactor `Quote.tsx` to consume it
(snapshot-prove no change); let the parts resolve `color: 'inherit'` through it.
Honest caveat: over a mesh the visible glyph color is a per-pixel blend, so
"inherit" resolves to the deterministic overlay ink (`gradientInkTextColor`), and
contrast over mesh is re-checked in §10.

### 3.5 One renderer, one schema, one panel builder (no triplication)

Single source for all three types, enforced structurally:
- **One renderer** — `<Quote>` plus the composed parts (`EditorialQuote.tsx:120-146`
  already renders one Quote; keep it). `/wall` (via `WallQuoteItem`) and
  `/quote-lab` mount the same component.
- **One config schema + one normalizer** — the base descriptor set. A type does
  not get its own config type/normalizer; it supplies a `Partial` override record
  resolved against the base (`resolveComponentConfig(base, typeOverride)` per commit
  `b7827315`).
- **One panel builder** — a single `createQuoteTypePanel(type)` driven by the base
  descriptors, replacing the current `createEditorialQuotePanel` that hand-spreads
  `QUOTE_PANEL.fields` and then strips keys. The type argument selects defaults and
  labels, not a different field set.
- **One of each shared part** — heading and link exist once.

What this deletes: the per-variant appearance field triplication in
`editorialConfig.ts` (heading*/link* duplicated across FEATURED/PLAIN/SOLID), and
any per-type render/panel branching. If, after this work, the same capability is
expressed in more than one place for the three types, that is a bug against this
plan.

### 3.6 Exact look-and-feel parity, reproduced through the shared base

The current rendered appearance of each type must **not change**. The three
existing looks (featured = gradient mesh + bold + heading + link, no rule; plain =
quiet surface + rule + link, heading hidden; solid = solid surface + heading +
"Read the full passage") are re-expressed as **default-override records over the new
unified base** — i.e. each current look becomes a small, declarative preset that the
single machinery reproduces, with **no bespoke per-type code** behind it. Acceptance
is pixel-level parity against a captured baseline (§8.1, §10.6): same output, now
produced by reusable config instead of forced/hidden fields. This is also the proof
that the enhanced base is expressive enough — if any current look can't be rebuilt
from config alone, the base is missing a capability and must gain it (not a
per-type hack).

## 4. Reuse of the two referenced commits (not re-implementation)

- **`b7827315` (capability propagation + config-update payload):** the backbone of
  §3.1. Each capability is a descriptor; types are registered instances that get
  all of them; `UPDATE DIFF` persists via `knownKeys` override insertion
  (`componentConfigPayload.ts:17-20`) so a type need not pre-seed a field to edit
  it. Build/test invariants fail if a type is missing a descriptor the base
  declares — making "every capability present in every type" machine-enforced.
- **`7796da45` (Tailwind tokens):** every token-backed field (part font
  size/weight/padding/gap/icon size, top-rule width, and the base's own
  token fields) uses `createTailwindFieldFactory` / `TailwindTokenValue` /
  `normalizeTailwindToken`. Verified: all needed utility families
  (`fontSize`, `fontFamily`, `fontWeight`, `paddingTop/Right/Bottom/Left`, `gap`,
  `borderWidth`) already exist in `tailwindUtilities.generated.ts`; no generator
  change anticipated. Control kind (enum ≤8 / select >8) stays owned by the shared
  factory and the `defineConfigScope` validator (`defineConfigScope.ts:169-178`).

## 5. Hard constraint that shapes the data model (verified)

`defineConfigScope` requires `defaultValue` to cover **exactly** the keys its
fields + `hiddenKeys` represent (`defineConfigScope.ts:196-217`). So each shared
capability that has its own panel scope (heading, link, and the base itself) needs
its **own** standalone config object + defaults + `copy` target. This is *why*
descriptors are discrete slices — which is also exactly what makes them shareable
and independently persistable.

## 6. Panels & authoring (`/quote-lab`, `/wall`)

- The per-type panel is **composed from the base descriptors**, not a hand-spread
  of `QUOTE_PANEL.fields` with `hiddenKeys`. It exposes **every** base capability
  (render mode, palette, gradient toggles, elevation, shadow, hologram, …) plus the
  type's additions. No capability is filtered out.
- Shared heading/link appearance get their **own** panel scopes (edited once,
  propagate to all). Per-type visibility/placement/label stay on the type scope.
- `/quote-lab` previews all three types; editing a shared capability (e.g. the
  heading, or a render-mode default on the base) must visibly update the relevant
  previews together — the observable proof of real inheritance.
- `/wall` + `WallQuoteItem` thread the base + shared-part + per-type-override
  configs into the one `EditorialQuote`.

## 7. Persistence & migration (lose nothing)

- `quote-editorial-designs-v1` (`editorialLiveDesign.ts`): split into the per-type
  override record + the shared capability stores; migrate on read — if an old
  record carries now-shared appearance keys or legacy forced values, seed the
  shared store once (documented precedence) and drop the stale keys. Map legacy
  `paletteBackgroundEnabled`/`gradientInkEnabled`/forced `unified` to the composed
  `backgroundMode` + restored render-mode default **without silently discarding**
  prior designs.
- `quote-themes` (`themes.ts:57-62`): keep variant-tagged snapshots loadable;
  decide (recommended: yes) that a theme captures the full resolved look incl.
  shared parts, with read-time migration for old themes.
- `quote-live-design`: base draft; normalizer maps any legacy switches to the new
  composed representation.

## 8. Implementation sequence

0. **Exhaustive capability inventory.** List every field/capability of
   `QuoteConfig` and `EditorialQuoteConfig`; mark each as reconciled-into-base,
   shared-part, or type-default-override. This table is the contract that "every
   capability" is reused, and the checklist §11 verifies against.
1. **Baseline capture** of `/quote-lab` + `/wall` (screenshots + DOM/computed for
   render mode, elevation, shadow, palette, surface, ink, heading, link, rule) per
   breakpoint, for all three types — the frozen "same look & feel" reference used
   for the pixel-parity gate (§10.6) and the "no capability lost / no default
   changed" check.
2. **Capability descriptors on the base**: formalize each base capability (incl.
   heading, link) as a descriptor with fields + defaults; add `resolveQuoteInk`;
   refactor `Quote.tsx` to consume it (snapshot-prove parity).
3. **Composable background**: make `backgroundMode` compose with render mode; make
   `paletteBackgroundEnabled`/`gradientInkEnabled` derived outputs; **remove the
   forced `unified` and the `hiddenKeys`** so both render modes return to every type.
4. **Type model**: redefine featured/plain/solid as default-override records +
   optional additions over the full descriptor set; add the registration invariant
   that fails when a type is missing any base descriptor.
5. **Shared heading/link scopes** (Tailwind-token-backed) + their live stores.
6. **Rewire `EditorialQuote`** to resolve base ⊕ shared parts ⊕ per-type overrides;
   inherit ink.
7. **Rebuild panels** from descriptors (no spread+hide); extend `/quote-lab`
   bindings + SAVE/RESET/APPLY targets; thread through `/wall` + `WallQuoteItem`.
8. **Migrations** (§7). 9. **Tests** (§9). 10. **Live verification** (§10).

## 9. Automated coverage required

- **Capability-completeness invariant:** each of featured/plain/solid exposes and
  can persist **every** base descriptor field, checked against the §8.0 inventory
  (no field omitted); a test that removes a field from a type fails. (Directly
  prevents the §2 regression from recurring.)
- **No-duplication invariant:** the three types resolve through one renderer, one
  schema/normalizer, and one panel builder; there is no per-type config type,
  per-type panel field set, or duplicated heading/link appearance. A test/guard
  asserts a type is only a `Partial` override record, not copied logic.
- **Look-and-feel parity:** each type's rendered output matches the §8.1 baseline
  pixel-for-pixel at every breakpoint (snapshot/visual diff), proving the preset
  reproduces today's look through config alone.
- Both render modes (`unified`, `css`) are selectable and render correctly on each
  type; no forced `unified`.
- Elevation and cast shadow render on each type (independent switches) — asserted,
  not assumed.
- Editing a shared heading/link capability changes **all three** rendered types.
- `resolveQuoteInk` correct per `backgroundMode`; `inherit` vs `custom` color.
- `Quote.tsx` output unchanged for existing configs (snapshot).
- Migration: old `quote-editorial-designs-v1`, old base + editorial themes, legacy
  switches — all load, migrate, and lose no design.
- `UPDATE DIFF` round-trips for base, shared-part, and per-type override scopes.
- Wall consumes all three config layers (`WallQuoteItem.test.tsx`).

## 10. Verification protocol (gates "done" — implementation turn)

Repo resource-safety rules; "verify, don't assume."
1. Inspect existing Next/Chrome/Playwright; leave other sessions' servers
   (seen on 3000/3999) alone. One agent-owned Next on a free non-3000 port with
   `CLAUDE_NEXT_DIST_DIR`; one browser.
2. **Capability parity (the core claim):** on each of the three types, exercise —
   through the real panel — both render modes, gradient on/off, palette on/off,
   elevation, cast shadow, hologram, backgrounds, ink; capture screenshots +
   computed styles proving each works. Explicitly try to find a base capability
   that is missing, forced, or hidden on any type (falsification).
3. **Shared-part propagation:** edit heading, then link, **once** in `/quote-lab`;
   observe all three previews change together; reload (persist); then load `/wall`
   and confirm all three wall types reflect it with no per-type style overriding.
4. **Ink inheritance:** with `inherit`, cycle `backgroundMode`
   none→solid→palette→gradient; confirm part ink tracks resolved quote ink; check
   contrast on final pixels over mesh; confirm `custom` overrides.
5. **Integrity under wrapper:** confirm elevation transform + cast shadow + both
   render modes look correct inside the `<article>` + surface styles (the §2
   open risk), at mobile/tablet/desktop, long text, 200% zoom; keyboard-reach the
   link to the right `/about#` anchor with a full accessible name.
6. **Default/parity:** diff against the §8.1 baseline — no unintended change.
7. Stop browser + server; report none remain.

## 11. Acceptance criteria

- Featured/plain/solid are specializations of one base and inherit **100%** of its
  capabilities — proven live that each type can use both render modes, gradient,
  palette, elevation, cast shadow, hologram, backgrounds, ink, heading, link, rule,
  adaptive — with **nothing forced off or hidden**. No `hiddenKeys` stripping, no
  forced `gradientInkRenderMode`.
- A new capability added to the base appears on all three types automatically,
  configurable and persistable, with no per-type edit (demonstrated with a
  test-only field).
- Heading and link are each one shared component, edited once, reflected on every
  type on `/quote-lab` and `/wall`, with inherit-or-custom ink.
- Per-type visibility/placement/label still specialize independently.
- `backgroundMode` composes with render mode rather than overriding it.
- **Zero duplication:** one renderer, one schema/normalizer, one panel builder, one
  of each shared part; a type is only a `Partial` override record. No per-type
  copied code survives (the current triplicated heading/link appearance is gone).
- **Exact parity:** all three types render identically to the pre-work baseline at
  every breakpoint, now produced from reusable config presets over the enhanced
  base — every current look rebuildable from config alone.
- No saved design/theme lost; legacy data migrates on read.
- Tailwind tokens and capability/payload plumbing reused, not re-implemented.
- §10 executed and recorded; any untested path named.

## 12. Assumptions & open items (stated)

- **Verify-not-assume:** whether elevation/shadow and both render modes currently
  render with integrity inside EditorialQuote's wrapper is untested — §10.5 decides
  it; if the wrapper compromises them, the composition in §3.5/§6 must be adjusted
  (e.g. surface/transform ownership moved) and re-verified.
- "Parent computed ink" over a mesh = deterministic overlay ink, not a true blend.
- Base-Quote consumers outside the wall (`pages/abstract.tsx`,
  `experiences/abstract/configPanels.ts`, `Quote.stories.tsx`) must keep working
  after the background/render-mode re-composition — §8.2 snapshot guards, each path
  render-checked in §10.
- Nothing here is built or verified; all behavioral claims are gated by §10.
