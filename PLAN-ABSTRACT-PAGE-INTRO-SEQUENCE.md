# PLAN-ABSTRACT-PAGE-INTRO-SEQUENCE

## Why this plan exists

`/abstract` is the site's flagship page and its current load sequence
undermines that: a blank black frame, hero copy that appears before the
header it belongs under, a visible font swap mid-paragraph, a wordmark that
pops in out of nowhere, and a hero card that renders with a generic
placeholder gradient before jumping to a different size and then to its
real per-post gradient. None of this is one bug — it's five independent
pieces of async, client-only state (canvas paint, WebGL gradient mesh, font
loading, header color resolution, CoverFlow geometry) that were each built
correctly in isolation but were never given a shared "what does the visitor
see before everything is ready" contract. This plan defines that contract
and sequences the fix.

## Issue tracker

Every distinct defect identified across this plan's two evidence passes
(the original ten-frame screen recording, and the follow-up annotated
screenshots from a confirmed-restarted, hard-refreshed server), each with
a short reference ID, a plain description of what's wrong, what it should
do instead, and the operator-provided screenshot it was identified from
(saved under `evidence/abstract-page-intro/`, copied from the original
attachments so they survive independent of chat history).

| ID | Description | Expected instead | Evidence |
|---|---|---|---|
| `ABS-01` | **Black screen on initial paint.** The viewport is a solid, near-black rectangle with zero content — no background, no text, no header — for a perceptible span at the very start of every load. | First paint should never be blank. The page's real background (at minimum a static gradient/color, ideally the settled hero background) and SSR'd text content should be visible in the very first painted frame, with zero dependency on canvas, WebGL, or JS execution completing. | ![Black screen](evidence/abstract-page-intro/01-frame-black-start.png) *(original frame 1)* / ![Confirmed on restarted server](evidence/abstract-page-intro/07-restarted-server-black-screen.png) *(re-confirmed after hard restart + hard refresh)* |
| `ABS-02` | **Hero content visible before header/wordmark/nav — uncoordinated reveal order.** The hero paragraph and right-column heading/body become visible while the header row above them (wordmark + nav) is still empty, so content appears to render "bottom-up" / out of structural order. | The page should reveal top-down in one coordinated pass: header (wordmark + nav) and hero content become visible together, not as two independently-timed events with the header lagging behind. | ![Hero visible, header still empty](evidence/abstract-page-intro/02-frame-hero-visible-no-header.png) *(original frames 2-3)* |
| `ABS-03` | **Visible font swap / reflow mid-load.** The serif heading visibly jumps from a fallback-font rendering to the real `Instrument_Serif` metrics partway through the same frame, reflowing surrounding layout as it does. | The font swap (`next/font` `display: 'swap'`) should be visually imperceptible — same metrics before and after — via fallback font metric matching, so no reflow or visible restyle ever occurs. | ![Font swap mid-frame](evidence/abstract-page-intro/03-frame-font-swap.png) *(original frame 7, "notice the font change in the same frame")* |
| `ABS-04` | **Wordmark and nav missing while other content is already visible.** The "ABSTRACT · VOYAGE" wordmark and the "ABOUT / JOURNAL / CONTACT" nav are absent from the header row for a perceptible span, even after hero text and the card region have started rendering. | Wordmark and nav are text/vector content, not decoration — they must render at full opacity in the same first-paint pass as the rest of the SSR'd shell, never gated on canvas/WebGL/gradient readiness. | ![Missing wordmark + nav](evidence/abstract-page-intro/04-frame-missing-wordmark-generic-gradient.png) *(original frame 8)* |
| `ABS-05` | **Card renders as an oversized, unstyled, full-bleed panel with a generic gradient ("distorted layout").** Mid-load, the area where the CoverFlow card belongs instead shows an edge-to-edge rectangle (no rounded corners, no shadow, no card chrome, no "READ ARTICLE" link) filled with a flat, generically-toned gradient — reading as a different, wrong component rather than an undersized/mis-colored version of the real card. | This region should never render as a structurally different, unstyled panel. Either the real card's final chrome (shape, shadow, corner radius) is present from first paint with a correct static gradient approximation, or the region stays visually inert (not full-bleed, not a competing "hero panel" look) until the real card is ready to appear once, fully formed. | ![Distorted full-bleed panel](evidence/abstract-page-intro/08-restarted-server-distorted-layout.png) *("The layout is distorted" — operator annotation, confirmed on restarted server)* |
| `ABS-06` | **Card visibly resizes multiple times before settling.** The CoverFlow card's on-screen size changes at least twice during load (an oversized/reference-width state, one or more intermediate measurements, then the final size) — a visible "jump" sequence rather than one stable size. | The card should render at its final, correct size from first paint (reserved via CSS/aspect-ratio using the same config values that determine the settled size) so that later JS measurement can only confirm that size, never visibly change it. | ![Card resizing](evidence/abstract-page-intro/05-frame-card-resize.png) *(original frame 9, "notice the new card size at this point")* |
| `ABS-07` | **Flat placeholder gradient shown instead of the real final gradient.** Even once the card has the correct shape/position/chrome, the gradient painted on it is a static, flat two-tone diagonal — visibly different in character from the true animated/organic WebGL mesh gradient that eventually replaces it. | The gradient shown at first paint should already be the real, final gradient (or as close a static approximation as CSS allows, built from the same hue/palette data the WebGL mesh consumes) — not a generic or simplified stand-in that has to be visibly swapped out later. | ![Fake flat gradient](evidence/abstract-page-intro/09-restarted-server-fake-gradient.png) *("Remove this fake gradient, show the actual final gradient instead" — operator annotation, confirmed on restarted server)* |
| `ABS-08` | **Wordmark, nav, and card entirely absent with JavaScript disabled.** A no-JS check against a production build shows the hero text and background gradient degrade correctly (real SSR/CSS), but the wordmark, nav, and CoverFlow card render nothing at all — not delayed, genuinely missing from that code path. This is the concrete failure mode for crawlers, Open Graph scrapers, and any snapshot/prerender service that doesn't run JS to completion. | Wordmark, nav, and card must have a real no-JS rendering path — either genuinely SSR-independent markup/styling, or a dedicated static fallback (e.g. a purpose-built Open Graph image) that doesn't depend on the live page's JS executing at all. | *(No single-frame screenshot — reproduced via `javaScriptEnabled: false` against a production build; see Phase 1/6 below.)* |

