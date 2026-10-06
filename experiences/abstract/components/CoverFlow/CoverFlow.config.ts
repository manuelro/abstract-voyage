import { clamp } from '../../../../helpers/clamp';

/**
 * CoverFlow's own geometry config — promoted from pages/carousel-lab.config.ts's
 * CarouselLabConfig (same field shape, same tuning), now owned by the
 * component itself rather than resolved per-page. See CoverFlow.tsx's own
 * useCoverFlowGeometry for how these ratios turn into concrete pixel values
 * per breakpoint tier.
 *
 * "Card distance": the ratio of the active card's centerGap (x-distance to
 * its first neighbour) to the active card's own width. stackSpacing
 * (further-out neighbours) tracks centerGap via stackSpacingToCenterGapRatio,
 * the original fork's own fixed 100/250 tuning.
 *
 * Split by tier (mobile/md/lg) because the value that reads correctly on a
 * wide desktop viewport does not read correctly on a real phone — confirmed
 * live in the carousel-lab spike this was promoted from.
 */
export type CoverFlowConfig = {
  /** Mobile — < 768px (unsuffixed = base/mobile-first tier). */
  cardDistanceRatio: number;
  /** Tablet — >= 768px. */
  cardDistanceRatioMd: number;
  /** Desktop — >= 1024px. */
  cardDistanceRatioLg: number;
  /** Fraction of the measured container's own width the active card should
   * occupy — Mobile (< 768px). The independent height cap below may reduce
   * the resulting width to preserve the aspect ratio. */
  cardWidthRatio: number;
  /** Card size — Tablet (>= 768px). */
  cardWidthRatioMd: number;
  /** Card size — Desktop (>= 1024px). */
  cardWidthRatioLg: number;
  /** Maximum at-rest card height in px for each tier. 0 disables the cap.
   * Width shrinks with height so cardAspectRatio remains authoritative. */
  maxCardHeightPx: number;
  maxCardHeightPxMd: number;
  maxCardHeightPxLg: number;
  /** Fixed aspect ratio (height / width) the resolved itemHeight is derived
   * from — 4/3 matches the card's own 3:4 default. */
  cardAspectRatio: number;
  /** stackSpacing / centerGap — Mobile (< 768px). Was one flat value shared
   * by every tier (the original fork's own fixed 100/250 ratio); split by
   * tier for the same reason cardDistanceRatio above already is — how
   * tightly further-out neighbours pack relative to the first neighbour
   * reads differently on a phone than on a wide desktop viewport. All three
   * tiers default to the same value, so this split is byte-identical to
   * today until an operator diverges one tier from another. */
  stackSpacingToCenterGapRatio: number;
  /** Tablet — >= 768px. Independently tunable, same rule every other tiered
   * field in this config already follows: a missing/invalid persisted value
   * falls back to THIS tier's own default, never to the mobile value. */
  stackSpacingToCenterGapRatioMd: number;
  /** Desktop — >= 1024px. Same independence as stackSpacingToCenterGapRatioMd. */
  stackSpacingToCenterGapRatioLg: number;
  /** Opt-in rhythmic distribution — Mobile (< 768px): each additional step
   * beyond the first neighbour grows stackSpacing by this percent,
   * compounding — e.g. 38 makes the 3rd card's own gap from the 2nd 38%
   * wider than the 2nd's gap from the 1st, the 4th wider again by the same
   * 38%, and so on. 0 (default): every step is the same fixed stackSpacing,
   * byte-identical to every caller before this field existed. Continuous in
   * the card's live, fractional distance from active (not just the settled
   * integer), so a drag/swipe still interpolates smoothly through
   * fractional positions exactly like the flat-spacing case already does —
   * see CoverFlow.tsx's own `x` transform for the closed-form
   * geometric-series sum this drives. Split by tier for the same reason
   * stackSpacingToCenterGapRatio above is — all three default to the same
   * value, byte-identical to today until an operator diverges a tier. */
  stackSpacingGrowthPercent: number;
  /** Tablet — >= 768px. Independently tunable, same fallback rule as every
   * other tiered field above. */
  stackSpacingGrowthPercentMd: number;
  /** Desktop — >= 1024px. Same independence as stackSpacingGrowthPercentMd. */
  stackSpacingGrowthPercentLg: number;
  /** Opt-in: by default (false) the active card's immediate neighbour sits
   * a flat centerGap away — a separately-tunable value with no required
   * relationship to stackSpacing at all, which can leave that first
   * neighbour looking cramped right up against the active card even while
   * stackSpacingGrowthPercent runs a perfectly even rhythm from the SECOND
   * neighbour onward (operator-reported, screenshot). true: centerGap
   * drops out of the resting/live position (it still governs drag/wheel
   * sensitivity elsewhere, just not where a settled card sits); stackSpacing
   * itself becomes the growth series' own first term instead, so the
   * active-to-first-neighbour gap already reads as one stackSpacing unit —
   * the exact same unit the first-to-second gap already used — and every
   * step beyond it grows by the same (1 + stackSpacingGrowthPercent/100)
   * ratio from there. No effect while stackSpacingGrowthPercent is 0. The
   * active card's own approach into the center is one continuous formula
   * with every resting neighbour in this mode — see CoverFlow.tsx's own
   * `x` transform. */
  stackSpacingGrowthIncludesFirstNeighbor: boolean;
  rotationDeg: number;
  /** How rotation is distributed as cards recede. `spread` allocates a
   * bounded rotation range across a deliberate number of neighbours, so
   * every visible card can retain a distinct silhouette. `compounding`
   * preserves the original geometric-growth controls below for legacy
   * compositions. */
  rotationDistributionMode: 'spread' | 'compounding';
  /** `recede` (default) keeps cards near active broad and narrows each
   * successive distance. `invert` intentionally does the opposite: the
   * immediate neighbour is the narrowest, then cards flatten as they recede. */
  rotationProgressionMode: 'recede' | 'invert';
  /** Edge-on ceiling for either rotation distribution — Mobile (< 768px).
   * Kept below 90deg so a card remains visible rather than collapsing into
   * a line. Split by tier for the same reason cardDistanceRatio above is;
   * all three default to the same value, byte-identical to today until an
   * operator diverges a tier. */
  rotationMaxDeg: number;
  /** Tablet — >= 768px. Independently tunable, same fallback rule as every
   * other tiered field above. */
  rotationMaxDegMd: number;
  /** Desktop — >= 1024px. Same independence as rotationMaxDegMd. */
  rotationMaxDegLg: number;
  /** Number of neighbour positions over which `rotationDeg` reaches
   * `rotationMaxDeg` in `spread` mode. Positions beyond it hold at the
   * ceiling, preventing an unbounded curve from exhausting its range early. */
  rotationSpreadDepth: number;
  /** Curve applied within `rotationSpreadDepth`: 1 is linear; values above
   * 1 keep nearby cards more legible and accelerate foreshortening toward
   * the tail. */
  rotationSpreadExponent: number;
  /** Each additional neighbour grows rotation by this percent, compounding
   * — Mobile (< 768px). Rotation growth is intentionally non-negative: a
   * negative value would make farther cards flatter than nearer cards,
   * reversing the CoverFlow depth hierarchy. Split by tier for the same
   * reason cardDistanceRatio above is; all three default to the same value,
   * byte-identical to today until an operator diverges a tier. */
  rotationDistanceGrowthPercent: number;
  /** Tablet — >= 768px. Independently tunable, same fallback rule as every
   * other tiered field above. */
  rotationDistanceGrowthPercentMd: number;
  /** Desktop — >= 1024px. Same independence as rotationDistanceGrowthPercentMd. */
  rotationDistanceGrowthPercentLg: number;
  /** When true, the immediate neighbour is the first term of the same
   * percentage series as every farther card. This is the default because it
   * gives every inactive index one consistent rotation rule. */
  rotationGrowthIncludesFirstNeighbor: boolean;
  /** Opt-in reverse-face rendering for the full rotating card plane. False
   * culls the card's entire reverse side (shell, gradient, and content),
   * preventing mirrored UI from appearing once the card turns away. */
  showCardBackface: boolean;
  /** Signed-looking distance progression is intentionally represented as a
   * non-negative blend step: each inactive position *past the first* (see
   * below) adds this fraction of the remaining distance toward the caller's
   * column color. Zero preserves the configured inactive face exactly
   * (opt-out).
   *
   * The immediate neighbor (distanceFromActive === 1 — the card at rest
   * beside the active one, and the same card mid-transition on its way to
   * becoming active) is always exempt: it renders the caller's own
   * unmodified neighbor surface color (Card Appearance's
   * neighborBackgroundMode/neighborFlatFillOpacity/-ToneOffset), identically
   * whether idle or transitioning, so an operator's Card Appearance choices
   * are never silently overridden by this step for the one card an end user
   * actually watches during a transition (BUGS-AUDIT-COVERFLOW-NEIGHBOR-
   * COLOR.md, 2026-09-03 — a shipped default step this close to 1 previously
   * made even that first neighbor read as a near-flat, near-black panel,
   * masking the real configured neighbor color entirely and producing a
   * visible mismatch against the resting idle look). This field only ever
   * recedes cards genuinely deeper in the stack (distance 2, 3, …) toward
   * the column background — see pages/abstract.tsx's own
   * columnDarkeningAmount for the exact `(distance - 1) * step` formula. */
  inactiveCardColumnDarkeningStep: number;
  /** Opt-in: recedes EVERY live-proximity effect a card can carry — not just
   * the hover/proximity-lift ceiling (CoverFlow's own `hoverMaxScale`/
   * `hoverMaxLiftPx`/`hoverMaxTiltDeg`), but also the gradient/hologram
   * engine's own proximity-driven brightness/saturation/hue-shift/pan
   * response (`AbstractPostDockHologramConfig.brightnessBoost`/
   * `saturationBoost`/`hueShiftAmount`/`offsetGain`) — the further a card
   * sits from the active slot. Both are independent live-pointer
   * subscriptions on the same card (`useCardLiftPhysics` for scale/lift/
   * tilt, a separate `usePointerProximity` feeding the gradient mesh for
   * brightness/saturation/hue), so both need the identical taper or a card
   * can still visibly brighten/saturate on settle even after its scale/tilt
   * ceiling has already been zeroed (AUDIT-COVERFLOW-PROXIMITY-JUMP.md).
   * Unlike `inactiveCardColumnDarkeningStep` above, this deliberately does
   * NOT exempt distance-1: that exemption exists there to protect an
   * operator's configured *resting* neighbor color/identity, a concern that
   * doesn't transfer here, since tapering either engine's live-hover
   * ceiling never touches a card's resting (unhovered/idle) appearance —
   * only what happens if a cursor still lingers over it. The immediate
   * neighbor is in fact the single most likely position for this to matter
   * in practice: it's the slot spatially closest to wherever the card just
   * left, and — on this page's own split-column layout — often the one
   * physically adjacent to the list a user just clicked in (confirmed live
   * against the real repro layout). See pages/abstract.tsx's own per-card
   * `ctaConfig`/`journalHologramConfig` for the exact `1 - min(1, distance *
   * step)` amplitude multiplier applied to `proximityScale`/
   * `proximityLiftPx`/`tiltMaxDegrees` before `useCardLiftPhysics`, and to
   * `brightnessBoost`/`saturationBoost`/`hueShiftAmount`/`offsetGain`
   * before the gradient mesh — distance 0 (the active card itself) is
   * always multiplier 1 by construction, no separate exemption needed.
   * Exists because a card that has already left the active slot can still
   * sit under a stationary cursor while CoverFlow's own position spring
   * carries it further out — a full-amplitude ceiling that far from a
   * card's own resting focus is what makes any residual settle timing read
   * as a visible snap/brighten rather than a receding, secondary element.
   * Zero preserves every card's hover ceiling on both engines exactly as
   * configured regardless of distance (opt-out, byte-identical to every
   * caller before this field existed).
   *
   * PLAN-COVERFLOW-CONTINUOUS-LIFT-DAMPING.md: also drives a SECOND,
   * independent taper covering exactly the region the discrete formula
   * above exempts (distance 0-1, the active card and its immediate
   * neighbor) — `AbstractJournalLabCollection.tsx`'s own continuous
   * `1 - min(1, distanceFromActiveLive * step)`, which recedes
   * `useCardLiftPhysics`'s own lift ceiling smoothly as a card's LIVE,
   * fractional position approaches the neighbor slot (during a drag/settle,
   * not only after the discrete role change lands). Raising this past `1`
   * has no effect on the discrete formula above (it already saturates at
   * `step >= 1` for every distance it applies to, `Math.min(1, ...)`
   * clamping it to the same output regardless of how far past 1 `step`
   * goes) — so this ceiling is safe to raise purely to make the continuous
   * curve reach zero at a smaller fraction of the distance-to-neighbor
   * range (more "aggressive": e.g. `step: 3` zeroes the lift ceiling by the
   * time a card is a third of the way toward the neighbor slot, rather than
   * needing the full distance). */
  inactiveCardHoverAmplitudeStep: number;
  /** Opt-in (default off): lets CoverFlow's own navigation drive the narrow
   * column's scroll-gradient saturation/darkness toward
   * narrowColumnGradientSaturationOnNavigateLg/-DarknessOnNavigateLg below
   * once the first card (index 0) stops being active, reverting to the
   * page's own base values once card 0 is active again — see
   * PLAN-COVERFLOW-NARROW-GRADIENT-SYNC.md. False is byte-identical to
   * before this whole field group existed: pages/abstract.tsx's own rAF
   * loop holds the narrow column at its base values every frame regardless
   * of articleActiveIndex, never touching them at all. A separate flag
   * rather than "leave both targets equal to the base values" as the
   * off-switch, because that reading is fragile — an operator later
   * retuning the page's own base saturation/darkness would otherwise need
   * to also remember to keep these two targets in lockstep purely to keep
   * the connection inert, an easy thing to silently break. */
  narrowColumnGradientOnNavigateEnabledLg: boolean;
  /** Only applied while narrowColumnGradientOnNavigateEnabledLg above is
   * true. Narrow-column scroll-gradient target once CoverFlow has
   * navigated away from the first card (index 0). CoverFlow.tsx never
   * reads this itself (same precedent as inactiveCardColumnDarkeningStep
   * above): pages/abstract.tsx reads it directly off its own
   * coverFlowConfig state and eases PolymorphicLayoutConfig's own
   * scrollGradientNarrowColumnSaturationLg toward it as the page's
   * articleActiveIndex leaves/returns to 0, reverting to the page's own
   * base value once card 0 is active again. Same 0-2 range
   * PolymorphicLayout.config.ts's own scrollGradientNarrowColumnSaturationLg
   * clamps to — this is a target for that exact field, not an independent
   * scale. Defaults to the pristine base value (1) even though the enable
   * flag above is the real off-switch — an operator turning the flag on
   * without also touching this field should still land on a harmless
   * no-op value, not an unrelated surprise number. */
  narrowColumnGradientSaturationOnNavigateLg: number;
  /** Companion to narrowColumnGradientSaturationOnNavigateLg above — target
   * for scrollGradientNarrowColumnDarknessLg, also gated by
   * narrowColumnGradientOnNavigateEnabledLg. Same 0-1 range that field
   * clamps to. Defaults to 0 (the base value) for the same
   * harmless-if-enabled-bare reason. */
  narrowColumnGradientDarknessOnNavigateLg: number;
  /** CSS `perspective`, px — one flat value across every tier. */
  perspectivePx: number;
  /** CSS `perspective-origin`, percent of the coverflow's own container box. */
  perspectiveOriginXPercent: number;
  perspectiveOriginYPercent: number;
  /** Closest neighbour's own translateZ magnitude at referenceWidthPx —
   * scaled by cardWidthPx / referenceWidthPx at render time so the
   * WebKit-safe depth/size relationship (see CoverFlow.tsx's own `z` doc
   * comment) holds at any resolved card size. */
  depthPxAtReferenceWidth: number;
  referenceWidthPx: number;
  /** Legibility floor — the resolved card width never goes below this,
   * regardless of container width or cardWidthRatio. */
  minCardWidthPx: number;
  enableClickToSnap: boolean;
  enableScroll: boolean;
  /** How long, in ms, wheel/trackpad input must stop arriving before a
   * scroll gesture is treated as released and settles to the nearest
   * index (PLAN-COVERFLOW-WHEEL-TRACKPAD-DRAG-PARITY.md) — the wheel-input
   * equivalent of a pointer's own `pointerup`, which wheel events have no
   * direct equivalent of. Replaces the earlier `scrollThresholdPx`
   * (accumulate-then-jump-once-a-pixel-threshold-is-crossed) model: that
   * model let one continuous trackpad swipe cross its own threshold twice
   * before its 200ms gap ever got a chance to end the gesture, since the
   * old cooldown (150ms) and gap (200ms) were both shorter than a typical
   * swipe's own duration — the operator-reported "moves two cards per
   * swipe" bug. Wheel input now tracks `positionX` continuously (matching
   * drag's own feel) and settles exactly once per gesture, so there is no
   * longer a threshold to cross more than once. */
  wheelReleaseGapMs: number;
  /** Hard ceiling, in index units, on how far continuous wheel/trackpad
   * tracking can push `positionX` past the first or last card
   * (operator-reported: an unbounded overscroll let a long trackpad swipe
   * push the edge card fully off-screen before it slid back once
   * released, confusing since the card genuinely disappeared rather than
   * just easing past its resting point — PLAN-COVERFLOW-WHEEL-TRACKPAD-
   * DRAG-PARITY.md). The excursion still has a springy, diminishing-
   * returns "give" as it approaches this ceiling (the same rubber-band
   * curve native edge-bounce scrolling uses), preserving the elastic feel
   * that already reads correctly on drag — only the maximum excursion is
   * now bounded, not the character of the resistance itself. `0` disables
   * all overscroll (a hard clamp at the first/last card, no give at all).
   * Deliberately wheel-only: dragging is bounded by a human hand's own
   * limited reach and was not reported as having this problem, and the
   * operator specifically endorsed drag's existing spring feel as
   * correct — this field does not apply to `onDrag`. */
  wheelOverscrollLimit: number;
  /** Pointer travel (px) beyond which a click-vs-drag disambiguation
   * treats the gesture as a drag, not a tap. */
  clickVsDragThresholdPx: number;
  /** How long after a card becomes active before it's considered visually
   * *settled* — i.e. its snap/rotate/translate transition has finished, so
   * it's safe to start revealing its own detail content (the meta row,
   * and — see staggeredCardRevealEnabled below — every other element)
   * instead of racing that reveal against the card still sliding into
   * place. Approximates this spring's own settle time (see the
   * `useSpring({ stiffness: 150, damping: 30, mass: 1 })` call in
   * CoverFlow.tsx) rather than reading it out of the spring itself —
   * framer-motion doesn't expose a "has this spring settled" event, only a
   * continuously-updating value. */
  activeSettleDelayMs: number;
  /** Ramps this card's own scale/lift/tilt (useCardLiftPhysics) and every
   * proximity-driven hologram term — pan (offsetX/Y), hue shift, saturation
   * boost, and brightness boost alike (GradientRenderer's own
   * hologramOffsetX/Y/hologramHueShift/hologramSaturationBoost/
   * hologramBrightnessBoost) — ceiling from 0 up to 1 as it starts
   * transitioning to active, and symmetrically back down to
   * 0 as it lands inactive — a continuous, time-driven counterpart to
   * `inactiveCardHoverAmplitudeStep` above, which does the same "recede
   * toward a flat, non-hoverable card" job but keyed on distance-from-active
   * instead of elapsed time (see that field's own doc comment). This one
   * exists because distance is always 0 for the active card itself — it
   * structurally can't help while the incoming card's own position spring
   * is still sliding into place but its proximity response is already at
   * full strength (the still-unaddressed half of
   * AUDIT-COVERFLOW-PROXIMITY-JUMP.md's original diagnosis).
   *
   * 0-1, same bounds and same "0 disables it" convention as
   * `inactiveCardHoverAmplitudeStep` — 0 is instant, byte-identical to
   * today's behavior; 1 is maximally gradual. Internally converted to a
   * real duration via the fixed, non-operator-facing
   * `ACTIVATION_RAMP_REFERENCE_DURATION_MS` reference below (the same
   * "ratio against a fixed reference" shape `depthPxAtReferenceWidth`/
   * `referenceWidthPx` already use above) rather than exposed as a literal
   * millisecond value directly — time doesn't share `inactiveCardHover
   * AmplitudeStep`'s own distance-step scale, so a literal "step per ms"
   * copy of that field's shape would cram every practically useful value
   * into an imprecise, unintuitive sliver of a 0-1 dial. Both directions
   * share one duration and easing (`useCardLiftPhysics`'s own
   * `ctaConfig.stateExitEasing`) — see pages/abstract.tsx's own
   * `renderCoverFlowItem` for where the ratio is resolved into an effective
   * duration and threaded down to both engines. */
  activationRampRate: number;
  /** Once a card settles as active (see activeSettleDelayMs above), every
   * one of its own content elements — meta row, title, excerpt, and CTA
   * alike — joins the same reveal/exit gate. This toggle only controls the
   * entrance rhythm: on = a deliberately staggered sequence, off = all
   * elements enter together. Exit never staggers; cardRevealExit* below
   * always controls one shared fade-out across the information layer. */
  staggeredCardRevealEnabled: boolean;
  /** Spacing, in ms, between each successive element's own start in the
   * staggered sequence above — ordered by ascending information value/
   * cognitive load (see CoverFlow.tsx's own reveal-computation doc
   * comment for the full ordering rationale): topic tag (0 · a glanceable
   * category, lowest load) → date + reading time (1 step · still trivial,
   * paired since they're read together) → title (2 steps · the headline,
   * the card's primary content) → excerpt (3 steps · a full sentence,
   * the highest reading load) → CTA (4 steps · a short action label, but
   * only relevant once the rest has been read). */
  staggeredCardRevealStepMs: number;
  /** Each element's own fade-in duration under the staggered sequence
   * above — shared across every element (only the delay is staggered per
   * element; duration/easing stay one deliberate, consistent motion
   * language across the whole sequence, matching this repo's own
   * ARTICLE_CARD_DETAIL_FADE_MS convention for the same kind of reveal). */
  staggeredCardRevealElementDurationMs: number;
  /** Shared CSS easing for the staggered sequence above — defaults to the
   * same curve ArticleCard's own existing detail-fade
   * (ARTICLE_CARD_DETAIL_FADE_EASING_CSS) already uses everywhere else, so
   * the staggered sequence reads as one consistent motion language with
   * the rest of the site rather than a competing one. */
  staggeredCardRevealEasingCss: string;
  /** Unlike entering — where staggeredCardRevealEnabled above opts into a
   * per-element sequence — leaving never staggers, regardless of that
   * setting: every one of a card's own detail elements fades out together
   * as one shared motion the instant it stops being the active/settled
   * card, not a replay of the entrance's own per-element delays in
   * reverse (a staggered exit reads as the UI breaking apart at different
   * times, not a deliberate sequence). This delay/duration/easing triad is
   * always in effect, not opt-in — see ArticleCard.tsx's own
   * staggerRevealExitDelayMs/-DurationMs/-EasingCss doc comments for the
   * full mechanism (a CSS attribute-selector rule keyed to the *leaving*
   * direction, resolved by the browser automatically). */
  cardRevealExitDelayMs: number;
  cardRevealExitDurationMs: number;
  cardRevealExitEasingCss: string;
  /** Opt-in (default 'spring' — today's exact behavior, byte-identical).
   * Governs the motion for every DISCRETE "jump to a specific index"
   * transition — click-to-snap, wheel-jump, an externally-requested index
   * change, and (CoverFlow's own most common trigger for this) selecting a
   * row in MobilePinnedArticleSection's expanded list. Deliberately does
   * NOT apply to drag-release settling, which stays on 'spring' regardless
   * of this field: that transition is seeded with the actual gesture's own
   * release velocity (PanInfo.velocity), and a fixed-shape curve has no
   * principled way to absorb an arbitrary continuous input velocity the way
   * a spring naturally does.
   *
   * 'gaussian': position follows a Gaussian CDF (helpers/gaussianEasing.ts)
   * — a real, named, widely-used motion-design easing family, not a
   * homemade smoothing curve. VELOCITY (the curve's own derivative) traces
   * the Gaussian bell itself: slow start, one smooth peak at the midpoint,
   * slow finish, landing at (effectively) zero velocity — the soft landing
   * is built into the curve's own shape, not tuned via spring damping. An
   * earlier attempt at this same motion used two named CSS cubic-bezier
   * curves (ease-in, then ease-out) stitched at the midpoint — velocity
   * itself didn't jump there, but the curve's higher derivatives (how the
   * RATE of acceleration changes) still kinked at the exact instant
   * velocity peaked, since two independently-authored bezier curves being
   * exact mirrors in velocity does not also make them mirrors in curvature.
   * A true Gaussian has no such kink at any order — it is smooth through
   * the peak by construction, which is what a bell-curve-accurate settle
   * requires. Note every CoverFlow card's position derives from one shared
   * value (`pos = cardIndex - positionX`), so every card — departing and
   * arriving alike — sees this identical curve shape at every instant;
   * they cannot run genuinely independent motions without decoupling their
   * transforms entirely. */
  settleMotionCurve: 'spring' | 'gaussian';
  /** 'gaussian' only. Duration for a 1-step jump (adjacent index). Longer
   * jumps add gaussianSettlePerStepDurationMs per additional index of
   * travel distance, capped at gaussianSettleMaxDurationMs — a jump across
   * many rows (e.g. selecting the last row of a long expanded list) reads
   * as a deliberately longer glide, not the same fixed-duration curve
   * sped up or truncated. */
  gaussianSettleBaseDurationMs: number;
  /** 'gaussian' only — see gaussianSettleBaseDurationMs's own doc comment. */
  gaussianSettlePerStepDurationMs: number;
  /** 'gaussian' only — ceiling on the distance-scaled duration above, so a
   * very long jump still reads as prompt rather than sluggish. */
  gaussianSettleMaxDurationMs: number;
  /** 'gaussian' only. How fast the curve FLATTENS at BOTH edges of the bell
   * (operator ask) — the bell is symmetric by construction, so one knob
   * governs both the start and the end identically. Internally, the
   * Gaussian's own scale parameter (helpers/gaussianEasing.ts's
   * createGaussianEase). Higher: more of the transition reads as
   * near-stationary at both the start and the end, with a sharper,
   * more concentrated burst of speed through the center. Lower: less
   * flattening at the edges — the curve reads closer to a gentle,
   * almost-constant-speed glide with only a mild peak.
   *
   * IMPORTANT ceiling on where this actually keeps doing something
   * (operator-reported: cranking this to its old max of 5 produced no
   * further visible change): the underlying error function saturates to
   * ±1 quickly, so beyond roughly 3.5–4 the curve's first/last ~10% of
   * travel is already numerically indistinguishable from perfectly flat
   * (confirmed: position at the 10%-elapsed mark is 0.0095 of the total
   * distance at steepness 2, but 0.0000 at steepness 4 and above — no
   * further movement of this value changes what's on screen once that
   * floor is hit). The perceptually meaningful range for actually tuning
   * "how gradual vs. how snap-like" the motion feels is roughly 0.5-3.5;
   * pushing well past that, even up to this field's own max, only extends
   * an already-flat hold at both ends rather than adding character. */
  gaussianSettleSteepness: number;
  /** Opt-in, default 'center' at every tier (byte-identical to today — the
   * matching activeCardLandingXPercent* is inert while its own tier is
   * 'center'). Decides what the REST of the stack does while the active
   * card moves to this tier's activeCardLandingXPercent*:
   * 'anchorShift' carries every card along by the same constant (today's
   * spacing rhythm — centerGap/stackSpacing — preserved exactly, just
   * recentered; since CoverFlow already renders every item unconditionally
   * and relies on the container's own overflow-hidden edge to clip
   * whatever doesn't fit, freed space on the side the anchor moved away
   * from automatically reveals more neighbour cards there, no extra
   * rendering logic required). 'activeOnly' moves just the active card
   * (and its live transition into/out of that slot), tapering to zero by
   * the immediate-neighbour slot (|pos| === 1) so every other card's rest
   * position is untouched — the tradeoff being an intentionally asymmetric
   * gap on whichever side the active card moved toward.
   * PLAN-COVERFLOW-ACTIVE-CARD-LANDING-POSITION.md. */
  activeCardLandingMode: 'center' | 'anchorShift' | 'activeOnly';
  /** Tablet — >= 768px. Independent of the base value above; a missing/
   * invalid persisted value falls back to THIS tier's own default, never to
   * the mobile value — same rule every other tiered field in this config
   * already follows. */
  activeCardLandingModeMd: 'center' | 'anchorShift' | 'activeOnly';
  /** Desktop — >= 1024px. Same independence as activeCardLandingModeMd. */
  activeCardLandingModeLg: 'center' | 'anchorShift' | 'activeOnly';
  /** 0-100, percent of the container's own measured width — where the
   * active card lands, mobile tier. 50 (default) is today's exact center.
   * Only has an effect while activeCardLandingMode (this tier) is not
   * 'center'. */
  activeCardLandingXPercent: number;
  /** Tablet — >= 768px. Same 0-100/50-default shape, independently
   * tunable, gated by activeCardLandingModeMd instead of the base mode. */
  activeCardLandingXPercentMd: number;
  /** Desktop — >= 1024px. Same shape, gated by activeCardLandingModeLg. */
  activeCardLandingXPercentLg: number;
  /** Opt-in tablet/desktop layout bridge: the active card's rendered right
   * edge follows the real right edge of the primary navigation. This takes
   * precedence over the percentage landing position at its tier. */
  alignActiveCardRightToMainNavMd: boolean;
  alignActiveCardRightToMainNavLg: boolean;
  /** Opt-in: vertically translates the complete CoverFlow composition so its
   * center follows the visible browser viewport rather than only its parent
   * column's height. Card geometry itself is not recomputed. */
  alignToVisibleViewportCenterMd: boolean;
  alignToVisibleViewportCenterLg: boolean;
  /** Opt-in (default false, byte-identical to today): resolve the initial
   * active index as the LAST item — as if the list had already been fully
   * navigated once — instead of the first. "Last" means the last position
   * in the order the list is actually NAVIGATED in, i.e. AFTER
   * `reverseItemOrder` below has been applied, not the caller's raw array
   * order — see `resolveCoverFlowStartIndex` below, the one place this
   * combination is resolved. CoverFlow.tsx itself never reads this field
   * directly — like narrowColumnGradientOnNavigateEnabledLg above, it
   * doesn't own the starting index at all; it's a fully-controlled
   * `activeIndex` prop. The actual wiring lives at the caller's own
   * initial-index resolution (pages/abstract.tsx's own
   * useArticleListCoverFlowSync call), which resolves this flag once, at
   * mount, via `resolveCoverFlowStartIndex` — flipping it later
   * re-navigates like any other external activeIndex change, it does not
   * re-trigger on every items-array change. */
  startAtEndOfList: boolean;
  /** Opt-in (default false, byte-identical to today): reverses the ORDER
   * CoverFlow renders/navigates whatever `items` array its caller passes
   * in — a purely positional flip, generic over any item shape, unlike
   * content-aware sorting (by date, title, etc.), which stays the caller's
   * own concern (e.g. pages/abstract.tsx's own
   * abstractTimelineContentConfig.order) since CoverFlow itself never reads
   * an item's fields. CoverFlow.tsx applies this at its own external
   * boundary: `activeIndex`, `onActiveIndexChange`, `onItemClick`, and the
   * index a `renderItem` implementation receives all stay in the CALLER's
   * original array order regardless of this flag — only which item sits at
   * which on-screen position (and therefore navigation direction) flips.
   * NOT independent of `startAtEndOfList` above: "reverse the order" means
   * exactly that — a reorder, nothing else — so the LAST item of the
   * navigated (reversed) sequence is necessarily a DIFFERENT article than
   * the last item of the caller's raw array (operator-reported: resolving
   * `startAtEndOfList` against the raw array instead landed on the item
   * that's now FIRST in the reversed order, collapsing "start at the end"
   * into "start at the start" the moment this flag was also on — the two
   * features fought each other instead of composing). See
   * `resolveCoverFlowStartIndex` below for the one place that composes
   * them correctly. */
  reverseItemOrder: boolean;
  /** Opt-in (default false, byte-identical to today): progressively fades out
   * the inactive cards to the LEFT of the active card as they recede. The
   * fade is normalized over exactly the number of inactive cards currently
   * VISIBLE to the left of the active card (derived live from the resolved
   * card geometry and the measured container width — see CoverFlow.tsx's own
   * `resolveVisibleLeftCardCount`), so the opacity steps down evenly and the
   * LEFTMOST still-visible card reaches `leftFadeMinOpacity` below exactly at
   * the edge of the viewport, regardless of how many cards happen to fit at
   * the current width/spacing. Only the left side is touched: the active card
   * and every card to its right stay fully opaque. Continuous in each card's
   * live, fractional distance from active (same `pos = index - scrollX` the
   * x/rotateY/z transforms already derive every frame), so a drag/settle
   * fades smoothly rather than stepping at integer positions. */
  leftFadeEnabled: boolean;
  /** Only meaningful while `leftFadeEnabled` above is true. The opacity the
   * leftmost currently-visible inactive card settles at — 0 (default) fades
   * it fully to invisible by the viewport edge; a higher value leaves the
   * far cards partially visible. 0-1. */
  leftFadeMinOpacity: number;
  /** Turns the carousel into a seamless infinite loop. It is enabled in the
   * shipped composition so card supply remains continuous at both ends;
   * setting it false restores bounded navigation. Instead of clamping the position to
   * `[0, itemCount - 1]`, each real card is rendered at its NEAREST wrapped
   * copy around the current position (`wrapDelta(index - position, itemCount)`
   * in CoverFlow.tsx), so both sides of the active card always stay populated
   * — the same cards act as the "runway" as they wrap around, never leaving an
   * empty edge, and there is no special end-of-list state to reach: navigating
   * past the last card continues straight onto the first and vice versa. The
   * reported `activeIndex` (via `onActiveIndexChange`) always stays a normal
   * `[0, itemCount)` index, so a paired list/timeline follows a loop back to
   * item 0 through its own existing active-index handling (e.g. AboutTimeline's
   * bring-active-row-into-view scroll) with no extra wiring. Applies to the
   * component's own internal navigation (drag, wheel, click-to-snap,
   * keyboard/programmatic `activeIndex` changes); an externally-driven
   * instance (the mobile pinned scroll-sync) is unaffected — its position is
   * owned by the parent. Needs enough items to fill the visible runway on both
   * sides; with very few items the same card can appear on both sides at once
   * (inherent to wrapping a short pool). */
  infiniteLoopEnabled: boolean;
};

