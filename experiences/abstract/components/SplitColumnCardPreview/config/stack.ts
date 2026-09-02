import {
  GAP_OPTIONS,
  WIDTH_OPTIONS,
  WIDTH_WIDE_OPTIONS,
  WIDTH_LG_OPTIONS,
  type GapClass,
  type WidthClass,
  type WidthWideClass,
  type WidthLgClass,
} from '../../../../../components/tailwindSpacingScale';
import {
  CTA_BUTTON_MOTION_EASINGS,
  type CtaButtonMotionEasing,
} from '../../../../../components/CtaButton/config/registered';
import type { PointerProximityEasing } from '../../../../../helpers/pointerProximity';

/** The literal width classes the three `legacyCardWidthEnabled*` controls
 * restore at their respective tiers — this config's original `cardWidth` default before it
 * became 'w-full' (itself never tiered — a single fixed width regardless
 * of device size), so all three resolve to the equivalent 'w-96' step, not
 * three independently-chosen values. Named/exported (not just inlined at
 * CardStack.tsx's own resolveStackCardWidthClass call site) so there's
 * exactly one triad to change if this codebase's own notion of "the legacy
 * width" is ever revisited, and so Tailwind's JIT scanner sees each as a
 * real, complete class string here in source (this codebase's own
 * Tailwind-only styling rule) independent of WIDTH_OPTIONS/-_WIDE_/-_LG_
 * already covering them too. */
export const LEGACY_CARD_WIDTH_CLASS: WidthClass = 'w-96';
export const LEGACY_CARD_WIDTH_WIDE_CLASS: WidthWideClass = 'md:w-96';
export const LEGACY_CARD_WIDTH_LG_CLASS: WidthLgClass = 'lg:w-96';

/**
 * The opt-in vertical card-stack presentation for `SplitColumnCardPreview`
 * (PLAN-VERTICAL-CARD-STACK.md) — deliberately its own scope, separate from
 * `SplitColumnCardPreview.config.ts`'s tabs/card spacing, since this covers
 * a genuinely different concern (a whole alternate layout + its motion
 * system + arrow-control styling) with enough fields of its own to earn a
 * distinct, accurately-named panel entry rather than being folded into
 * "spacing." Mirrors how `AbstractJournalLabCollection` splits
 * `config/presentation.ts` from `config/slider.ts`.
 */
