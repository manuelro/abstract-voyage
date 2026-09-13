# Mobile Article-List Timeline — Scroll Contrast Guarantee

## Problem

`pages/abstract.tsx`'s mobile article list (`MobilePinnedArticleSection`'s
own `renderList`, rendering `<AboutTimeline>` at ~line 4704) resolves its
row text colors via:

```
bodyColorOverride={wideColumnTypography.bodyColor}
highlightColorOverride={wideColumnTypography.highlightColor}
bodyOpacityOverride={wideColumnTypography.bodyOpacity}
highlightOpacityOverride={wideColumnTypography.highlightOpacity}
```

where `wideColumnTypography = resolveTypographyColors(colors.wideColumnColor,
globalTypographyConfig)` — computed **once**, with no scroll awareness at
all.

Two compounding defects:

1. **Wrong background, always.** At this tier, `colors.wideColumnColor` is
   already overridden by `usePolymorphicLayoutColors`
   (`PolymorphicLayout.tsx`) to `scrollGradientInkColor` — a fixed brand hex
   — whenever `scrollGradientActive` is true. It is never the real,
   currently-visible gradient color. `wideColumnTypography` therefore
   resolves contrast against a color nobody actually sees, at every scroll
   position, not just some.
2. **Never updates with scroll.** Even setting defect 1 aside, the
   background darkens progressively via `PolymorphicScrollGradientBackground`
   as the user scrolls (`--polymorphic-scroll-gradient-darken`, 0 → 
   `scrollGradientMaxDarken`). `wideColumnTypography` is computed once,
   outside any scroll listener, so the row colors are flat for the entire
   scroll range regardless of how dark the real background gets.

This is the same class of bug the hero fix (`PLAN-HERO-SCROLL-CONTRAST-GUARANTEE.md`)
addressed, but plainer: there the text at least changed *something* on
scroll (just not enough, and with a snap bug); here it never changes at
all, and is derived from a color that was never the real background to
begin with.

## Scope confirmation (why this is safe to touch)

`wideColumnTypography` is used at exactly one call site in
`pages/abstract.tsx` — this one. It is not shared with the hero
(`narrowColumnTypography` is a separate value) or with the desktop
`AboutTimeline` instance (`isCoverFlowDesktopTier` bottom slot, ~line 4785),
which runs at breakpoints where `scrollGradientEnabledWide/-Lg` are both
`false` for `/abstract` — that instance is unaffected today and must stay
unaffected after this change. Fix is page-scoped, not component-scoped.

## What reuses from the hero fix, and what doesn't

**Reuses (identical engine):**
- The tau-smoothed rAF scroll-progress loop
  (`scrollGradientResolved.viewportRangeVh`/`tauMs`), writing a single live
  CSS custom property — no React re-render per frame, matching every other
  scroll effect in this codebase.
- The philosophy: as the real background darkens, keep correcting until
  contrast holds — driven by the same curve the background's own darken
  overlay uses, so the two visually track together.
- `scrollGradientOriginColor`/`scrollGradientResolved.maxDarken` (already
  exposed on `usePolymorphicLayoutColors`'s return value from the hero
  work) as the two endpoints of the real, physically-painted background.

**Does NOT reuse (different color primitive, on purpose):**
- The hero's `requiredWhiteMixRatio`/white-mix-only correction. That
  formula exists specifically because the hero's text is a multi-stop
  gradient rendered via `background-clip: text` — `color-mix()` toward one
  target (white) is the only way to correct every stop uniformly while it
  still reads as one continuous gradient. The timeline's row text is a
  **flat hex per role**, not a gradient. `resolveContrastAwareTextColor`
  (`helpers/surfaceColorDerivation.ts`) — the primitive this component
  already calls internally for every non-scroll-reactive page — searches
  **both lighter and darker**, hue-preserving, and has no gradient
  constraint to work around. It is strictly the better-suited, already-used
  tool here; porting the hero's white-mix restriction would be a
  regression, not a reuse.

## Easing/transition parity with the hero text (explicit requirement)

Operator ask: the color change here must feel as gradual/progressive as the
hero's own text transition — not a step, not a different pace.