const DEFAULT_CARD_WIDTH_RATIO = 0.62;
const DEFAULT_PERSPECTIVE_PX = 1000;

/** Non-operator-facing — see `activationRampRate`'s own doc comment for why
 * this is a fixed reference rather than a panel field. 800ms matches the
 * position spring's own real settle-time upper bound (the same derivation
 * `activeSettleDelayMs`'s original audit already used). */
export const ACTIVATION_RAMP_REFERENCE_DURATION_MS = 800;

export const DEFAULT_COVER_FLOW_CONFIG = {
  cardDistanceRatio: 1.5,
  cardDistanceRatioMd: 1.37,
  cardDistanceRatioLg: 0.64,
  cardWidthRatio: 0.75,
  cardWidthRatioMd: 0.45,
  cardWidthRatioLg: 0.4,
  maxCardHeightPx: 1560,
  maxCardHeightPxMd: 520,
  maxCardHeightPxLg: 540,
  cardAspectRatio: 4 / 3,
  stackSpacingToCenterGapRatio: 2,
  stackSpacingToCenterGapRatioMd: 2,
  stackSpacingToCenterGapRatioLg: 2,
  stackSpacingGrowthPercent: 1,
  stackSpacingGrowthPercentMd: 59,
  stackSpacingGrowthPercentLg: -1,
  stackSpacingGrowthIncludesFirstNeighbor: true,
  // Each inactive index is one term in the same positive percentage series:
  // 12, 24, 48deg cap. The active card remains at 0deg; keeping the cap at
  // the last reliably narrowing angle prevents far cards from widening
  // again through perspective distortion.
  rotationDeg: 25,
  rotationDistributionMode: 'compounding',
  rotationProgressionMode: 'recede',
  rotationMaxDeg: 90,
  rotationMaxDegMd: 90,
  rotationMaxDegLg: 90,
  rotationSpreadDepth: 7,
  rotationSpreadExponent: 0.25,
  rotationDistanceGrowthPercent: 100,
  rotationDistanceGrowthPercentMd: 138,
  rotationDistanceGrowthPercentLg: 200,
  rotationGrowthIncludesFirstNeighbor: true,
  showCardBackface: false,
  inactiveCardColumnDarkeningStep: 1,
  // Was 1 — operator-reported: even after PLAN-COVERFLOW-CONTINUOUS-LIFT-
  // DAMPING.md, a drag-release still showed a smaller-but-visible lift
  // pop, because at step 1 the continuous lift ceiling (see this field's
  // own doc comment) only reaches exactly 0 once the card's live drag
  // position has traveled the FULL distance to the neighbor slot — most
  // real gestures (quick drags, velocity-projected snaps) release well
  // before that. 3 zeroes the lift ceiling by a third of the way there,
  // giving realistic gestures enough runway to already be fully damped by
  // release. Has no effect on the discrete hologram/CTA-ceiling taper this
  // same field also drives (already saturated at step >= 1 for the
  // distances it applies to — see this field's own doc comment).
  inactiveCardHoverAmplitudeStep: 3,
  narrowColumnGradientOnNavigateEnabledLg: false,
  narrowColumnGradientSaturationOnNavigateLg: 1.3,
  narrowColumnGradientDarknessOnNavigateLg: 0.04,
  perspectivePx: 1010,
  perspectiveOriginXPercent: 50,
  perspectiveOriginYPercent: 50,
  depthPxAtReferenceWidth: 290,
  referenceWidthPx: 1000,
  minCardWidthPx: 355,
  enableClickToSnap: true,
  enableScroll: true,
  // Matches the prior accumulator model's own gap-reset constant exactly —
  // zero behavior change for a gesture ending in a genuine pause.
  wheelReleaseGapMs: 200,
  // Comfortably keeps a fully-centered edge card inside the viewport across
  // realistic card-width/spacing configs, while still giving a clearly
  // felt springy resistance rather than a dead hard stop.
  wheelOverscrollLimit: 0.3,
  clickVsDragThresholdPx: 6,
  activeSettleDelayMs: 160,
  // Echoes inactiveCardHoverAmplitudeStep's own original (later-superseded)
  // default — a familiar starting point to tune live from, giving 400ms
  // under ACTIVATION_RAMP_REFERENCE_DURATION_MS above.
  activationRampRate: 1,
  staggeredCardRevealEnabled: true,
  staggeredCardRevealStepMs: 90,
  // Matches components/ArticleCard.detailFade.ts's own
  // ARTICLE_CARD_DETAIL_FADE_MS/-EASING_CSS exactly — same reveal language
  // as every other detail-fade on this card, not a competing one.
  staggeredCardRevealElementDurationMs: 480,
  staggeredCardRevealEasingCss: 'ease-out',
  cardRevealExitDelayMs: 20,
  cardRevealExitDurationMs: 320,
  cardRevealExitEasingCss: 'ease-out',
  settleMotionCurve: 'gaussian',
  gaussianSettleBaseDurationMs: 980,
  gaussianSettlePerStepDurationMs: 290,
  gaussianSettleMaxDurationMs: 1290,
  // Was 5 — inside the erf-saturated zone where the curve's first/last ~10%
  // of travel is already numerically flat (see this field's own doc comment
  // for the operator-reported "no visible effect" this caused). 2 sits
  // solidly in the range where raising or lowering this value actually
  // changes what's on screen.
  gaussianSettleSteepness: 4.2,
  activeCardLandingMode: 'center',
  activeCardLandingModeMd: 'activeOnly',
  activeCardLandingModeLg: 'anchorShift',
  activeCardLandingXPercent: 50,
  activeCardLandingXPercentMd: 74,
  activeCardLandingXPercentLg: 72,
  alignActiveCardRightToMainNavMd: false,
  alignActiveCardRightToMainNavLg: true,
  alignToVisibleViewportCenterMd: true,
  alignToVisibleViewportCenterLg: true,
  startAtEndOfList: true,
  reverseItemOrder: true,
  // A loop has no terminal edge. Fading the left runway makes the wrapped
  // successor cards disappear precisely when the final card is selected,
  // defeating the continuity cue the loop is meant to provide.
  leftFadeEnabled: true,
  leftFadeMinOpacity: 0.5,
  // A CoverFlow has no meaningful terminal state: reaching the final story
  // must preserve the same populated left runway as every other position.
  infiniteLoopEnabled: false,
} satisfies CoverFlowConfig;

