# Plan: `mix-blend-mode`-based paragraph color mode

## Why this is being considered

The existing `paragraphUsesWordmarkGradient` feature (CSS `background-clip: text` +
`color: transparent`) required two rounds of real-device-only WebKit bug fixes:
1. Any descendant with `opacity < 1` (the emphasis/dim mechanism's own default
   values) got promoted to a separate GPU compositing layer on real iOS
   hardware, losing the ancestor's clipped gradient paint entirely.
2. The merged inline headline span carried `position: relative` (needed only
   by the *other*, canvas-based gradient system, for `.headlineCanvas`'s own
   absolute positioning) — confirmed via live bisection under Playwright's
   WebKit engine (which reproduces the bug the Simulator does not) that this
   one class, and only this class, made an otherwise-correctly-computed
   gradient-clipped text element paint fully blank on real hardware.

Both bugs were specific to the fragile `background-clip: text` +
`color: transparent` mechanism's interaction with real WebKit compositing.
`mix-blend-mode` is a fundamentally different, much more broadly-supported
CSS feature (Baseline widely available since January 2020) that does not use
that mechanism at all — worth assessing as a second, independent color mode.

## What `mix-blend-mode` actually does (MDN)

Blends an element's own rendered content with whatever is painted *behind*
it in the same stacking context (as opposed to `background-blend-mode`,
which blends an element's own background layers against each other). 16
standard blend functions (`multiply`, `screen`, `overlay`, `darken`,
`lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`,
`difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`) plus
two newer compositing operators (`plus-darker`, `plus-lighter`).

Key mechanics relevant here:
- It blends per-pixel against whatever's already painted behind the
  element — for a text node with no background of its own, that means only
  the actual glyph pixels have foreground content to blend; empty space
  shows the backdrop unmodified. This naturally produces a "text picks up
  color from what's behind it" look, without any clip/mask trick.
- It creates a new stacking context (documented on MDN). This is *not* the
  same failure mode we just fixed — that bug was specific to
  `background-clip: text`'s interaction with layer promotion, not stacking
  contexts in general. `mix-blend-mode` is a mainstream, independently
  battle-tested feature; the two bugs already fixed don't apply to it. That
  said, it hasn't been verified on real iOS hardware in this codebase yet —
  flagged honestly as unverified, not assumed safe.
- Not animatable. Irrelevant here (no plan to transition it).

## Feasibility: yes, with an important framing difference

This is **not** a like-for-like replacement of the gradient-clip look. It
produces a genuinely different visual result:
- **Gradient-clip mode (existing)**: the gradient's exact stops render
  *inside* the glyph shapes — pixel-identical to the wordmark's own gradient,
  static regardless of what's elsewhere on the page.
- **Blend mode (proposed)**: real, opaque, normally-colored text visually
  *tints* against whatever's painted behind it, using a blend function. The
  resulting color is a function of both the text's own base color and the
  backdrop — closer to "the text reacts to the page" than "the text renders
  the wordmark's exact palette."

Confirmed architecturally sound: `AbstractEditorialHero.module.css`'s
`.root`/`.copyColumn`/`.supportingCopy` (the hero's full ancestor chain
above the paragraph) carry no opaque `background-color` of their own — the
real page background, including `PolymorphicScrollGradientBackground` when
active, is already what's visually behind this paragraph today. Confirmed
via `PolymorphicLayout.tsx`: `wideColumnPaintColor`/`narrowColumnPaintColor`
already resolve to `'transparent'` whenever `scrollGradientActive` is true —
exactly the same gating condition this feature would share.

**Critically, this mode requires no changes to the existing text structure.**
Unlike the gradient-clip mode (which needed the ancestor `<p>` to become
`color: transparent`, needed opacity forced to 1 on every descendant, and
needed the merged headline to bypass its own canvas system and drop
`position: relative`), blend mode is a single additional CSS property layered
on top of text that stays completely normal — real color, real opacity,
real `font-weight` for emphasis, the merged headline unchanged. Every
existing mechanism (`renderEmphasisText`'s dim/emphasis opacity split,
`emphasisFontWeight`, `headlineInlineWithParagraph`) keeps working exactly
as it does today, untouched. This directly satisfies "must keep the text as
it was, with the accented words, the headline, different weights, etc."

## Two implementation strategies

### Option A — Ambient blend (blend against the real page background)

Apply `mix-blend-mode: <mode>` directly to the paragraph (`<p>`) or to
individual runs, with no new DOM. The text blends against whatever's
actually rendered behind the hero at that point on the page (the scroll
gradient, when active).

- Pros: zero new elements, trivial to add/remove, cheapest to reason about.
- Cons: the resulting color is coupled to the *live, moving* scroll-gradient
  background and the darken-overlay it applies on scroll
  (`PolymorphicScrollGradientBackground`) — the paragraph's own color would
  shift as the user scrolls, which may or may not be desired. Also weaker,
  less controllable parity with the wordmark's own specific palette (no
  guarantee the blended result reads as "the same gradient family").