export type SplitColumnCardStackConfig = {
  /** Off (default): SplitColumnCardPreview renders its original single 3:4
   * card, unaffected by every field below. On: a vertical stack replaces
   * it, paging through the full active Articles/Labs list. */
  enabled: boolean;

  /** Stack card width, mobile/base tier — literal Tailwind class. 'w-full'
   * (the default) fills whatever box actually wraps SplitColumnCardPreview
   * — the coordinator's own <WideColumnContent> content-container box on
   * /abstract, sized per ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG's own
   * wideColumnContentWidthWide/-Lg ('match-narrow-column', resolved by
   * components/PolymorphicLayout.tsx's own resolveWideColumnContentWidth)
   * — since this div is CardStack's own
   * anchor (see that file's own doc comment: "its own Tailwind-class-
   * constrained width IS the card's width," live-measured via
   * getBoundingClientRect() into cardWidthPx, since the actual visible
   * card layer is `position: fixed` and therefore outside any CSS
   * percentage-of-parent chain). A fixed step (w-40...w-96) is still a
   * real, supported choice for a page that wants the stacked card at an
   * absolute size regardless of its column's own width — just not the
   * default, since "fill the content container" is what most consumers of
   * a content-container box actually expect from it. See cardWidthWide/
   * cardWidthLg below for the md:/lg:-tier overrides — independent per-
   * tier choices, not one fixed width applied everywhere (PLAN-CENTRALIZED-
   * BREAKPOINTS-RESPONSIVE-CARD-STACK.md). */
  cardWidth: WidthClass;
  /** Overrides cardWidth above starting at md (≥ tablet) — same resolution
   * order as every other tiered Tailwind field in this codebase (base
   * class always applies, the md:-prefixed class here wins from that
   * breakpoint up via the normal CSS cascade, no JS branching needed).
   * Defaults to 'md:w-full', matching cardWidth's own default exactly, so
   * this field alone changes nothing until a page picks a different value. */
  cardWidthWide: WidthWideClass;
  /** Overrides cardWidthWide above starting at lg (≥ desktop). Defaults to
   * 'lg:w-full', same reasoning as cardWidthWide's own default. */
  cardWidthLg: WidthLgClass;
  /** Mobile/base-tier legacy-width override. On forces `w-96`; off uses
   * `cardWidth` (whose authoritative default is `w-full`, filling 100% of
   * the parent content viewport). Tablet and Desktop are independent below. */
  legacyCardWidthEnabled: boolean;
  /** Tablet override of legacyCardWidthEnabled. On forces `md:w-96`; off
   * uses cardWidthWide (`md:w-full` by default). */
  legacyCardWidthEnabledWide: boolean;
  /** Desktop override of legacyCardWidthEnabledWide. On forces `lg:w-96`;
   * off uses cardWidthLg (`lg:w-full` by default). */
  legacyCardWidthEnabledLg: boolean;
  /** Vertical gap between stacked cards — literal Tailwind class. */
  cardGap: GapClass;

  /** On (default): the Articles/Labs tab row renders, and the stack can be
   * switched between both lists (tab click or horizontal swipe-drag). Off:
   * the whole tab row (both buttons and the separator) is omitted — not
   * just the Labs side disabled/dimmed — and the horizontal swipe-to-Labs
   * gesture is disabled along with it, so the stack is genuinely
   * articles-only rather than merely hiding the switcher while leaving an
   * undiscoverable drag-to-Labs escape hatch. The Labs list itself is
   * untouched either way (still fetched/passed in by the page) — this only
   * governs whether the stack can ever reach it. */
  tabsVisible: boolean;

  /** On: the first Article card only — currently “Thinking in systems” —
   * presents just its title and summary. Its label, topic/date/reading-time
   * metadata, and CTA are omitted, and it never follows its article URL.
   * It remains a normal stack-promotion target, however, so a neighboring
   * first card can always return to the active position. This is deliberately
   * keyed to the first item in the Articles collection rather than the
   * currently active card, so stepping through the stack never strips context
   * from later cards and the Labs collection is unaffected. */
  firstArticleTitleAndSummaryOnly: boolean;

  /** Enables vertical next/previous navigation from locally-scoped wheel,
   * trackpad, touch, and pen gestures over the card column. Wheel input is
   * normalized without identifying hardware; touch/pen drags follow the
   * pointer directly before committing. Keyboard navigation is independent
   * and remains available when this is off; explicit arrow buttons are
   * governed separately by showArrowControlsEnabled below. */
  verticalGesturesEnabled: boolean;

  /** Off (default): navigation remains implicit — wheel/touch/pen gestures,
   * keyboard arrows, and direct neighbor-card promotion stay available,
   * but the previous/next arrow-button group is not mounted on any device.
   * On: coarse/no-hover devices render the explicit arrow buttons as a
   * fallback; hover-capable pointer devices continue to use their existing
   * direct neighbor-card interaction instead. */
  showArrowControlsEnabled: boolean;

  /** Neighbor (non-active) slot rest-pose 3D tilt, applied to both the X
   * and Y axes — negated for cards above the active one, positive for
   * cards below. Continuous transform value, not spacing, so a plain
   * number driving inline style rather than a Tailwind class. */
  neighborRotationDeg: number;
  /** Neighbor rest-pose scale-down, as a 0-1 fraction subtracted from 1
   * (e.g. 0.22 -> scale(0.78)). */
  neighborScaleDownPercent: number;
  /** Neighbor rest-pose opacity (0-1). Only the active/centered card is at
   * full opacity. */
  neighborOpacity: number;

  /** Duration for the gradient-mesh reveal/cover as a card crosses between
   * neighbor and active — the neutral surface fading away/back
   * (AbstractJournalLabCollection.tsx's own stackNeutralSurface) and this
   * slot's own whole-card rest opacity (neighborOpacity above) both use
   * this value, instead of each independently sharing stepTiltDurationMs
   * (a much shorter, rotate/scale-tuned duration) the way they used to —
   * two alpha layers compounding on the same short window read as an
   * instant pop rather than a progression, and finished well before the
   * card's own stepTranslateDurationMs step had visually arrived. Defaults
   * to matching stepTranslateDurationMs so the mesh finishes revealing/
   * covering right as the card finishes arriving/leaving, not partway
   * through its own translate motion. */
  neighborGradientRevealDurationMs: number;
  /** Easing for the gradient-mesh reveal/cover above. 'gentle' (default) —
   * see CTA_BUTTON_MOTION_EASINGS's own doc comment: an ease-out curve with
   * no overshoot, "built for color/opacity," unlike the rotate/scale-tuned
   * curves (e.g. 'viscous') elsewhere in this config. */
  neighborGradientRevealEasing: CtaButtonMotionEasing;
  /** Backdrop blur radius (px) applied to the neutral surface only while a
   * card is actually crossing the neighbor/active boundary (never at rest,
   * either fully covered or fully uncovered) — so the mesh appears to
   * resolve into focus over the course of the crossing instead of an
   * already-sharp mesh simply being uncovered by a flat wipe. 0 disables
   * the blur, reproducing the original flat-wipe reveal exactly. */
  neighborGradientRevealBlurPx: number;

  /** Duration for the active card's own elevation-shadow fade in/out as it
   * crosses the neighbor/active boundary — see
   * components/proximity/useCardLiftPhysics.ts's own shadowEnabled/
   * shadowEnabledTransitionMs doc comments for why this must be a real,
   * separately-tweened fade rather than driven by elevationPx alone (the
   * shadow engine's own contact/ambient-occlusion layer is strongest at
   * elevation 0 by design, so "ease elevation to 0" alone doesn't ease the
   * shadow to invisible). Defaults to matching neighborGradientRevealDurationMs
   * so the shadow and the gradient-mesh cover finish their own crossings
   * together, reading as one connected transition rather than two
   * independently-timed ones. */
  neighborShadowFadeDurationMs: number;
  /** Easing for the shadow fade above. 'gentle' (default) — same reasoning
   * as neighborGradientRevealEasing's own doc comment: an ease-out curve
   * with no overshoot, appropriate for an opacity-like fade. */
  neighborShadowFadeEasing: CtaButtonMotionEasing;

  /** Duration for a slot's own rotate+scale transform (StackSlotPose's
   * rotateXDeg/rotateYDeg/scale, resolveStackSlotPose) as a card crosses
   * the neighbor/active boundary — deliberately decoupled from
   * stepTiltDurationMs (which still governs only the content adapter's own
   * text/scrim color cross-fade, presentation.transitionDurationMs/
   * -EasingCss — a genuinely different visual event on a genuinely
   * different element). Before this field existed, the pose transform
   * shared stepTiltDurationMs's own short, rotate-tuned default (180ms) —
   * well under half of stepTranslateDurationMs (500ms default), so a
   * neighbor card visibly finished shrinking to its resting scale while
   * still well into its own translate slide, reading as an abrupt pop
   * rather than one connected motion (operator-reported: "the scaling is
   * being applied ... without proper transition"). CSS's own `transform`
   * property can only carry one transition duration/easing at a time, so
   * rotate and scale can't be independently timed from each other within
   * the same element — this field governs both together. Defaults to
   * matching stepTranslateDurationMs, same reasoning as
   * neighborGradientRevealDurationMs/neighborShadowFadeDurationMs's own
   * defaults: the pose finishes shrinking/tilting right as the card
   * finishes arriving, not partway through. */
  neighborPoseDurationMs: number;
  /** Easing for the pose transform above. 'viscous' (default) — the same
   * transform-tuned curve stepTiltEasing already defaults to (see
   * CTA_BUTTON_MOTION_EASINGS's own doc comment: "fine for scale/
   * position"), not 'gentle' (reserved for opacity/color fades elsewhere
   * in this config) — rotate/scale are geometric transform terms, not an
   * alpha channel. */
  neighborPoseEasing: CtaButtonMotionEasing;

  /** Background behind a neighbor (inactive) card's own content — the
   * neutral surface that covers its gradient mesh so it reads as a thin
   * perimeter rather than full color (see AbstractJournalLabCollection.tsx's
   * own stackNeutralSurface). 'surface' (default): reproduces today's only
   * behavior byte-for-byte — the same page surface color already painted
   * behind everything else, tracking that value live if it's ever tuned
   * elsewhere, rather than a second, independently-drifting copy of it.
   * 'transparent': no background of its own — whatever's behind the card
   * (the column, another card mid-transition) shows straight through the
   * perimeter. 'custom': neighborBackgroundCustomColor below, verbatim.
   * 'column': deriveSurfaceColor(columnBackgroundColor, neighborBackgroundOffset)
   * below — the wide split column's own resolved background color instead
   * of the flat page surface, so the neighbor card's perimeter reads as a
   * tint of the column it actually sits on. */
  neighborBackgroundMode: 'surface' | 'transparent' | 'custom' | 'column';
  /** Used only when neighborBackgroundMode is 'custom'. */
  neighborBackgroundCustomColor: string;
  /** Used only when neighborBackgroundMode is 'column'. Same -1..1 signed
   * offset convention as every other *SurfaceOffset field in this codebase
   * (see helpers/surfaceColorDerivation.ts's deriveSurfaceColor) — 'surface'
   * mode has no such offset (it applies the page surface color verbatim),
   * so this is a new field rather than a reused one. */
  neighborBackgroundOffset: number;
  /** Text color for a neighbor (inactive) card's label/meta/title/excerpt/
   * separator/CTA — every one of those already renders as a single unified
   * neutral ink today (ArticleCard.module.css's own
   * `[data-appearance='neutral']` block hardcodes them all to the same
   * hex), so one field here matches that existing granularity rather than
   * splitting into several knobs nothing currently treats independently.
   * Default reproduces that same hardcoded value. Never applies to the
   * active/centered card, which keeps its own full-color gradient
   * treatment regardless of this field. Only used when
   * neighborTextColorMode is 'custom' — see that field's own doc comment. */
  neighborTextColor: string;
  /** Border color for a neighbor (inactive) card's own topic/category tag
   * (the small rounded pill, e.g. "BIOMIMETICS") — independent of
   * neighborTextColor above since ArticleCard.module.css already treats
   * this as its own distinct CSS custom property
   * (--article-card-graphic-border-color), not folded into the shared text
   * color. Default reproduces that property's existing neutral-appearance
   * value. Only used when neighborTextColorMode is 'custom'. */
  neighborTopicBorderColor: string;
  /** 'custom' (default): neighborTextColor/neighborTopicBorderColor above,
   * verbatim — today's only behavior. 'column': both instead derive from
   * the wide split column's own resolved background color via
   * resolveContrastAwareTextColor (helpers/surfaceColorDerivation.ts) — a
   * WCAG-contrast-aware, hue-preserving search rather than a flat hex,
   * biased by neighborTextOffset and gated by neighborTextMinContrast
   * below. One shared mode field couples both colors, matching how
   * SiteHeaderConfig.colorMode couples logo/nav text/nav border —
   * both describe one inactive card's text treatment. */
  neighborTextColorMode: 'custom' | 'column';
  /** Only meaningful when neighborTextColorMode is 'column'. Same -1..1
   * signed offset convention as every other *SurfaceOffset field — biases
   * resolveContrastAwareTextColor's search rather than overriding it. No
   * prior offset field existed on this config (neighborTextColor/
   * neighborTopicBorderColor were flat hex only), so this is new. */
  neighborTextOffset: number;
  /** Only meaningful when neighborTextColorMode is 'column'. WCAG contrast
   * ratio neighbor text/topic-border must clear against the wide column's
   * own resolved background color (or, when neighborBackgroundMode is
   * 'transparent', the wide column's color shows straight through, so the
   * same value is used as the contrast target either way). Same 1-21
   * range/semantics as CtaButtonConfig.autoTextMinContrast. */
  neighborTextMinContrast: number;

  /** The alpha (0..1, unsigned — there's no "more opaque than the source"
   * direction) the neighbor card's own resolved text color
   * (resolvedNeighborTextColor, CardStack.tsx — whichever of
   * neighborTextColorMode's two paths produced it) renders at for the
   * card's own outer border, via helpers/surfaceColorDerivation.ts's
   * deriveTransparentTint — the exact same color, alpha-reduced, not a
   * lightness shift, and used as the resulting alpha directly (this field's
   * value IS the rendered opacity fraction — 0.38 reads as "62%
   * transparent," not "38% transparent"; an earlier version of this field
   * inverted that reading, corrected against operator-supplied screenshot
   * evidence twice — see deriveTransparentTint's own doc comment). Previously
   * ran through deriveSurfaceColor, this codebase's shared HSL lighten/darken
   * primitive — the same one neighborBackgroundOffset/wideColumnSurfaceOffset
   * /etc. use — which produced a visibly different tint rather than the same
   * ink faded out; corrected once that mismatch was confirmed against a live
   * reference screenshot where the border was the identical color to the
   * text, just more transparent. A distinct field from neighborTextOffset
   * (which instead biases resolveContrastAwareTextColor's own search,
   * changing the base text color itself): this one starts from that
   * already-resolved text color and only fades it, so the two can never
   * accidentally drift into meaning the same knob. See
   * neighborBorderHoverOpacity below for the separate value a settled
   * neighbor card's border switches to while genuinely hovered on a
   * hover-capable device — this field only ever governs the rest state. */
  neighborBorderColorOffset: number;
  /** Same alpha semantics as neighborBorderColorOffset above (a direct
   * deriveTransparentTint fraction, not an inverted "more transparent"
   * reading) — but for a settled neighbor card's outer border while the
   * pointer is genuinely resting over it, on a hover-capable, fine-pointer
   * device only (hasHoverPointer, CardStackSlot.tsx — the same device gate
   * cursorIntentEnabled/neighborProximity*Enabled already use). A distinct
   * field, not a second read of neighborBorderColorOffset, so tuning the
   * hover treatment can never accidentally retune the rest state it swaps
   * away from (operator ask: "segregate the variable"). Applied only while
   * settledNeighbor (never on the active card, whose border-width is
   * already 0 regardless, and never mid-step-transition) — see
   * CardStackSlot.tsx's own isHovered state. Default 0.5 — the border
   * renders the same text color at 50% opacity while hovered. */
  neighborBorderHoverOpacity: number;

  /** The inactive card's edge treatment. 'border' (default) preserves the
   * existing transparent text-tint perimeter. 'flat-fill' instead paints an
   * opaque, flat face derived from the same resolved neighbor text color;
   * this is intentionally a mode rather than a second layer, so cards can
   * overlap without their fills accumulating. */
  neighborFrameMode: 'border' | 'flat-fill';
  /** Only meaningful when neighborFrameMode is 'flat-fill'. This is the
   * equivalent alpha used to composite the resolved neighbor text color over
   * the card's real surface, yielding one opaque pigment via
   * deriveOpaqueTint. Dark text therefore darkens the surface; light text
   * lightens it. No CSS opacity is painted, so overlapping cards stay
   * visually stable. */
  neighborFlatFillOpacity: number;
  /** Only meaningful when neighborFrameMode is 'flat-fill'. Signed HSL
   * lightness adjustment applied after the opaque text/surface composite:
   * negative darkens, positive lightens. This is separate from the
   * equivalent-opacity control above so an operator can darken a fill even
   * when the contrast-aware text resolver selected a light ink color. */
  neighborFlatFillToneOffset: number;

  /** Duration/easing for the active card's "Read article" CTA fading in on
   * hover/focus (ArticleCard's own `ctaHoverOnly`/`.hoverReveal`) — a
   * dedicated pair rather than reusing stepTiltDurationMs/stepTiltEasing,
   * since this reveal is driven by the card's own `:hover`/`:focus-within`
   * state, not a stack step, and previously had no config knob at all
   * (ArticleCard.detailFade.ts's shared ARTICLE_CARD_DETAIL_FADE_MS/
   * _EASING_CSS constant, 420ms / cubic-bezier(0.19, 1, 0.22, 1)). Defaults
   * below match that prior fixed behavior. */
  ctaHoverDurationMs: number;
  ctaHoverEasing: CtaButtonMotionEasing;
  /** How long the pointer must stay in (or out of) the card's hover/focus
   * region before the CTA's fade-in/-out transition above even starts —
   * applied to both directions via a single CSS `transition-delay`, so a
   * cursor merely passing over/off the card doesn't trigger a visible
   * flicker; only a deliberate pause commits to the reveal or the hide.
   * Genuinely interrupts mid-delay on a real direction change (a plain CSS
   * transition-delay, not a JS timer) — re-entering before the hide delay
   * elapses cancels the hide and resumes the reveal from wherever it left
   * off. Default 150ms — enough to absorb an incidental cursor pass without
   * a visible flicker, short enough to still read as responsive. */
  ctaHoverDelayMs: number;

  /** Per-slot cascade delay (ms) for arrow-triggered steps — each visible
   * card's motion starts `stepStaggerMs * (distance from the active slot)`
   * after the active slot's own motion starts, so the whole-stack reflow
   * reads as one rippling, connected motion. */
  stepStaggerMs: number;
  /** Duration/easing for each card's rotate+scale+opacity sub-phase —
   * shared across all three properties since they settle together. */
  stepTiltDurationMs: number;
  stepTiltEasing: CtaButtonMotionEasing;
  /** Duration/easing for each card's translate sub-phase, which only
   * begins once its own tilt sub-phase has finished. */
  stepTranslateDurationMs: number;
  stepTranslateEasing: CtaButtonMotionEasing;

  /** Pixel distance a vertical wheel/touch/pen gesture must cross before it
   * commits to a step, instead of settling back to the resting position.
   * Surfaced from a previously call-site-hardcoded constant (56) so it's
   * tunable/testable the same way every other motion value in this config
   * already is. */
  stepCommitThresholdPx: number;
  /** On (default): a fast wheel/pointer release scales the committed step's
   * translate duration down toward stepSettleMinDurationScale below — the
   * same "a hard flick lands sooner" quality Embla's own attraction physics
   * has — instead of every step always animating at the fixed
   * stepTranslateDurationMs regardless of how the gesture that triggered it
   * moved. A keyboard-triggered step always uses the full duration either
   * way, since there is no gesture velocity to read. */
  stepVelocityScalingEnabled: boolean;
  /** Fraction (0-1) of stepTranslateDurationMs used once a release reaches
   * stepVelocityMaxFlickPxPerMs below. 1 disables scaling in effect (every
   * commit still animates at the full configured duration). */
  stepSettleMinDurationScale: number;
  /** Release speed (px/ms) at which the minimum duration scale above is
   * fully reached — slower releases interpolate linearly between 1 and
   * stepSettleMinDurationScale. */
  stepVelocityMaxFlickPxPerMs: number;

  /** On: overscrolling vertically past the first/last card releases into a
   * physically-integrated damped spring (same model as the horizontal
   * Articles/Labs edge already uses internally) instead of a flat CSS
   * transition snapping back to the resting position. Off: today's plain
   * CSS settle, unchanged. */
  verticalEdgeSpringEnabled: boolean;
  /** Spring stiffness for the vertical edge release above. Only meaningful
   * while verticalEdgeSpringEnabled is on. */
  verticalEdgeSpringStiffness: number;
  /** Spring damping for the vertical edge release above. Only meaningful
   * while verticalEdgeSpringEnabled is on. */
  verticalEdgeSpringDamping: number;
  /** Safety ceiling (ms) for the vertical edge spring above — a spring that
   * reaches a small displacement and velocity ends sooner; this only caps
   * how long a slow-to-settle spring can run. 0 disables the spring outright
   * (falls back to the flat CSS settle) regardless of
   * verticalEdgeSpringEnabled. */
  verticalEdgeSpringMaxDurationMs: number;

  /** Horizontal swipe (Articles <-> Labs) push/fade motion — how far the
   * outgoing/incoming card set travels, as a fraction of the container
   * width, plus its duration/easing. */
  swipePushDistancePercent: number;
  swipeDurationMs: number;
  swipeEasing: CtaButtonMotionEasing;

  /** Embla's attraction duration for the touch carousel below 768px. This
   * is a dimensionless Embla physics value, not milliseconds: higher values
   * settle more slowly. Embla recommends the 20–60 range. Reduced motion
   * resolves it to zero at the runtime boundary without mutating config. */
  mobileCarouselDuration: number;
  /** Allows momentum to settle between snap points. Off is the deliberate
   * carousel default: each gesture lands on a complete card. */
  mobileCarouselDragFree: boolean;
  /** Allows a decisive flick to skip snap points. Embla ignores this while
   * drag-free is on, so the panel hides it in that state. */
  mobileCarouselSkipSnaps: boolean;
  /** Wraps first/last card navigation. Off preserves bounded collection
   * semantics and Embla's native resisted edge return. */
  mobileCarouselLoop: boolean;
  /** Literal Tailwind edge-to-edge separation between configured-width cards
   * inside Embla's full mobile viewport. This is structural spacing, so it
   * uses the shared spacing catalog instead of a pixel field. */
  mobileCarouselGap: GapClass;

  /** Arrow control sizing/color/opacity/transitions — mirrors
   * pages/about.tsx's own navControl* fields; this is a local, independent
   * copy of that visual language, not a shared import. */
  arrowSizePx: number;
  arrowIdleColor: string;
  arrowHoverColor: string;
  arrowIdleOpacity: number;
  arrowHoverOpacity: number;
  arrowDisabledOpacity: number;
  arrowHoverTransitionMs: number;
  arrowHoverEasing: CtaButtonMotionEasing;
  arrowMouseOutTransitionMs: number;
  arrowMouseOutEasing: CtaButtonMotionEasing;

  /** Ambient *dwell* auto-promote on wide/hover-capable pointer devices
   * (PLAN: Card Stack cursor-intent navigation) — whether simply hovering a
   * neighbor long enough (dwellThresholdMs below) promotes it to active
   * with no click. This is the only thing this field controls: on any
   * device matching `(hover: hover) and (pointer: fine)`, the arrow buttons
   * above are hidden and a plain click on a neighbor always promotes it,
   * unconditionally — neither depends on this field. `false` here just
   * removes the ambient auto-promote-on-hover layer; deliberate clicks
   * still work exactly the same either way. Touch/coarse-pointer devices
   * navigate with the configured gestures; when arrow controls are shown,
   * they also receive the explicit arrow-button fallback.
   *
   * Deliberately independent of `neighborProximityOpacityEnabled`/
   * `neighborProximityScaleEnabled` below — proximity-reactive visuals and
   * dwell auto-promote are two different things a neighbor card can do as
   * the cursor nears it, and neither should imply the other. A page can run
   * the proximity visuals purely as ambient decoration with dwell off (only
   * click promotes), or run dwell auto-promote with the neighbor cards
   * visually static. */
  cursorIntentEnabled: boolean;
  /** Whether proximity distance drives a neighbor's opacity, ramping from
   * its resting `neighborOpacity` (above) toward full opacity as the cursor
   * nears/enters its box. Independent of `cursorIntentEnabled` — see that
   * field's own doc comment. */
  neighborProximityOpacityEnabled: boolean;
  /** Whether proximity distance also drives a neighbor's scale, growing
   * from its resting `1 - neighborScaleDownPercent` by up to
   * `neighborProximityScaleAmount` as the cursor nears/enters its box.
   * Independent of both `cursorIntentEnabled` and
   * `neighborProximityOpacityEnabled` — opacity and scale can be toggled
   * separately, each reusing the same underlying proximity signal below. */
  neighborProximityScaleEnabled: boolean;
  /** Only meaningful when `neighborProximityScaleEnabled` is on — how much
   * larger (as a 0-1 fraction added to the resting scale) a neighbor grows
   * once the cursor is fully inside its box. */
  neighborProximityScaleAmount: number;
  /** Distance (px) from a neighbor card's own box at which proximity starts
   * ramping toward full (1) — shared by whichever of
   * `neighborProximityOpacityEnabled`/`neighborProximityScaleEnabled` is on,
   * since both read the same underlying proximity value, not two separate
   * measurements. Local, independent copy of the same distance/radius
   * concept `CtaButtonConfig.proximityRadiusPx` already uses for each card's
   * own tilt/hologram engine (components/proximity/usePointerProximity.ts)
   * — kept as its own field, not shared, since stack-level neighbor
   * proximity is a different physical concern than per-card tilt (mirrors
   * how the arrow* fields above are already their own independent copy of
   * pages/about.tsx's nav control language, not a shared import). */
  neighborProximityRadiusPx: number;
  /** Distance-to-proximity curve shape as the cursor approaches — same
   * `PointerProximityEasing` token set as `CtaButtonConfig.proximityEasing`.
   * Shared by opacity/scale, same reasoning as the radius above. */
  neighborProximityEasing: PointerProximityEasing;
  /** Smoothing time (ms) ramping in as the cursor arrives. Shared by
   * opacity/scale. */
  neighborProximityAttackMs: number;
  /** Smoothing time (ms) ramping back out as the cursor leaves. Shared by
   * opacity/scale. */
  neighborProximityReleaseMs: number;
  /** How long (ms) a neighbor's very first opacity ramp lasts right when it
   * settles into place — e.g. the exact moment a stack step finishes with
   * the cursor already resting on the card that just landed there.
   * Distinct from neighborProximityAttackMs above, which still governs
   * every ramp *after* this window as the cursor actually moves toward or
   * away from a settled card: that value drives an exponential attack
   * curve tuned for snappy, continuous cursor-follow, whose steepest slope
   * sits right at the start — exactly what reads as an abrupt "pop" the
   * one time the target jumps straight to a large value on the very frame
   * proximity turns on, rather than climbing from a genuine zero. This
   * field instead drives a real CSS transition (a proper eased duration,
   * not an exponential one) for that one opening ramp only; once it
   * elapses, control hands back to the exponential JS envelope for
   * continuous live following. During this window CardStackSlot.tsx also
   * forces the JS envelope's own attack down to a single frame, so its
   * target stabilizes almost immediately and this transition eases toward
   * an effectively fixed value rather than one still climbing underneath
   * it — verified live that skipping this makes the two visibly fight
   * (a stall, then a delayed catch-up jump) instead of reading as one
   * clean ease, i.e. exactly the "double-smoothed into a laggy blur"
   * outcome the plain exclude-while-live default elsewhere avoids. */
  neighborSettleOpacityTransitionMs: number;
  /** Easing for the settle ramp above — same CtaButtonMotionEasing token
   * set stepTiltEasing/stepTranslateEasing already use, not
   * PointerProximityEasing (that set shapes a *distance* curve; this
   * shapes a genuine CSS transition timing function). */
  neighborSettleOpacityEasing: CtaButtonMotionEasing;
  /** How long (ms) the cursor must stay inside a neighbor's box before it's
   * auto-promoted to active — the same promotion a click triggers instantly,
   * never a real navigation (see AbstractJournalLabHueFadeCard's own href/
   * Link, unaffected either way). Leaving the box before this resets
   * progress to nothing. Only meaningful while `cursorIntentEnabled` is on;
   * suppressed entirely under prefers-reduced-motion — click-to-promote
   * still works instantly either way. */
  dwellThresholdMs: number;

  /** Active (gradient-appearance) card only — a 0-1 multiplier applied on
   * top of ArticleCard.module.css's own already-tuned per-element header
   * opacities (label 0.6, meta 0.6, topic 0.7, separator 0.4 — see that
   * module's `.card` block), not a single flat value replacing all four.
   * 1 (default) reproduces those hardcoded values byte-for-byte; below 1
   * dims the whole topic-pill/date/reading-time row together, keeping their
   * existing relative weighting. Read through
   * `--article-card-header-opacity` (AbstractJournalLabCollection.tsx's own
   * stackAppearanceStyle), which the module's own [data-appearance='neutral']
   * block never references — a settled neighbor card's own unified ink
   * (neighborTextColor et al.) is unaffected by this field regardless of its
   * value. */
  activeHeaderOpacity: number;
  /** Same multiplier mechanism as activeHeaderOpacity above, applied to the
   * title (0.9) and excerpt (0.7) instead of the header row — operator ask:
   * the active card's title renders too bright against the gradient at full
   * opacity. Independent field so an operator can dim the meta chrome
   * without touching the actual headline/summary text, or vice versa. */
  activeTextOpacity: number;
};