const CARD_DISTANCE_RATIO_MIN = 0.2;
// Was 1.5 — too low for an operator to ever push a neighbour fully off
// screen: a neighbour only clears the container edge once cardDistanceRatio
// >= 0.5 + (containerWidthPx / 2) / itemWidth, which at this tier's typical
// resolved card width (~400-450px against a ~900px container) lands around
// 1.6-1.7, above the old ceiling. 2.5 gives comfortable headroom past that
// threshold without disproportionately widening the range (operator ask —
// "make both inactive cards slide out of view but respect the current
// motion": raising this ratio only moves each card's RESTING position
// further along the same pos * centerGap formula the spring/gaussian
// settle already animates, so drag/click/wheel motion is unaffected).
const CARD_DISTANCE_RATIO_MAX = 2.5;
const CARD_WIDTH_RATIO_MIN = 0.1;
const CARD_WIDTH_RATIO_MAX = 1;
export const MAX_CARD_HEIGHT_PX_MIN = 0;
export const MAX_CARD_HEIGHT_PX_MAX = 2400;

/** Apply the optional height ceiling without distorting the card. This may
 * reduce width below minCardWidthPx: an explicit max height wins over the
 * width floor when the two constraints conflict. */
export function capCoverFlowCardSize(
  widthPx: number,
  aspectRatio: number,
  maxHeightPx: number,
): { width: number; height: number } {
  const heightPx = widthPx * aspectRatio;
  return maxHeightPx > 0 && heightPx > maxHeightPx
    ? { width: maxHeightPx / aspectRatio, height: maxHeightPx }
    : { width: widthPx, height: heightPx };
}