For reference, the correct, fully-settled end state every issue above
should collapse into: ![Final correct state](evidence/abstract-page-intro/06-frame-final-correct.png) *(original frame 10)*.

## Evidence: the ten-frame sequence, decoded

| Frame | What's on screen | Root cause (file:line) |
|---|---|---|
| 1 | Solid black, nothing | No SSR content is visually meaningful until the hero's background canvas paints. The page's `<body>`/root background is black; text/header exist in the DOM (or don't yet — see frame 2) but the canvas gradient behind them hasn't rendered a frame. |
| 2–3 | Hero paragraph + right-column heading/body visible, split-band canvas gradient visible, but **no wordmark, no nav, no header split-band positioning locked** | The header's own gradient/logo color is resolved through the same canvas pipeline (`legacyGradientRenderScheduleRef`, `pages/abstract.tsx:3852-3903`) — it repaints on a `ResizeObserver` watching the headline element **and** on `document.fonts.ready` (`:3868-3888`). Until that first repaint lands, the header's derived nav/logo color can resolve to something visually indistinguishable from the background — not "missing," but effectively invisible. |
| 4 (frame 7 in the source set) | Font visibly swaps mid-frame (serif heading jumps from fallback metrics to `Instrument_Serif`) | `pages/_app.tsx:21-33` — `next/font/google` is configured with `display: 'swap'`, which is correct for avoiding invisible text (no FOIT) but by design produces a visible reflow/restyle the moment the real font arrives. Compounded here because the canvas gradient behind the text is *keyed off this same element's box* (the `ResizeObserver` above), so the font swap doesn't just re-flow text, it re-triggers a full gradient repaint. |
| 5 (frame 8) | Wordmark and hero paragraph text still missing; hero card appears at a **different size** with an **unrelated generic gradient** | Two separate mechanisms compounding: (a) the header/wordmark ink is still mid-resolution as in frames 2-3; (b) the CoverFlow card's real per-post color comes from a WebGL gradient-mesh renderer (`experiences/abstract/components/AbstractJournalLabCollection.tsx:376-400`) whose own doc comment states plainly: *"the adapter owns its settled CSS fallback"* — i.e. there is a known, intentional static CSS gradient shown before the mesh renderer boots. That fallback is generic (not this post's hue) by construction, not a bug in isolation — the bug is that it's visibly, jarringly different from the real thing and nothing hides the transition. |
| 6 (frame 9) | Card has changed size again, still mid-transition | The CoverFlow track's geometry is derived from measured container/text metrics (same font-swap/resize chain as the header). A card that sizes itself from live DOM measurement will re-measure every time an ancestor's layout shifts — and the font swap above is exactly such a shift. This is a second-order symptom of the same root cause as frame 4, not a new one. |
| 7 (frame 10) | Final state: wordmark, nav, hero paragraph, correctly sized/colored card, all settled | Everything above has resolved once: fonts loaded, canvas painted with correct measurements, WebGL mesh initialized with the real hue. |