export const DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG = {
  enabled: true,
  cardWidth: 'w-full',
  cardWidthWide: 'md:w-full',
  cardWidthLg: 'lg:w-full',
  legacyCardWidthEnabled: false,
  legacyCardWidthEnabledWide: true,
  legacyCardWidthEnabledLg: true,
  cardGap: 'gap-8',
  tabsVisible: false,
  firstArticleTitleAndSummaryOnly: true,
  verticalGesturesEnabled: true,
  showArrowControlsEnabled: false,
  neighborRotationDeg: 0,
  neighborScaleDownPercent: 0.04,
  neighborOpacity: 0.55,
  neighborGradientRevealDurationMs: 500,
  neighborGradientRevealEasing: 'gentle',
  neighborGradientRevealBlurPx: 24,
  neighborShadowFadeDurationMs: 500,
  neighborShadowFadeEasing: 'gentle',
  neighborPoseDurationMs: 500,
  neighborPoseEasing: 'viscous',
  neighborBackgroundMode: 'column',
  neighborBackgroundCustomColor: '#0c0d18',
  neighborBackgroundOffset: 0,
  neighborTextColor: '#9b9fb0',
  neighborTopicBorderColor: '#515152',
  neighborTextColorMode: 'column',
  neighborTextOffset: 0,
  neighborTextMinContrast: 4.5,
  neighborBorderColorOffset: .28,
  neighborBorderHoverOpacity: 0.5,
  neighborFrameMode: 'flat-fill',
  neighborFlatFillOpacity: 1,
  neighborFlatFillToneOffset: -0.45,
  ctaHoverDurationMs: 420,
  ctaHoverEasing: 'gentle',
  ctaHoverDelayMs: 150,
  stepStaggerMs: 100,
  stepTiltDurationMs: 180,
  stepTiltEasing: 'viscous',
  stepTranslateDurationMs: 500,
  stepTranslateEasing: 'viscous',
  stepCommitThresholdPx: 56,
  stepVelocityScalingEnabled: true,
  stepSettleMinDurationScale: 0.6,
  stepVelocityMaxFlickPxPerMs: 1.5,
  verticalEdgeSpringEnabled: true,
  verticalEdgeSpringStiffness: 220,
  verticalEdgeSpringDamping: 20,
  verticalEdgeSpringMaxDurationMs: 420,
  swipePushDistancePercent: 0.15,
  swipeDurationMs: 360,
  swipeEasing: 'viscous',
  mobileCarouselDuration: 25,
  mobileCarouselDragFree: false,
  mobileCarouselSkipSnaps: false,
  mobileCarouselLoop: false,
  mobileCarouselGap: 'gap-28',
  arrowSizePx: 22,
  arrowIdleColor: '#1a1a1e',
  arrowHoverColor: '#000000',
  arrowIdleOpacity: 0.85,
  arrowHoverOpacity: 1,
  arrowDisabledOpacity: 0.35,
  arrowHoverTransitionMs: 160,
  arrowHoverEasing: 'viscous',
  arrowMouseOutTransitionMs: 320,
  arrowMouseOutEasing: 'viscous',
  cursorIntentEnabled: false,
  neighborProximityOpacityEnabled: true,
  neighborProximityScaleEnabled: true,
  neighborProximityScaleAmount: 0,
  neighborProximityRadiusPx: 350,
  neighborProximityEasing: 'smootherstep',
  neighborProximityAttackMs: 120,
  neighborProximityReleaseMs: 260,
  neighborSettleOpacityTransitionMs: 540,
  neighborSettleOpacityEasing: 'gentle',
  dwellThresholdMs: 1000,
  activeHeaderOpacity: 1,
  activeTextOpacity: 0.85,
} satisfies SplitColumnCardStackConfig;