**Why a single smoothing stage is enough here, unlike the hero (documenting
the difference so it isn't mistaken for a shortcut):** the hero needed TWO
tau-smoothing passes chained together — one for scroll position → progress,
a SECOND independently smoothing the corrected mix ratio itself — because
that ratio comes from a per-frame bisection search whose result can jump
between frames whenever the correction newly engages or disengages
(documented in `AbstractEditorialHero.tsx`'s own `mixSmoothRef` comment).
This plan's color is instead a plain, continuous linear interpolation
(`color-mix()`) between two FIXED, precomputed endpoints — there is no
per-frame search result that can discontinuously jump, so one smoothed
progress value driving that interpolation is already exactly as gradual as
the hero's own first-stage smoothing. Adding a redundant second smoothing
pass here would not make it MORE gradual — it would just add lag with
nothing to correct for.

**What must match, concretely:**
- The exact same exponential-smoothing formula every other scroll effect in
  this codebase already uses: `alpha = 1 - exp(-dt / tau)`,
  `current += (target - current) * alpha` — never a CSS `transition:`
  timer and never an instant assignment.
- The exact same `tauMs` value the hero/background already use for this
  page — `scrollGradientResolved.tauMs` — not a new, independently-tuned
  constant. Same input, same perceived speed.
- The CSS `color-mix()` string must reference the SMOOTHED progress
  variable this effect writes (`current`, post-easing), never the raw
  unsmoothed `target` — the easing must actually reach the paint, not just
  exist in the JS variable name.
- Apply the same regression fix already required twice this session on the
  other two rAF loops in this codebase (`PolymorphicScrollGradientBackground.tsx`,
  `AbstractEditorialHero.tsx`): reset `lastTsRef.current = 0` inside
  `schedule()`, right before a stopped loop restarts — otherwise resuming
  scroll after any pause computes an artificially huge `dt`, `alpha≈1`,
  and the "gradual" transition snaps on exactly the resume case that
  matters most for a scrollable list a user dwells on mid-read.

**Verification addition:** the earlier plan's "no snap" check should
specifically include start-scroll-pause-resume-scroll, not just a single
continuous scroll gesture — that is the exact case the `lastTsRef` bug
hides in.

## Implementation plan

### 1. Precompute anchor colors (pages/abstract.tsx, memoized)

For each of the 4 roles this call site currently overrides
(`bodyColor`/`highlightColor`, each with an opacity partner), compute two
resolved hex values:

- **At rest**: `resolveContrastAwareTextColor(colors.scrollGradientOriginColor, ratio, ...)`
  — the real background color as authored, no darken.
- **Fully darkened**: `resolveContrastAwareTextColor(scaledOriginColor, ratio, ...)`
  where `scaledOriginColor` is `scrollGradientOriginColor` scaled toward
  black by `scrollGradientResolved.maxDarken` (the same
  `scaleTowardBlackSrgb`-style compositing already written for the hero —
  reuse that helper or an equivalent one-liner; black-over-color is just
  per-channel scaling, no dependency on `AbstractEditorialHero.tsx`
  internals needed).

`bodyColor`/`highlightColor` today come from `wideColumnTypography`
(`resolveTypographyColors`, which itself calls a contrast resolver
per role/opacity) — the two anchors should go through that SAME resolver
(`resolveTypographyColors`), called once against the rest-color background
and once against the darkened background, not a hand-rolled duplicate. This
keeps `globalTypographyConfig`'s own opacity/tolerance behavior intact; only
the background color argument varies between the two calls.

Only meaningful while `colors.scrollGradientActive` is true — every other
tier/page keeps today's single static call, byte-identical.

### 2. Scroll-progress CSS var scoped to this list's own DOM

The background's own `--polymorphic-scroll-gradient-darken` lives on a
fixed, viewport-covering sibling overlay (`PolymorphicScrollGradientBackground.tsx`)
— NOT an ancestor of the mobile article list, so it doesn't inherit down to
these rows as-is. Add a small new effect (inline in `pages/abstract.tsx`,
or a tiny shared hook if a third consumer appears later — YAGNI for now,
one page only) that writes an equivalent value onto the wrapping div already
present at the call site (`<div style={{ width: '100vw', ... }}>` around
`<MobilePinnedArticleSection>`, ~line 4657) — same tau/viewport-range inputs
as the background, so the two curves stay visually in lockstep without
coupling to that component's internals. Same `lastTsRef` reset-on-resume
fix already applied to the other two rAF loops this session must be
included here too (not a new bug to reintroduce).

### 3. Wire the mix into the existing override props

Replace the four static props with `color-mix()` CSS strings referencing
the new local var, e.g.:

```
bodyColorOverride={`color-mix(in srgb, ${restBodyColor} calc(100% - var(--mobile-article-list-darken, 0) * 100%), ${darkBodyColor} calc(var(--mobile-article-list-darken, 0) * 100%))`}
```

No changes needed inside `AboutTimeline.tsx`/`AboutTimelineRow.tsx` — both
already apply these props via plain `style={{ color: ... }}`, which accepts
any valid CSS color string, `color-mix()` included. This is the key
simplification versus the hero fix: zero component-internal changes, only
a page-level computation swap.

Opacity overrides (`bodyOpacityOverride`/`highlightOpacityOverride`) are
unaffected — opacity doesn't need to track background darkness the same
way, and changing them isn't part of the reported problem.

### Files touched (estimate)

- `pages/abstract.tsx` — new memoized anchor-color computation, new small
  rAF effect (or reused inline pattern), swap 2 of the 4 existing override
  props to computed `color-mix()` strings. No new page config field
  required — the existing `rowTitleMinContrastActive/-Inactive` etc. are
  already the target ratios; this only changes what background they're
  evaluated against.
- Possibly `experiences/abstract/components/PolymorphicLayout.tsx` — none
  expected; `scrollGradientOriginColor`/`scrollGradientResolved.maxDarken`
  already exposed from the hero work.

### Verification plan

- Dev server, `/abstract`, mobile viewport: scroll through the full range
  with the article list expanded, confirm row title/description text
  stays legible throughout (not just at rest, not just fully scrolled).
- Confirm the correction rides the exact same curve/timing as the visible
  background darken (no drift between the two).
- Confirm `/about`, `/journal`, and `/abstract`'s own desktop article list
  (the `isCoverFlowDesktopTier` branch) are visually unchanged — none of
  them touch `wideColumnTypography` or run with `scrollGradientActive` at
  their respective tiers.
- Confirm no snap: verify the `lastTsRef` reset fix is present in the new
  effect from the start (don't reintroduce the bug already found and fixed
  twice this session on the other two loops).