**One root pattern, five symptoms:** nothing on this page has an
authored "not ready yet" state. Every visual — header ink, wordmark,
card gradient, card geometry — is computed from a live measurement or a
live renderer and simply shows whatever that computation currently
produces, including mid-flight garbage (wrong size, wrong color, wrong
font metrics). The fix is not five patches; it's giving the page exactly
one authored initial state, and one coordinated transition out of it.

## Measured page weight

Production build (`next build`), Pages Router route table:

- **`/abstract` First Load JS: 381 kB** — the single heaviest route on the
  site (next heaviest: `/carousel-lab` at 273 kB, `/about` at 260 kB).
  Page-specific code is only 222 B; the weight is almost entirely the
  165 kB shared bundle + the `_app` chunk (65.9 kB, includes both
  `next/font` families, `SharedDesignConfigProvider`,
  `AbstractDesignConfigProvider`, `MobileNavCube`) plus whatever
  `/abstract` itself pulls in beyond the shared baseline.
- **Live network capture** (production server, cold load, `networkidle`):
  **~412 KB transferred** — 367.9 KB JS + 43.9 KB fonts (`woff2`), 41
  requests. No large images on this route; the weight is code and fonts,
  not media.
- Framing: 381 kB First Load JS is not extreme for a Next.js site with a
  WebGL gradient renderer and a custom carousel, but it is the direct
  reason the intro is long enough to *see* every intermediate state in
  screenshots. A lighter shell won't eliminate the async work, but it
  changes what the visitor watches happen while it's in flight.

## Design principles for the new sequence

1. **Author a real "before" state — don't let live computation double as
   the initial state.** Every element that currently renders "whatever
   the last measurement produced" (header ink, wordmark color, card
   gradient, card size) needs an explicit, static, SSR-safe first frame
   that is *designed*, not incidental.
2. **Critical content is never gated on decoration.** Wordmark, primary
   nav, and hero copy are text — they must be visible in the very first
   paint, statically colored, with zero dependency on canvas/WebGL
   readiness or font-swap completion. Decoration (gradient mesh, canvas
   background) layers in on top/behind afterward; it must never be a
   precondition for text being legible.
3. **One coordinated reveal, not N independent pop-ins.** Replace the
   current "each async system reveals itself whenever it personally
   finishes" behavior with a single, short, intentional transition
   (a brief, premium cross-fade/settle) once the small number of
   genuinely-required-before-reveal signals are ready. Fewer, longer
   waits beat many small uncoordinated jumps — motion design and
   cognitive-load research agree the second reads as "broken," the first
   reads as "loading."