const WIDTH_VALUES: ReadonlyArray<WidthClass> = WIDTH_OPTIONS.map(option => option.value);
const WIDTH_WIDE_VALUES: ReadonlyArray<WidthWideClass> = WIDTH_WIDE_OPTIONS.map(option => option.value);
const WIDTH_LG_VALUES: ReadonlyArray<WidthLgClass> = WIDTH_LG_OPTIONS.map(option => option.value);
const GAP_VALUES: ReadonlyArray<GapClass> = GAP_OPTIONS.map(option => option.value);
const MOTION_EASINGS: ReadonlyArray<CtaButtonMotionEasing> =
  Object.keys(CTA_BUTTON_MOTION_EASINGS) as CtaButtonMotionEasing[];
const PROXIMITY_EASINGS: ReadonlyArray<PointerProximityEasing> =
  ['linear', 'smoothstep', 'smootherstep', 'ease-out-cubic'];
const NEIGHBOR_BACKGROUND_MODES: ReadonlyArray<SplitColumnCardStackConfig['neighborBackgroundMode']> =
  ['surface', 'transparent', 'custom', 'column'];
const NEIGHBOR_TEXT_COLOR_MODES: ReadonlyArray<SplitColumnCardStackConfig['neighborTextColorMode']> =
  ['custom', 'column'];