/** The one place `startAtEndOfList` and `reverseItemOrder` compose. Returns
 * an index into the CALLER's own, un-reversed `items` array (the same index
 * space `CoverFlow`'s own `activeIndex`/`onActiveIndexChange` props already
 * use — see `reverseItemOrder`'s own doc comment) that lands on whichever
 * item ends up LAST once CoverFlow's internal reversal (if any) is applied.
 * `reverseItemOrder` reorders the caller's array for navigation only — it
 * does not change what "last" means, so the item that satisfies "the end of
 * the list" necessarily changes too: with the order reversed, the caller's
 * own item 0 is what now sits last. Without this, resolving
 * `startAtEndOfList` against the caller's raw array length (today's default,
 * `itemCount - 1`) instead lands on the item that `reverseItemOrder` just
 * moved to the FRONT, collapsing "start at the end" into "start at the
 * start" the moment both flags are on together (operator-reported,
 * screenshot). */
export function resolveCoverFlowStartIndex(
  config: Pick<CoverFlowConfig, 'startAtEndOfList' | 'reverseItemOrder'>,
  itemCount: number,
): number {
  if (itemCount <= 0 || !config.startAtEndOfList) return 0;
  return config.reverseItemOrder ? 0 : itemCount - 1;
}

const PERSPECTIVE_PX_MIN = 200;
const PERSPECTIVE_PX_MAX = 4000;
const PERSPECTIVE_ORIGIN_PERCENT_MIN = -50;
const PERSPECTIVE_ORIGIN_PERCENT_MAX = 150;
const ROTATION_DEG_MIN = 0;
const ROTATION_DEG_MAX = 90;
const ROTATION_SPREAD_DEPTH_MIN = 1;
const ROTATION_SPREAD_DEPTH_MAX = 20;
const ROTATION_SPREAD_EXPONENT_MIN = 0.25;
const ROTATION_SPREAD_EXPONENT_MAX = 4;
const ROTATION_DISTRIBUTION_MODES: ReadonlyArray<CoverFlowConfig['rotationDistributionMode']> = [
  'spread', 'compounding',
];
const ROTATION_PROGRESSION_MODES: ReadonlyArray<CoverFlowConfig['rotationProgressionMode']> = [
  'recede', 'invert',
];
// Negative values would shrink spacing/rotation per step instead of
// growing it (the inverse of "rhythmic distribution"), which is a coherent
// enough request to allow rather than reject — the ceiling just keeps a
// handful of cards from compounding into an absurd, off-screen spread.
const DISTANCE_GROWTH_PERCENT_MIN = -90;
const DISTANCE_GROWTH_PERCENT_MAX = 200;
const ROTATION_GROWTH_PERCENT_MIN = 0;
const ROTATION_GROWTH_PERCENT_MAX = 200;
const INACTIVE_CARD_COLUMN_DARKENING_STEP_MIN = 0;
const INACTIVE_CARD_COLUMN_DARKENING_STEP_MAX = 1;
const INACTIVE_CARD_HOVER_AMPLITUDE_STEP_MIN = 0;
// Was 1 — raised so the continuous lift-damping curve this field also
// drives (PLAN-COVERFLOW-CONTINUOUS-LIFT-DAMPING.md) can be tuned to zero
// out well before a card's live position reaches the neighbor slot. Safe
// for the discrete hologram/CTA-ceiling taper this field predates: that
// formula already saturates at step >= 1 for every distance it applies to,
// so nothing above 1 changes its output.
const INACTIVE_CARD_HOVER_AMPLITUDE_STEP_MAX = 4;
// Same range PolymorphicLayout.config.ts's own
// scrollGradientNarrowColumnSaturationLg clamps to — this is a target for
// that exact field, not an independent scale.
const NARROW_COLUMN_GRADIENT_SATURATION_ON_NAVIGATE_MIN = 0;
const NARROW_COLUMN_GRADIENT_SATURATION_ON_NAVIGATE_MAX = 2;
// Same range PolymorphicLayout.config.ts's own
// scrollGradientNarrowColumnDarknessLg clamps to.
const NARROW_COLUMN_GRADIENT_DARKNESS_ON_NAVIGATE_MIN = 0;
const NARROW_COLUMN_GRADIENT_DARKNESS_ON_NAVIGATE_MAX = 1;
const DEPTH_PX_MIN = 0;
const DEPTH_PX_MAX = 2000;
const REFERENCE_WIDTH_PX_MIN = 50;
const REFERENCE_WIDTH_PX_MAX = 1000;
const MIN_CARD_WIDTH_PX_MIN = 50;
const MIN_CARD_WIDTH_PX_MAX = 500;
const WHEEL_RELEASE_GAP_MS_MIN = 50;
const WHEEL_RELEASE_GAP_MS_MAX = 1000;
const WHEEL_OVERSCROLL_LIMIT_MIN = 0;
const WHEEL_OVERSCROLL_LIMIT_MAX = 1;
const CLICK_VS_DRAG_THRESHOLD_PX_MIN = 1;
const CLICK_VS_DRAG_THRESHOLD_PX_MAX = 50;
const STACK_SPACING_RATIO_MIN = 0;
const STACK_SPACING_RATIO_MAX = 2;
const CARD_ASPECT_RATIO_MIN = 0.2;
const CARD_ASPECT_RATIO_MAX = 5;
const ACTIVE_SETTLE_DELAY_MS_MIN = 0;
const ACTIVE_SETTLE_DELAY_MS_MAX = 3000;
const ACTIVATION_RAMP_RATE_MIN = 0;
const ACTIVATION_RAMP_RATE_MAX = 1;
const STAGGERED_CARD_REVEAL_STEP_MS_MIN = 0;
const STAGGERED_CARD_REVEAL_STEP_MS_MAX = 1000;
const STAGGERED_CARD_REVEAL_ELEMENT_DURATION_MS_MIN = 0;
const STAGGERED_CARD_REVEAL_ELEMENT_DURATION_MS_MAX = 3000;
const CARD_REVEAL_EXIT_DELAY_MS_MIN = 0;
const CARD_REVEAL_EXIT_DELAY_MS_MAX = 2000;
const CARD_REVEAL_EXIT_DURATION_MS_MIN = 0;
const CARD_REVEAL_EXIT_DURATION_MS_MAX = 3000;
const GAUSSIAN_SETTLE_DURATION_MS_MIN = 100;
const GAUSSIAN_SETTLE_DURATION_MS_MAX = 3000;
const GAUSSIAN_SETTLE_PER_STEP_DURATION_MS_MIN = 0;
const GAUSSIAN_SETTLE_PER_STEP_DURATION_MS_MAX = 1000;
const GAUSSIAN_SETTLE_STEEPNESS_MIN = 0.5;
// 100% higher than the original 5 ceiling (operator ask: the effect wasn't
// reading as strongly as expected even pinned at the old max) — see this
// field's own doc comment for why headroom this high can matter at typical
// (sub-second) settle durations.
const GAUSSIAN_SETTLE_STEEPNESS_MAX = 10;
const ACTIVE_CARD_LANDING_X_PERCENT_MIN = 0;
const ACTIVE_CARD_LANDING_X_PERCENT_MAX = 100;
const LEFT_FADE_MIN_OPACITY_MIN = 0;
const LEFT_FADE_MIN_OPACITY_MAX = 1;
const ACTIVE_CARD_LANDING_MODES: ReadonlyArray<CoverFlowConfig['activeCardLandingMode']> = [
  'center', 'anchorShift', 'activeOnly',
];
const landingMode = (
  value: unknown,
  fallback: CoverFlowConfig['activeCardLandingMode'],
): CoverFlowConfig['activeCardLandingMode'] => (
  ACTIVE_CARD_LANDING_MODES.includes(value as CoverFlowConfig['activeCardLandingMode'])
    ? value as CoverFlowConfig['activeCardLandingMode']
    : fallback
);

