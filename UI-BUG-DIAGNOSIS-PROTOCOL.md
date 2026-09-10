# UI Bug Diagnosis Protocol

**Scope:** any reported visual/rendering bug where the cause isn't obvious from the report itself — "why does X look wrong" investigations, as opposed to a known error/exception with a stack trace.

**Origin incident:** the CoverFlow "border-like structure" investigation (2026-09-06). Three rounds of increasingly sophisticated diagnosis — an elevation-shadow theory (implemented, reverted, wrong), then a GPU-compositing-halo theory (pixel-level RGB measurement, mathematical proof it wasn't simple blending, two structural fix attempts, both moved the measured effect by ~0) — all missed the actual cause: `.stackNeutralSurface`'s literal `border-width: 3px` in `'border'` mode. That element had already been found and quoted, by name, earlier in the same investigation (during an unrelated darkness bug) and was never reconsidered. Full RCA: see the postmortem in that session's transcript; this document is the resulting enforced procedure, not a retelling of it.

## The hierarchy — cheapest first, in order, no skipping ahead

1. **Check live values of every config field already known to touch the affected visual area.** If a component's config has a field whose name plausibly matches the symptom (a "frame mode," "surface treatment," "border," "opacity" field), read its *current* resolved value before doing anything else. Config fields you already found earlier in the same investigation — for an unrelated symptom — still count as "already known" and must be re-checked, not left behind with the bug they were originally found for.
2. **Grep the component's own CSS/style modules for properties matching the symptom word-for-word** (`border`, `box-shadow`, `outline`, `opacity`, `filter`, `mix-blend-mode`). Read the matched rules in full, including any `[data-*]`-gated variants — a rule that only applies under a specific attribute/state is exactly the kind of thing a static "does this file have a border" skim misses.
3. **Cheaply toggle the top candidate live and observe, before writing any code.** A devtools style edit, a temporary config value flip, or hiding a suspected element — under 5 minutes, no committed changes. This step is not optional and does not get skipped because a theory "feels" more likely to require deeper investigation.
4. **Only if 1–3 don't explain it:** DOM/compositor-level inspection (see the hit-testing caveat below).
5. **Only if 4 doesn't explain it:** rendering-pipeline/GPU-compositing explanations. These are the least probable class of cause and the most expensive to investigate and fix — treat reaching this step as a signal to double back and re-verify steps 1–3 weren't skipped, not as license to build elaborate tooling.

## The hit-testing blind spot

`document.elementsFromPoint(x, y)` cannot return elements with `pointer-events: none` — a very common property on decorative/overlay elements (`aria-hidden="true"` covers, scrims, neutral-surface treatments) precisely the category of element most likely to be the actual cause of an unexplained visual artifact. **Never rely on `elementsFromPoint`/hit-testing alone** to answer "what's rendering at this pixel." Cross-check with a full subtree enumeration instead: `container.querySelectorAll('*')`, computed style + `getBoundingClientRect()` per element, filtered to those whose box overlaps the point in question. This surfaces `pointer-events: none` elements that hit-testing structurally cannot.

## No multi-file implementation before a cheap live test

A fix that touches more than one file does not start until step 3 above (a live, isolated, <5-minute experiment) has confirmed the specific hypothesized cause actually moves the reported symptom. "I'm fairly confident based on the code" is not sufficient justification to skip this — implementing first and asking the user to verify is not a substitute for testing the hypothesis before writing the fix.

## Two failed attempts = restart, not iterate

If two independently-implemented, correctly-verified attempts at the *same* root-cause theory both fail to move the measured/observed effect, that is strong evidence the theory itself is wrong — not that it needs a third variant. The correct response is a full restart of hypothesis generation (re-run steps 1–2 from scratch, including candidates already dismissed for a *different* prior symptom), not narrowing further inside the falsified theory or proposing the next item on an ordered list of variations.

## Known mechanisms ledger — `Card`/`CoverFlow`/`ArticleCard` (start this file's own running list per component investigated)

Catalogued so far, so a future investigation starts here instead of rediscovering these from zero:

| Mechanism | File | Visual effect | Gated by |
|---|---|---|---|
| `.scrim` | `components/ArticleCard.tsx` / `.module.css` | Flat black wash between gradient mesh and text | `data-appearance` (`gradient` vs `neutral`), `--article-card-scrim-color` |
| Elevation shadow | `useCardLiftPhysics` → `.fadeSurface` | Multi-layer, near-zero-offset `box-shadow` | `stackActiveSlide` (active card only), `useCardLiftPhysics`'s `shadowEnabled` |
| `.stackNeutralSurface` | `AbstractJournalLabCollection/styles.module.css` | Border ring (`border-width: 3px`) or opaque flat fill covering the mesh | `neighborFrameMode`: `'border'` / `'flat-fill'` / `'gradient-mesh'` (no cover) |
| Hologram brightness/saturation/hue engine | `GradientRenderer.tsx`, fed by a second `usePointerProximity` in `AbstractJournalLabHueFadeCard` | Live proximity-driven brightness/saturation/hue-shift/pan on the mesh itself | `journalHologramConfig.enabled`, `stackNeighborSettled`/`stackSlotAnimating` (same disable-timing gate as the lift-physics engine) |

Add to this table whenever a new card-surface visual mechanism is found — even one dismissed as "not the cause" for the bug that surfaced it. It may be the cause of the next one.

## Relationship to other process documents

- `AUDIT-*.md` files (repo root) — the output format once a diagnosis is confirmed. This protocol governs *how* to reach that diagnosis, not how to write it up.
- `CONFIG-CHANGE-PROTOCOL.md` / `P1-404-INCIDENT-RCA-AND-RELEASE-PROTOCOL.md` — same "protocol doc born from a real incident" convention this document follows.