4. **No layout shift from font swap.** Either eliminate the visible swap
   for hero-critical text (size-adjusted fallback font matching the
   real font's metrics, so `swap` produces no reflow) or hold the
   canvas/geometry repaint pipeline off `document.fonts.ready` in a way
   that's invisible to the user (paint the settled state directly,
   don't animate through the pre-swap layout).
5. **Respect `prefers-reduced-motion`.** The new intro must have a
   reduced-motion variant: content appears with a simple opacity change
   (or instantly), no slide/scale/parallax choreography.
6. **The page must look intentional with JavaScript partially or fully
   absent** — this is the explicit crawler/social-share/snapshot
   requirement. A screenshot service, an Open Graph scraper, or a
   reduced-JS bot must see the *real* design language (correct fonts
   once loaded server-side via `next/font`, correct copy, a tasteful
   static gradient), never the "generic placeholder" frame currently
   visible in frame 8. Two independent levers cover this:
   - A static, per-post CSS gradient approximation (computed from the
     same hue data the WebGL mesh uses, just rendered as a plain CSS
     `linear-gradient` before the mesh boots) instead of today's
     unrelated generic fallback.
   - A dedicated, purpose-built Open Graph image per page/post (a
     server-rendered static asset), so social shares never depend on
     the live, JS-driven page state at all — this is the standard,
     robust solution for social cards regardless of how good the live
     intro becomes, and should not be conflated with fixing the on-page
     experience.
7. **Accessibility:** no content should ever be represented only by
   color (header ink resolution failures should never make nav text
   literally unreadable-contrast during the transition); reveal
   animations must not trigger vestibular discomfort (no large-scale
   parallax/zoom on entry); focus order must remain nav → hero → content
   regardless of the visual reveal timing (DOM order must already match
   this — verify, don't re-order via CSS in a way that desyncs from tab
   order).

## Recommended architecture: per-component readiness, one shared orchestrator

Given `pages/abstract.tsx` is already 5,851 lines and owns two independent
`<SiteHeader>` call sites, a WebGL canvas, a CoverFlow, and a card-gradient
mesh — adding a sixth ad hoc "is it ready" flag directly in the page would
make this worse, not better. Recommended shape:

- **Each async visual system exposes its own boolean readiness signal**,
  colocated with the system that owns it (not hoisted into the page):
  - `headerInkReady` — from the existing canvas repaint pipeline
    (`legacyGradientRenderScheduleRef`), flipped true after the first
    real paint completes post-`document.fonts.ready`.
  - `cardGradientMeshReady` — from `AbstractJournalLabCollection`'s WebGL
    mesh renderer (it already tracks its own init internally per the
    "adapter owns its settled CSS fallback" comment; just needs to
    surface that as a prop/callback instead of silently swapping).
  - `fontsReady` — one shared hook wrapping `document.fonts.ready`,
    reusable by any page (this becomes a small new utility,
    `hooks/useFontsReady.ts`, since `/about` and `/posts` will likely hit
    the same class of problem eventually).
- **One small orchestrator hook**, `usePageIntroSequence({ signals, minDurationMs, reducedMotion })`,
  lives alongside `PolymorphicLayout`'s other shared sibling files (same
  pattern as `usePolymorphicHeaderPresentation` from the header-ink
  centralization work) — not page-local. It combines the signals above
  into a single `introPhase: 'shell' | 'settling' | 'ready'` and exposes
  the per-phase class names/styles consumers apply. This keeps
  `pages/abstract.tsx` from growing a seventh bespoke timing system while
  still letting each visual system own its own readiness logic.
- This hook is *not* abstract-specific — write it once, adopt it on
  `/about` and `/posts` in a follow-up pass once proven here (both pages
  share the same canvas/gradient/font-swap pipeline per the header-ink
  centralization plan already in this repo).

## Phased implementation plan

**Phase 0 — instrumentation (no visual change).**
Add the `fontsReady`/`headerInkReady`/`cardGradientMeshReady` signals as
plain console-timestamped booleans first, load the page repeatedly, and
confirm the actual ordering/timing matches this document's hypothesis
before changing any visuals. (The resize/font-swap cascade in frames 8-9
is inferred from the reveal/measurement pattern already in the code, not
confirmed frame-by-frame — confirm before building the fix on top of it.)

**Phase 1 — authored "shell" frame (replaces frames 1-3).**
- Wordmark, nav links, and hero heading/paragraph render at full opacity
  and correct static color in the very first paint — no dependency on
  canvas paint, WebGL init, or `document.fonts.ready`. Use the
  page/global-typography ink token directly (the same flat hex color the
  canvas pipeline eventually derives), not a value sourced from the
  canvas.
- The header/hero background renders a static CSS gradient (a plain
  `linear-gradient` using the same stops the canvas would otherwise
  paint) behind that text from the first frame — this replaces the
  current solid-black frame 1 entirely. The canvas becomes a progressive
  *enhancement* layered on top once it boots, cross-fading in, never a
  precondition for the background having any color at all.