export function normalizeCoverFlowConfig(
  config: Partial<CoverFlowConfig> | undefined,
): CoverFlowConfig {
  const base = { ...DEFAULT_COVER_FLOW_CONFIG, ...(config ?? {}) };
  return {
    cardDistanceRatio: clamp(base.cardDistanceRatio, CARD_DISTANCE_RATIO_MIN, CARD_DISTANCE_RATIO_MAX),
    cardDistanceRatioMd: clamp(base.cardDistanceRatioMd, CARD_DISTANCE_RATIO_MIN, CARD_DISTANCE_RATIO_MAX),
    cardDistanceRatioLg: clamp(base.cardDistanceRatioLg, CARD_DISTANCE_RATIO_MIN, CARD_DISTANCE_RATIO_MAX),
    cardWidthRatio: clamp(base.cardWidthRatio, CARD_WIDTH_RATIO_MIN, CARD_WIDTH_RATIO_MAX),
    cardWidthRatioMd: clamp(base.cardWidthRatioMd, CARD_WIDTH_RATIO_MIN, CARD_WIDTH_RATIO_MAX),
    cardWidthRatioLg: clamp(base.cardWidthRatioLg, CARD_WIDTH_RATIO_MIN, CARD_WIDTH_RATIO_MAX),
    maxCardHeightPx: clamp(base.maxCardHeightPx, MAX_CARD_HEIGHT_PX_MIN, MAX_CARD_HEIGHT_PX_MAX),
    maxCardHeightPxMd: clamp(base.maxCardHeightPxMd, MAX_CARD_HEIGHT_PX_MIN, MAX_CARD_HEIGHT_PX_MAX),
    maxCardHeightPxLg: clamp(base.maxCardHeightPxLg, MAX_CARD_HEIGHT_PX_MIN, MAX_CARD_HEIGHT_PX_MAX),
    cardAspectRatio: clamp(base.cardAspectRatio, CARD_ASPECT_RATIO_MIN, CARD_ASPECT_RATIO_MAX),
    stackSpacingToCenterGapRatio: clamp(
      base.stackSpacingToCenterGapRatio, STACK_SPACING_RATIO_MIN, STACK_SPACING_RATIO_MAX,
    ),
    stackSpacingToCenterGapRatioMd: clamp(
      base.stackSpacingToCenterGapRatioMd, STACK_SPACING_RATIO_MIN, STACK_SPACING_RATIO_MAX,
    ),
    stackSpacingToCenterGapRatioLg: clamp(
      base.stackSpacingToCenterGapRatioLg, STACK_SPACING_RATIO_MIN, STACK_SPACING_RATIO_MAX,
    ),
    stackSpacingGrowthPercent: clamp(
      base.stackSpacingGrowthPercent, DISTANCE_GROWTH_PERCENT_MIN, DISTANCE_GROWTH_PERCENT_MAX,
    ),
    stackSpacingGrowthPercentMd: clamp(
      base.stackSpacingGrowthPercentMd, DISTANCE_GROWTH_PERCENT_MIN, DISTANCE_GROWTH_PERCENT_MAX,
    ),
    stackSpacingGrowthPercentLg: clamp(
      base.stackSpacingGrowthPercentLg, DISTANCE_GROWTH_PERCENT_MIN, DISTANCE_GROWTH_PERCENT_MAX,
    ),
    stackSpacingGrowthIncludesFirstNeighbor: Boolean(base.stackSpacingGrowthIncludesFirstNeighbor),
    rotationDeg: clamp(base.rotationDeg, ROTATION_DEG_MIN, ROTATION_DEG_MAX),
    rotationDistributionMode: ROTATION_DISTRIBUTION_MODES.includes(base.rotationDistributionMode)
      ? base.rotationDistributionMode
      : DEFAULT_COVER_FLOW_CONFIG.rotationDistributionMode,
    rotationProgressionMode: ROTATION_PROGRESSION_MODES.includes(base.rotationProgressionMode)
      ? base.rotationProgressionMode
      : DEFAULT_COVER_FLOW_CONFIG.rotationProgressionMode,
    rotationMaxDeg: clamp(base.rotationMaxDeg, ROTATION_DEG_MIN, ROTATION_DEG_MAX),
    rotationMaxDegMd: clamp(base.rotationMaxDegMd, ROTATION_DEG_MIN, ROTATION_DEG_MAX),
    rotationMaxDegLg: clamp(base.rotationMaxDegLg, ROTATION_DEG_MIN, ROTATION_DEG_MAX),
    rotationSpreadDepth: Math.round(clamp(
      base.rotationSpreadDepth, ROTATION_SPREAD_DEPTH_MIN, ROTATION_SPREAD_DEPTH_MAX,
    )),
    rotationSpreadExponent: clamp(
      base.rotationSpreadExponent, ROTATION_SPREAD_EXPONENT_MIN, ROTATION_SPREAD_EXPONENT_MAX,
    ),
    rotationDistanceGrowthPercent: clamp(
      base.rotationDistanceGrowthPercent, ROTATION_GROWTH_PERCENT_MIN, ROTATION_GROWTH_PERCENT_MAX,
    ),
    rotationDistanceGrowthPercentMd: clamp(
      base.rotationDistanceGrowthPercentMd, ROTATION_GROWTH_PERCENT_MIN, ROTATION_GROWTH_PERCENT_MAX,
    ),
    rotationDistanceGrowthPercentLg: clamp(
      base.rotationDistanceGrowthPercentLg, ROTATION_GROWTH_PERCENT_MIN, ROTATION_GROWTH_PERCENT_MAX,
    ),
    rotationGrowthIncludesFirstNeighbor: Boolean(base.rotationGrowthIncludesFirstNeighbor),
    // Reverse-face rendering is deliberately an explicit opt-in: persisted
    // truthy values do not accidentally expose a mirrored card.
    showCardBackface: base.showCardBackface === true,
    inactiveCardColumnDarkeningStep: clamp(
      base.inactiveCardColumnDarkeningStep,
      INACTIVE_CARD_COLUMN_DARKENING_STEP_MIN,
      INACTIVE_CARD_COLUMN_DARKENING_STEP_MAX,
    ),
    inactiveCardHoverAmplitudeStep: clamp(
      base.inactiveCardHoverAmplitudeStep,
      INACTIVE_CARD_HOVER_AMPLITUDE_STEP_MIN,
      INACTIVE_CARD_HOVER_AMPLITUDE_STEP_MAX,
    ),
    narrowColumnGradientOnNavigateEnabledLg: base.narrowColumnGradientOnNavigateEnabledLg === true,
    narrowColumnGradientSaturationOnNavigateLg: clamp(
      base.narrowColumnGradientSaturationOnNavigateLg,
      NARROW_COLUMN_GRADIENT_SATURATION_ON_NAVIGATE_MIN,
      NARROW_COLUMN_GRADIENT_SATURATION_ON_NAVIGATE_MAX,
    ),
    narrowColumnGradientDarknessOnNavigateLg: clamp(
      base.narrowColumnGradientDarknessOnNavigateLg,
      NARROW_COLUMN_GRADIENT_DARKNESS_ON_NAVIGATE_MIN,
      NARROW_COLUMN_GRADIENT_DARKNESS_ON_NAVIGATE_MAX,
    ),
    perspectivePx: clamp(base.perspectivePx, PERSPECTIVE_PX_MIN, PERSPECTIVE_PX_MAX),
    perspectiveOriginXPercent: clamp(
      base.perspectiveOriginXPercent, PERSPECTIVE_ORIGIN_PERCENT_MIN, PERSPECTIVE_ORIGIN_PERCENT_MAX,
    ),
    perspectiveOriginYPercent: clamp(
      base.perspectiveOriginYPercent, PERSPECTIVE_ORIGIN_PERCENT_MIN, PERSPECTIVE_ORIGIN_PERCENT_MAX,
    ),
    depthPxAtReferenceWidth: clamp(base.depthPxAtReferenceWidth, DEPTH_PX_MIN, DEPTH_PX_MAX),
    referenceWidthPx: clamp(base.referenceWidthPx, REFERENCE_WIDTH_PX_MIN, REFERENCE_WIDTH_PX_MAX),
    minCardWidthPx: clamp(base.minCardWidthPx, MIN_CARD_WIDTH_PX_MIN, MIN_CARD_WIDTH_PX_MAX),
    enableClickToSnap: base.enableClickToSnap,
    enableScroll: base.enableScroll,
    wheelReleaseGapMs: Math.round(
      clamp(base.wheelReleaseGapMs, WHEEL_RELEASE_GAP_MS_MIN, WHEEL_RELEASE_GAP_MS_MAX),
    ),
    wheelOverscrollLimit: clamp(
      base.wheelOverscrollLimit, WHEEL_OVERSCROLL_LIMIT_MIN, WHEEL_OVERSCROLL_LIMIT_MAX,
    ),
    clickVsDragThresholdPx: clamp(
      base.clickVsDragThresholdPx, CLICK_VS_DRAG_THRESHOLD_PX_MIN, CLICK_VS_DRAG_THRESHOLD_PX_MAX,
    ),
    activeSettleDelayMs: clamp(
      base.activeSettleDelayMs, ACTIVE_SETTLE_DELAY_MS_MIN, ACTIVE_SETTLE_DELAY_MS_MAX,
    ),
    activationRampRate: clamp(
      base.activationRampRate, ACTIVATION_RAMP_RATE_MIN, ACTIVATION_RAMP_RATE_MAX,
    ),
    staggeredCardRevealEnabled: base.staggeredCardRevealEnabled === true,
    staggeredCardRevealStepMs: clamp(
      base.staggeredCardRevealStepMs, STAGGERED_CARD_REVEAL_STEP_MS_MIN, STAGGERED_CARD_REVEAL_STEP_MS_MAX,
    ),
    staggeredCardRevealElementDurationMs: clamp(
      base.staggeredCardRevealElementDurationMs,
      STAGGERED_CARD_REVEAL_ELEMENT_DURATION_MS_MIN,
      STAGGERED_CARD_REVEAL_ELEMENT_DURATION_MS_MAX,
    ),
    staggeredCardRevealEasingCss: typeof base.staggeredCardRevealEasingCss === 'string'
      && base.staggeredCardRevealEasingCss.length > 0
      ? base.staggeredCardRevealEasingCss
      : DEFAULT_COVER_FLOW_CONFIG.staggeredCardRevealEasingCss,
    cardRevealExitDelayMs: clamp(
      base.cardRevealExitDelayMs, CARD_REVEAL_EXIT_DELAY_MS_MIN, CARD_REVEAL_EXIT_DELAY_MS_MAX,
    ),
    cardRevealExitDurationMs: clamp(
      base.cardRevealExitDurationMs, CARD_REVEAL_EXIT_DURATION_MS_MIN, CARD_REVEAL_EXIT_DURATION_MS_MAX,
    ),
    cardRevealExitEasingCss: typeof base.cardRevealExitEasingCss === 'string'
      && base.cardRevealExitEasingCss.length > 0
      ? base.cardRevealExitEasingCss
      : DEFAULT_COVER_FLOW_CONFIG.cardRevealExitEasingCss,
    settleMotionCurve: base.settleMotionCurve === 'gaussian' ? 'gaussian' : 'spring',
    gaussianSettleBaseDurationMs: clamp(
      base.gaussianSettleBaseDurationMs, GAUSSIAN_SETTLE_DURATION_MS_MIN, GAUSSIAN_SETTLE_DURATION_MS_MAX,
    ),
    gaussianSettlePerStepDurationMs: clamp(
      base.gaussianSettlePerStepDurationMs,
      GAUSSIAN_SETTLE_PER_STEP_DURATION_MS_MIN,
      GAUSSIAN_SETTLE_PER_STEP_DURATION_MS_MAX,
    ),
    gaussianSettleMaxDurationMs: clamp(
      base.gaussianSettleMaxDurationMs, GAUSSIAN_SETTLE_DURATION_MS_MIN, GAUSSIAN_SETTLE_DURATION_MS_MAX,
    ),
    gaussianSettleSteepness: clamp(
      base.gaussianSettleSteepness, GAUSSIAN_SETTLE_STEEPNESS_MIN, GAUSSIAN_SETTLE_STEEPNESS_MAX,
    ),
    activeCardLandingMode: landingMode(
      base.activeCardLandingMode, DEFAULT_COVER_FLOW_CONFIG.activeCardLandingMode,
    ),
    activeCardLandingModeMd: landingMode(
      base.activeCardLandingModeMd, DEFAULT_COVER_FLOW_CONFIG.activeCardLandingModeMd,
    ),
    activeCardLandingModeLg: landingMode(
      base.activeCardLandingModeLg, DEFAULT_COVER_FLOW_CONFIG.activeCardLandingModeLg,
    ),
    activeCardLandingXPercent: clamp(
      base.activeCardLandingXPercent, ACTIVE_CARD_LANDING_X_PERCENT_MIN, ACTIVE_CARD_LANDING_X_PERCENT_MAX,
    ),
    activeCardLandingXPercentMd: clamp(
      base.activeCardLandingXPercentMd, ACTIVE_CARD_LANDING_X_PERCENT_MIN, ACTIVE_CARD_LANDING_X_PERCENT_MAX,
    ),
    activeCardLandingXPercentLg: clamp(
      base.activeCardLandingXPercentLg, ACTIVE_CARD_LANDING_X_PERCENT_MIN, ACTIVE_CARD_LANDING_X_PERCENT_MAX,
    ),
    alignActiveCardRightToMainNavMd: base.alignActiveCardRightToMainNavMd === true,
    alignActiveCardRightToMainNavLg: base.alignActiveCardRightToMainNavLg === true,
    alignToVisibleViewportCenterMd: base.alignToVisibleViewportCenterMd === true,
    alignToVisibleViewportCenterLg: base.alignToVisibleViewportCenterLg === true,
    startAtEndOfList: base.startAtEndOfList === true,
    reverseItemOrder: base.reverseItemOrder === true,
    leftFadeEnabled: base.leftFadeEnabled === true,
    leftFadeMinOpacity: clamp(
      base.leftFadeMinOpacity, LEFT_FADE_MIN_OPACITY_MIN, LEFT_FADE_MIN_OPACITY_MAX,
    ),
    infiniteLoopEnabled: base.infiniteLoopEnabled === true,
  };
}