const NEIGHBOR_FRAME_MODES: ReadonlyArray<SplitColumnCardStackConfig['neighborFrameMode']> =
  ['border', 'flat-fill'];

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);

const clamp = (value: number, min: number, max: number, fallback: number) => (
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback))
);

export function normalizeSplitColumnCardStackConfig(
  config: Partial<SplitColumnCardStackConfig> | undefined,
): SplitColumnCardStackConfig {
  const base = { ...DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG, ...(config ?? {}) };
  const D = DEFAULT_SPLIT_COLUMN_CARD_STACK_CONFIG;
  return {
    enabled: base.enabled === true,

    cardWidth: token(base.cardWidth, WIDTH_VALUES, D.cardWidth),
    cardWidthWide: token(base.cardWidthWide, WIDTH_WIDE_VALUES, D.cardWidthWide),
    cardWidthLg: token(base.cardWidthLg, WIDTH_LG_VALUES, D.cardWidthLg),
    legacyCardWidthEnabled: base.legacyCardWidthEnabled === true,
    legacyCardWidthEnabledWide: base.legacyCardWidthEnabledWide === true,
    legacyCardWidthEnabledLg: base.legacyCardWidthEnabledLg === true,
    cardGap: token(base.cardGap, GAP_VALUES, D.cardGap),

    tabsVisible: base.tabsVisible !== false,
    firstArticleTitleAndSummaryOnly: base.firstArticleTitleAndSummaryOnly === true,
    verticalGesturesEnabled: base.verticalGesturesEnabled !== false,
    showArrowControlsEnabled: base.showArrowControlsEnabled === true,

    neighborRotationDeg: clamp(base.neighborRotationDeg, 0, 60, D.neighborRotationDeg),
    neighborScaleDownPercent: clamp(base.neighborScaleDownPercent, 0, 0.8, D.neighborScaleDownPercent),
    neighborOpacity: clamp(base.neighborOpacity, 0, 1, D.neighborOpacity),
    neighborGradientRevealDurationMs: clamp(
      base.neighborGradientRevealDurationMs, 0, 1200, D.neighborGradientRevealDurationMs,
    ),
    neighborGradientRevealEasing: token(
      base.neighborGradientRevealEasing, MOTION_EASINGS, D.neighborGradientRevealEasing,
    ),
    neighborGradientRevealBlurPx: clamp(
      base.neighborGradientRevealBlurPx, 0, 64, D.neighborGradientRevealBlurPx,
    ),
    neighborShadowFadeDurationMs: clamp(
      base.neighborShadowFadeDurationMs, 0, 1200, D.neighborShadowFadeDurationMs,
    ),
    neighborShadowFadeEasing: token(
      base.neighborShadowFadeEasing, MOTION_EASINGS, D.neighborShadowFadeEasing,
    ),
    neighborPoseDurationMs: clamp(
      base.neighborPoseDurationMs, 0, 1200, D.neighborPoseDurationMs,
    ),
    neighborPoseEasing: token(
      base.neighborPoseEasing, MOTION_EASINGS, D.neighborPoseEasing,
    ),

    neighborBackgroundMode: token(
      base.neighborBackgroundMode, NEIGHBOR_BACKGROUND_MODES, D.neighborBackgroundMode,
    ),
    neighborBackgroundCustomColor: base.neighborBackgroundCustomColor?.trim()
      || D.neighborBackgroundCustomColor,
    neighborBackgroundOffset: clamp(
      base.neighborBackgroundOffset, -1, 1, D.neighborBackgroundOffset,
    ),
    neighborTextColor: base.neighborTextColor?.trim() || D.neighborTextColor,
    neighborTopicBorderColor: base.neighborTopicBorderColor?.trim() || D.neighborTopicBorderColor,
    neighborTextColorMode: token(
      base.neighborTextColorMode, NEIGHBOR_TEXT_COLOR_MODES, D.neighborTextColorMode,
    ),
    neighborTextOffset: clamp(base.neighborTextOffset, -1, 1, D.neighborTextOffset),
    neighborTextMinContrast: clamp(base.neighborTextMinContrast, 1, 21, D.neighborTextMinContrast),
    neighborBorderColorOffset: clamp(
      base.neighborBorderColorOffset, 0, 1, D.neighborBorderColorOffset,
    ),
    neighborBorderHoverOpacity: clamp(
      base.neighborBorderHoverOpacity, 0, 1, D.neighborBorderHoverOpacity,
    ),
    neighborFrameMode: token(base.neighborFrameMode, NEIGHBOR_FRAME_MODES, D.neighborFrameMode),
    neighborFlatFillOpacity: clamp(
      base.neighborFlatFillOpacity, 0, 1, D.neighborFlatFillOpacity,
    ),
    neighborFlatFillToneOffset: clamp(
      base.neighborFlatFillToneOffset, -1, 1, D.neighborFlatFillToneOffset,
    ),
    ctaHoverDurationMs: clamp(base.ctaHoverDurationMs, 0, 1200, D.ctaHoverDurationMs),
    ctaHoverEasing: token(base.ctaHoverEasing, MOTION_EASINGS, D.ctaHoverEasing),
    ctaHoverDelayMs: clamp(base.ctaHoverDelayMs, 0, 1200, D.ctaHoverDelayMs),

    stepStaggerMs: clamp(base.stepStaggerMs, 0, 400, D.stepStaggerMs),
    stepTiltDurationMs: clamp(base.stepTiltDurationMs, 0, 1200, D.stepTiltDurationMs),
    stepTiltEasing: token(base.stepTiltEasing, MOTION_EASINGS, D.stepTiltEasing),
    stepTranslateDurationMs: clamp(base.stepTranslateDurationMs, 0, 1200, D.stepTranslateDurationMs),
    stepTranslateEasing: token(base.stepTranslateEasing, MOTION_EASINGS, D.stepTranslateEasing),

    stepCommitThresholdPx: clamp(base.stepCommitThresholdPx, 8, 200, D.stepCommitThresholdPx),
    stepVelocityScalingEnabled: base.stepVelocityScalingEnabled !== false,
    stepSettleMinDurationScale: clamp(
      base.stepSettleMinDurationScale, 0.2, 1, D.stepSettleMinDurationScale,
    ),
    stepVelocityMaxFlickPxPerMs: clamp(
      base.stepVelocityMaxFlickPxPerMs, 0.1, 5, D.stepVelocityMaxFlickPxPerMs,
    ),

    verticalEdgeSpringEnabled: base.verticalEdgeSpringEnabled !== false,
    verticalEdgeSpringStiffness: clamp(
      base.verticalEdgeSpringStiffness, 40, 800, D.verticalEdgeSpringStiffness,
    ),
    verticalEdgeSpringDamping: clamp(
      base.verticalEdgeSpringDamping, 2, 120, D.verticalEdgeSpringDamping,
    ),
    verticalEdgeSpringMaxDurationMs: clamp(
      base.verticalEdgeSpringMaxDurationMs, 0, 1200, D.verticalEdgeSpringMaxDurationMs,
    ),

    swipePushDistancePercent: clamp(base.swipePushDistancePercent, 0, 1, D.swipePushDistancePercent),
    swipeDurationMs: clamp(base.swipeDurationMs, 0, 1200, D.swipeDurationMs),
    swipeEasing: token(base.swipeEasing, MOTION_EASINGS, D.swipeEasing),

    mobileCarouselDuration: clamp(
      base.mobileCarouselDuration, 20, 60, D.mobileCarouselDuration,
    ),
    mobileCarouselDragFree: base.mobileCarouselDragFree === true,
    mobileCarouselSkipSnaps: base.mobileCarouselSkipSnaps === true,
    mobileCarouselLoop: base.mobileCarouselLoop === true,
    mobileCarouselGap: token(base.mobileCarouselGap, GAP_VALUES, D.mobileCarouselGap),

    arrowSizePx: clamp(base.arrowSizePx, 10, 48, D.arrowSizePx),
    arrowIdleColor: base.arrowIdleColor?.trim() || D.arrowIdleColor,
    arrowHoverColor: base.arrowHoverColor?.trim() || D.arrowHoverColor,
    arrowIdleOpacity: clamp(base.arrowIdleOpacity, 0, 1, D.arrowIdleOpacity),
    arrowHoverOpacity: clamp(base.arrowHoverOpacity, 0, 1, D.arrowHoverOpacity),
    arrowDisabledOpacity: clamp(base.arrowDisabledOpacity, 0, 1, D.arrowDisabledOpacity),
    arrowHoverTransitionMs: clamp(base.arrowHoverTransitionMs, 0, 1000, D.arrowHoverTransitionMs),
    arrowHoverEasing: token(base.arrowHoverEasing, MOTION_EASINGS, D.arrowHoverEasing),
    arrowMouseOutTransitionMs: clamp(base.arrowMouseOutTransitionMs, 0, 1000, D.arrowMouseOutTransitionMs),
    arrowMouseOutEasing: token(base.arrowMouseOutEasing, MOTION_EASINGS, D.arrowMouseOutEasing),

    cursorIntentEnabled: base.cursorIntentEnabled !== false,
    neighborProximityOpacityEnabled: base.neighborProximityOpacityEnabled !== false,
    neighborProximityScaleEnabled: base.neighborProximityScaleEnabled === true,
    neighborProximityScaleAmount: clamp(
      base.neighborProximityScaleAmount, 0, 0.5, D.neighborProximityScaleAmount,
    ),
    neighborProximityRadiusPx: clamp(
      base.neighborProximityRadiusPx, 40, 640, D.neighborProximityRadiusPx,
    ),
    neighborProximityEasing: token(
      base.neighborProximityEasing, PROXIMITY_EASINGS, D.neighborProximityEasing,
    ),
    neighborProximityAttackMs: clamp(
      base.neighborProximityAttackMs, 16, 600, D.neighborProximityAttackMs,
    ),
    neighborProximityReleaseMs: clamp(
      base.neighborProximityReleaseMs, 16, 1000, D.neighborProximityReleaseMs,
    ),
    neighborSettleOpacityTransitionMs: clamp(
      base.neighborSettleOpacityTransitionMs, 0, 1000, D.neighborSettleOpacityTransitionMs,
    ),
    neighborSettleOpacityEasing: token(
      base.neighborSettleOpacityEasing, MOTION_EASINGS, D.neighborSettleOpacityEasing,
    ),
    dwellThresholdMs: clamp(base.dwellThresholdMs, 150, 3000, D.dwellThresholdMs),
    activeHeaderOpacity: clamp(base.activeHeaderOpacity, 0, 1, D.activeHeaderOpacity),
    activeTextOpacity: clamp(base.activeTextOpacity, 0, 1, D.activeTextOpacity),
  };
}

/** The three legacy toggles and cardWidth/cardWidthWide/cardWidthLg's own
 * resolution — see those fields' own doc comments. Returns the complete,
 * space-joined class list for all three tiers at once (base, then md:, then
 * lg:) — CardStack.tsx's own anchor spreads this directly into its
 * className, the same "join every tier's class into one string" shape
 * every other multi-tier Tailwind field in this codebase already uses
 * (e.g. components/PolymorphicLayout.tsx's own buildWideColumnClassName). */
export function resolveStackCardWidthClass(config: SplitColumnCardStackConfig): string {
  return [
    config.legacyCardWidthEnabled ? LEGACY_CARD_WIDTH_CLASS : config.cardWidth,
    config.legacyCardWidthEnabledWide ? LEGACY_CARD_WIDTH_WIDE_CLASS : config.cardWidthWide,
    config.legacyCardWidthEnabledLg ? LEGACY_CARD_WIDTH_LG_CLASS : config.cardWidthLg,
  ].join(' ');
}