**Phase 2 — eliminate the visible font swap (replaces frame 4/7).**
- Add a size-adjusted fallback (`adjustFontFallback` is currently
  explicitly disabled — `pages/_app.tsx:24,31` — revisit why; if there's
  no longer a blocking reason, re-enabling it with `next/font`'s
  automatic metric matching removes the visible reflow essentially for
  free) for both `Instrument_Sans` and `Instrument_Serif`.
- Decouple the canvas repaint from `ResizeObserver` firing on every font
  swap tick: debounce, or better, paint once at `document.fonts.ready`
  resolution only (not on intermediate reflows the swap itself causes).

**Phase 3 — card gradient: static approximation, not generic fallback
(replaces frame 5/8).**
- Compute the per-post hue's CSS gradient equivalent (even a 2-3 stop
  approximation) at build/server time from the same data the WebGL mesh
  consumes, and render it as the card's actual initial background —
  not today's unrelated generic placeholder. The WebGL mesh then
  initializes and cross-fades over this already-correct-looking base,
  so even if a viewer's browser never runs the WebGL path (reduced
  motion, low-power mode, a crawler), the card already looks right.

**Phase 4 — stabilize card geometry (replaces frame 6/9).**
- Once Phase 2 removes the font-driven reflow, re-verify whether the
  card still re-measures/resizes. If it does, give the CoverFlow card a
  reserved aspect-ratio/min-size via CSS from first paint (computed from
  the same config values used for the settled size), so JS-driven
  measurement can only confirm that size, never visibly change it.

**Phase 5 — orchestrated reveal.**
- Build `usePageIntroSequence` and adopt it: `shell` phase (Phase 1's
  static state, shown immediately) → `settling` (canvas/mesh have
  booted, single coordinated cross-fade over ~200-300ms) → `ready`
  (fully interactive, decorative layers visible). Gate the transition on
  a **minimum**, not maximum, duration too — if everything resolves in
  10ms, still hold the shell for a small floor (~120-150ms) so the
  transition never looks like a flicker; but never hold shell state
  waiting on a slow signal beyond the perceptual budget below.
- Reduced-motion variant: `settling` phase duration → 0, opacity-only.

**Phase 6 — social/crawler fallback.**
- Add a dedicated static Open Graph image (per-post, server-rendered)
  independent of the live page. This is unrelated to the intro-sequence
  fix itself but closes the "systems that take previous snapshots" gap
  completely, rather than relying on Phase 1/3's static approximations
  being good enough for that purpose too.

## Perceptual timing budget (target)

| Phase | Target duration | Notes |
|---|---|---|
| First paint → shell visible | 0ms (SSR) | No blank frame ever. |
| Shell → settling begins | as soon as `fontsReady` + `cardGradientMeshReady`, floor 120ms | Whichever is slower normally dominates; instrument in Phase 0 to confirm. |
| Settling cross-fade | 200-300ms | Matches this codebase's existing `stepTiltDurationMs`/reveal-duration conventions (`Card/config/appearance.ts`) — reuse those tokens, don't invent a new timing scale. |
| Reduced motion | 0ms transition, same end state | — |

## What this does NOT change

- No redesign of the final, settled `/abstract` look (frame 10) — this
  plan is entirely about what's visible *before* that state, not the
  state itself.
- No change to the WebGL gradient-mesh renderer's actual visual output,
  only when/how it's revealed.
- Does not remove `next/font`'s `display: 'swap'` (correct choice for
  avoiding invisible text) — only aims to make the swap itself
  imperceptible via fallback metric matching.
- Does not touch `/about` or `/posts` in this pass — same class of bug
  likely exists there (they share the canvas/font pipeline), but is
  explicitly deferred to a follow-up once `usePageIntroSequence` is
  proven on `/abstract`.

## Verification plan (per this repo's AGENTS.md visual-verification rule)

- Record a fresh screen capture of full page load, before and after,
  same network throttle (Fast 3G and no-throttle), same viewport.
- Confirm zero cumulative layout shift (CLS) attributable to the card
  and header during load, via Chrome DevTools Performance/Layout Shift
  regions or Playwright's `layout-shift` API.
- Confirm the shell frame renders identically with JavaScript disabled
  (crawler simulation) and passes a manual "does this look intentional"
  check — this is the concrete test for the social/snapshot requirement.