### Option B — Local gradient blend (recommended)

Introduce one new absolutely-positioned `<div>`, sized and positioned to
exactly cover the paragraph's own content box, sitting immediately behind it
in stacking order, painted with the *same* `wordmarkGradientCss` string
already computed today (`linear-gradient(90deg, ...)` from
`colors.wordmarkGradientStops` — no new color logic, reuses the existing
value byte-for-byte). The paragraph's own text keeps its real, existing
color/opacity, with `mix-blend-mode: <mode>` applied to the text (or
equivalently to the gradient div, whichever direction empirically reads
better).

- Pros: reuses the exact same gradient recipe the wordmark and the
  clip-mode paragraph already use — closer, reproducible parity with the
  established palette, independent of what else is on the page or the
  current scroll position (a static local backdrop, not the live scrolling
  one). Trivial to reason about in isolation per-paragraph.
- Cons: one extra DOM node per paragraph; needs a `position: relative`
  wrapper for the local gradient div's own absolute positioning — this is
  the exact CSS property confirmed to break the *other* mechanism on real
  iOS, so it must be re-verified live under WebKit specifically for this
  new mechanism before treating it as safe (it likely is fine, since no
  `background-clip: text` is involved this time — no descendants have their
  own color:transparent inheriting through a positioned ancestor — but this
  is exactly the kind of assumption that already broke once this session and
  must not be re-asserted without a live check).

**Recommendation: Option B**, for closer palette parity and independence
from scroll/backdrop state, with the `position: relative` question flagged
explicitly as the first thing to verify live (build → WebKit screenshot),
not assumed safe by resemblance to a working pattern elsewhere.

## Proposed config surface

Given the existing `paragraphUsesWordmarkGradient: boolean` today, the
cleanest extension is a single enum rather than a second, independent
boolean living alongside it (avoids an invalid "both on" state needing its
own tie-break rule):

```ts
export type AbstractEditorialHeroParagraphGradientMode =
  | 'off'
  | 'clip'   // today's background-clip:text mechanism, renamed from the boolean
  | 'blend'; // new mix-blend-mode mechanism
paragraphWordmarkGradientMode: AbstractEditorialHeroParagraphGradientMode;
// Only meaningful in 'blend' mode:
paragraphGradientBlendMode: // a curated subset of CSS blend-mode keywords,
  'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge'
  | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion'
  | 'hue' | 'saturation' | 'color' | 'luminosity';
```

`paragraphUsesWordmarkGradient: boolean` would need a migration shim (old
`true` → `mode: 'clip'`, old `false` → `mode: 'off'`) in
`normalizeAbstractEditorialHeroConfig`, or — simpler, avoids a breaking
rename — keep the existing boolean as-is (still gates `'clip'` mode) and add
a *second*, independent `paragraphUsesWordmarkGradientBlend: boolean`
sibling, with `visibleWhen` in the panel making the two mutually exclusive
by convention (only one should be on at a time; whichever panel field is
edited second wins, matching how other mutually-exclusive-in-practice
boolean pairs already behave elsewhere in this codebase). Recommend the
simpler sibling-boolean approach unless you'd rather formalize the enum —
flagging as an open decision, not resolved in this plan.

No new color-derivation logic is needed — `paragraphGradientBlendMode`'s
default should be a value that reads well against this palette family
empirically (candidates to test live: `screen`, `overlay`, `color`,
`luminosity` — each produces a distinctly different feel; `color`/`hue`
tend to preserve the underlying text's own perceived lightness/contrast best
for legibility, `screen`/`overlay` tend to look more dramatic/saturated).

## Files touched (estimate, once approved for implementation)

- `AbstractEditorialHero.config.ts` — new field(s) as decided above.
- `AbstractEditorialHero.panel.ts` — new panel controls, `visibleWhen`-gated.
- `AbstractEditorialHero.tsx` — the new local gradient `<div>` (Option B),
  `mix-blend-mode` style application; existing `wordmarkGradientCss`
  computation is reused as-is, no changes to `renderEmphasisText` or the
  headline-merge logic at all (a meaningfully smaller diff than the
  clip-mode implementation required).
- `AbstractEditorialHero.module.css` — a small new class for the local
  gradient div's own absolute-fill positioning.

## Verification plan (non-negotiable before calling this done)

Given this session's own history, every claim here must be re-confirmed
live, not assumed by analogy:
1. Build + start a production server, load `/abstract` with the new mode on.
2. Screenshot under **actual Playwright WebKit** (not just Chromium/desktop)
   — the Simulator-vs-real-hardware gap already bit this project once this
   session; WebKit is the only local proxy that's actually reproduced the
   real bug so far.
3. Specifically re-check the local gradient div's own `position: relative`
   parent under WebKit, since that exact property broke the other mechanism.
4. Confirm the mode is off by default and every non-opted-in page is
   byte-identical to before.
5. Confirm emphasis weight, opacity dimming, and the inline-merged headline
   all still render with their existing behavior intact under this mode.