- Confirm `prefers-reduced-motion: reduce` produces the instant variant,
  captured separately.
- Re-run the production build size check; confirm no regression to the
  381 kB First Load JS baseline from any new shared hook/utility (target:
  `usePageIntroSequence` + `useFontsReady` should add low single-digit KB).

## Component-owned introductory choreography (proposed; not implemented)

The first deliberate sequence should establish **identity → orientation →
meaning**: wordmark, then navigation, then hero. It is a reveal of an
already-settled page, not a mechanism for settling layout. Every component
must therefore be at its final geometry before its animation begins.

| Order / component | Introductory motion | Initial delay | Duration | Easing | Existing/new configuration-panel controls |
|---|---|---:|---:|---|---|
| 1. Wordmark | Preserve its designed, per-glyph fade/scale/bloom choreography. | 0ms | 400ms per glyph | `ease-in-out` | **Wordmark → Intro animation** (existing): `introEnabled`, `introInitialDelayS`, `introStepDelayS`, `introDurationS`, `introEasing`, `introDirection`, `introScalePivot`, and existing bloom controls. Default glyph step: 6ms; direction remains reverse. |
| 2. Main navigation | Opacity-only reveal at its final measured position. Reveal the navigation group together by default; optional item staggering remains off. | 440ms | 180ms | `cubic-bezier(0, 0, 0.2, 1)` | **Site header & navigation → Navigation introduction** (new group): `navIntroEnabled`, `navIntroDelayMs`, `navIntroDurationMs`, `navIntroEasing`, `navIntroItemStaggerMs` (default `0`; suggested tuning range 0–24ms). |
| 3. Hero | Opacity-only reveal of one semantic group. No translation, scale, height interpolation, accordion expansion, or text/line staggering. | 580ms | 220ms | `cubic-bezier(0, 0, 0.2, 1)` | **Editorial hero layout → Introduction** (new group): `introEnabled`, `introDelayMs`, `introDurationMs`, `introEasing`, `introMode` (initial options: `opacity`, `none`). |

The apparent overlap is intentional: the wordmark remains the first cue,
the navigation becomes available while its final glyphs settle, and the hero
enters last without prolonging time-to-content. No new top-level panel is
needed: the existing Wordmark, Site header & navigation, and Editorial hero
layout panels own their respective behavior.

### Implementation plan

1. Add one page-level `introReady` signal that is released only after the
   existing layout, breakpoint, font, and geometry gates have reached the
   stable first-frame state. Components must never calculate their delay from
   mount time.
2. Keep the wordmark's visual choreography intact. Move the page-local
   `ABSTRACT_WORDMARK_INTRO_OVERRIDE` values into its real page/config state
   so the Wordmark panel is authoritative, while preserving the current
   output: 0ms initial delay, 400ms glyph duration, 6ms glyph step, reverse
   direction, and current bloom behavior.
3. Add the navigation controls to the existing Site header panel. Animate a
   wrapper around the primary navigation only—not the entire header—and set
   its final placement before allowing opacity to change. The wrapper must
   use `transform: none` throughout.
4. Add the hero controls to the existing Editorial hero panel. Apply the
   reveal to the hero root only after the accordion's static, expanded state
   is resolved. Keep the accordion's reveal/settle timings at zero for this
   page and prohibit transform, height, and scale animation.
5. Run each component once on a fresh `/abstract` mount. Config-panel edits
   may replay only the changed component for authoring; resize observers,
   WebGL readiness, and ordinary rerenders must not replay the sequence.
6. Under `prefers-reduced-motion: reduce`, present all three components in
   their final state immediately: effective delay and duration are zero, with
   no glyph scale/bloom motion.

### Acceptance criteria

- At 0, 100, 250, 440, 580, 800, and 1000ms after a fresh load, desktop and
  narrow/mobile filmstrips show the nav, hero, timeline, and card in their
  final positions whenever visible.
- The sequence is visibly wordmark → nav → hero, with no blank/flicker frame,
  left/right translation, slide-up motion, or duplicate replay.
- The final desktop and mobile gradient paths remain untouched; this
  choreography changes only component visibility.
- Each new control is exercised through its actual config panel at its
  minimum/default/maximum relevant values, with screenshots and computed
  final-consumer styles recorded in the implementation handoff.
