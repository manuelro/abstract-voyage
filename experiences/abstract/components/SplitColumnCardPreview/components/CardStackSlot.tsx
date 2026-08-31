import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { usePointerProximity } from '../../../../../components/proximity/usePointerProximity';
import type { CtaButtonConfig } from '../../../../../components/CtaButton/config/registered';
import type { SplitColumnCardStackConfig } from '../config/stack';
import { stackRotateCss, type StackSlotPose } from '../helpers/stackNeighborTransform';
import styles from './CardStack.module.css';

/**
 * Presentation state a content adapter needs to theme its own card face
 * against the neighbor-row surface it's rendering on top of (background/
 * text/topic-border colors already resolved from `stackConfig`'s own
 * `neighborBackgroundMode`/`neighborTextColorMode` — see `CardStack.tsx`'s
 * own doc comments on `resolvedNeighborBackgroundColor`/`-TextColor`/
 * `-TopicBorderColor`), plus the transition timing the tilt layer itself
 * already uses so a content adapter's own internal cross-fades (if any)
 * can stay in step with it rather than guessing a duration.
 */
export type CardStackSlotPresentation = {
  state: 'active' | 'inactive';
  surfaceColor: string;
  textColor: string;
  topicBorderColor: string;
  /** The card's own outer border — the exact same textColor, at reduced
   * opacity (SplitColumnCardStackConfig.neighborBorderColorOffset via
   * helpers/surfaceColorDerivation.ts's deriveTransparentTint), not a
   * second independent contrast-aware search the way topicBorderColor (the
   * small topic-pill's own border) is. See CardStack.tsx's own
   * resolvedNeighborCardBorderColor doc comment. */
  cardBorderColor: string;
  /** Active (gradient-appearance) card only — see
   * SplitColumnCardStackConfig.activeHeaderOpacity's own doc comment. A
   * settled neighbor's own header row already renders via textColor above
   * instead, so this is simply unread there. */
  headerOpacity: number;
  /** Active (gradient-appearance) card only — see
   * SplitColumnCardStackConfig.activeTextOpacity's own doc comment. */
  textOpacity: number;
  transitionDurationMs: number;
  transitionEasingCss: string;
  transitionDelayMs: number;
  /** Duration/easing for a content adapter's own gradient-mesh cover (e.g.
   * AbstractJournalLabCollection.tsx's stackNeutralSurface) — deliberately
   * separate from transitionDurationMs/transitionEasingCss above, which
   * stay tied to the tilt sub-phase for an adapter's other cross-fades
   * (text/scrim color etc.). The mesh cover needs its own, typically
   * longer duration so it doesn't finish clearing well before the card's
   * own translate step (stepTranslateDurationMs) has visually arrived —
   * see SplitColumnCardStackConfig.neighborGradientRevealDurationMs. */
  gradientRevealDurationMs: number;
  gradientRevealEasingCss: string;
  /** Backdrop blur radius (px) a content adapter should apply to its own
   * gradient-mesh cover only while actually crossing the neighbor/active
   * boundary — see CardStackContentRenderProps.stackPresentationTransitioning
   * for the signal that gates "only while crossing," and
   * SplitColumnCardStackConfig.neighborGradientRevealBlurPx for the value
   * itself. */
  gradientRevealBlurPx: number;
  /** Duration/easing for a content adapter's own elevation-shadow fade
   * (e.g. useCardLiftPhysics's own shadowEnabled/shadowEnabledTransitionMs/
   * shadowEnabledEasingCss) as this card crosses the neighbor/active
   * boundary — deliberately its own field pair, not reusing
   * gradientRevealDurationMs/-EasingCss verbatim, since a future operator
   * edit tuning one visually-independent effect (the mesh cover) shouldn't
   * silently retime the other (the shadow) — see
   * SplitColumnCardStackConfig.neighborShadowFadeDurationMs/-Easing for the
   * source values (defaulted to match the gradient reveal's own duration
   * today, so the two already read as one connected transition out of the
   * box). */
  shadowFadeDurationMs: number;
  shadowFadeEasingCss: string;
  /** Duration/easing for the active card's own "Read article" CTA fading in
   * on hover/focus (ArticleCard's `ctaHoverOnly`) — see
   * SplitColumnCardStackConfig.ctaHoverDurationMs/-Easing for the source
   * values. Independent of every other pair above: this reveal is driven
   * by the card's own `:hover`/`:focus-within` state, not a stack step. */
  ctaHoverDurationMs: number;
  ctaHoverEasingCss: string;
  /** How long the pointer must dwell in/out of the card's hover/focus region
   * before the CTA's own fade transition above even starts — see
   * SplitColumnCardStackConfig.ctaHoverDelayMs's own doc comment. */
  ctaHoverDelayMs: number;
};

/**
 * Everything a content adapter needs to render one card's own face —
 * deliberately generic (`item: TItem`, no Abstract journal/lab concept
 * anywhere in this type) so a non-Abstract consumer's adapter closure has
 * exactly the same interaction/presentation context the Abstract adapter
 * gets, never a reduced subset. `CardStackSlot` computes every field here
 * itself (proximity, dwell, tilt state); an adapter never needs to
 * recompute any of it.
 */
export type CardStackContentRenderProps<TItem> = {
  item: TItem;
  itemIndex: number;
  interactive: boolean;
  stackActiveSlide: boolean;
  stackNeighborSettled: boolean;
  stackSlotAnimating: boolean;
  /** True only while this exact slot's own active/inactive status is
   * changing in the current step — i.e. only the card leaving offset 0 and
   * the card arriving at offset 0, never a neighbor merely moving to a new
   * offset while staying inactive throughout. Narrower than
   * `stackSlotAnimating` (true for every visible slot during any step) —
   * a content adapter uses this to gate a boundary-crossing-only effect
   * (e.g. the gradient-mesh reveal blur) so it never fires on a neighbor
   * that never actually changed coverage state. */
  stackPresentationTransitioning: boolean;
  hasHoverPointer: boolean;
  prefersReducedMotion: boolean;
  /** Whether Card Stack's own composing layout is currently in its narrow,
   * single-column ("stacked") mode — see `CardStack.tsx`'s own `stacked`
   * doc comment (from `useCardStackLayout`). Forwarded through so an
   * adapter can adjust its own ambient/decorative behavior the same way
   * the Abstract adapter suppresses its hologram/tilt config once stacked,
   * without `CardStack`/`CardStackSlot` needing any opinion on what that
   * adjustment is. */
  stacked: boolean;
  presentation: CardStackSlotPresentation;
  cardWidthPx: number;
  cardHeightPx: number;
  cardRadius: string;
};

/**
 * The typed content-rendering boundary (bugs audit / feature-development
 * agentic flow, cardstack-content-renderer-boundary): a page-owned function
 * from `CardStackContentRenderProps<TItem>` to the actual card face, called
 * once per visible slot. `CardStack.tsx`'s own Abstract journal/lab call
 * site builds one of these (capturing `collectionConfig`/`motion`/
 * `gradientConfig`/`hologramConfig`/`layoutConfig`/palettes/`visualSlide`
 * resolution in its own closure, unchanged from what used to be threaded
 * through this component's own props directly) — a non-journal consumer
 * (e.g. About's narrative cards) supplies a different one, with its own
 * closure, over its own `TItem` shape. `CardStackSlot` itself never knows
 * which kind of content it's rendering.
 */
export type CardStackContentAdapter<TItem> = (props: CardStackContentRenderProps<TItem>) => ReactNode;

export type CardStackSlotProps<TItem> = {
  offset: number;
  itemIndex: number;
  /** The one card that owns the stack's live region/current-card marker.
   * A mobile drag preview can look like an arriving active card without
   * becoming a second semantic active card in the DOM. */
  isCurrentActive?: boolean;
  presentationState?: 'active' | 'inactive';
  pose: StackSlotPose;
  staggerMs: number;
  translateY: number;
  interactive: boolean;
  stackSlotAnimating: boolean;
  /** See `CardStackContentRenderProps.stackPresentationTransitioning`'s own
   * doc comment — computed by the caller (CardStack.tsx), forwarded
   * straight through to `renderContent`. */
  stackPresentationTransitioning: boolean;
  stackNeighborSettled: boolean;
  /** Persisted slot with the longest final stagger for the current step. */
  motionCompletionSentinel: boolean;
  /** Completes the global stack step from this slot's real transform end. */
  onMotionComplete: () => void;
  /** The page-owned item this slot renders — opaque to CardStackSlot
   * itself, passed straight through to `renderContent`. */
  item: TItem;
  /** See `CardStackContentAdapter`'s own doc comment. */
  renderContent: CardStackContentAdapter<TItem>;
  /** Passed straight through to `renderContent` — see
   * `CardStackContentRenderProps.stacked`'s own doc comment. */
  stacked: boolean;
  cardWidthPx: number;
  cardHeightPx: number;
  aboveCount: number;
  belowCount: number;
  physicsConfig: CtaButtonConfig;
  stackConfig: SplitColumnCardStackConfig;
  tiltEasingCss: string;
  translateEasingCss: string;
  /** Resolved CSS easing for stackConfig.neighborGradientRevealEasing —
   * see `CardStackSlotPresentation.gradientRevealEasingCss`'s own doc
   * comment for why this is separate from tiltEasingCss/translateEasingCss. */
  gradientRevealEasingCss: string;
  /** Resolved CSS easing for stackConfig.neighborShadowFadeEasing — see
   * `CardStackSlotPresentation.shadowFadeEasingCss`'s own doc comment. */
  shadowFadeEasingCss: string;
  /** Resolved CSS easing for stackConfig.neighborPoseEasing — drives this
   * slot's own rotate+scale transform transition (tiltTransitionEntries'
   * 'transform' entry below), decoupled from tiltEasingCss/stepTiltDurationMs
   * (which still governs only the content adapter's own text/scrim
   * cross-fade). See SplitColumnCardStackConfig.neighborPoseDurationMs's
   * own doc comment for why this split exists. */
  poseEasingCss: string;
  /** Resolved CSS easing for stackConfig.ctaHoverEasing — see
   * `CardStackSlotPresentation.ctaHoverEasingCss`'s own doc comment. */
  ctaHoverEasingCss: string;
  /** Effective translate duration for this step — CardStack.tsx's own
   * resolveStackStepDurationMs, already velocity-scaled for the gesture (if
   * any) that triggered the current step. Read here instead of
   * stackConfig.stepTranslateDurationMs directly so a fast flick's own row
   * animation and the gesture-preview wrapper it hands off from (both driven
   * from the same source in CardStack.tsx) always share one duration. */
  translateDurationMs: number;
  /** Resolved CSS easing for stackConfig.neighborSettleOpacityEasing — see
   * the settle-grace doc comment below for what it's used for. */
  settleOpacityEasingCss: string;
  resolvedNeighborBackgroundColor: string;
  resolvedNeighborTextColor: string;
  resolvedNeighborTopicBorderColor: string;
  resolvedNeighborCardBorderColor: string;
  /** Same base color as resolvedNeighborCardBorderColor above, at
   * SplitColumnCardStackConfig.neighborBorderHoverOpacity's own alpha
   * instead — this slot's own isHovered state below swaps to this while a
   * settled neighbor is genuinely hovered on a hover-capable device, so
   * `presentation.cardBorderColor` (CardStackContentRenderProps) always
   * carries whichever one is currently correct; the content adapter never
   * needs to know hover happened at all. */
  resolvedNeighborCardBorderHoverColor: string;
  prefersReducedMotion: boolean;
  cardRadius: string;
  /** Raw device capability — `(hover: hover) and (pointer: fine)` — the
   * single gate for everything a *wide-pointer* device gets that a touch/
   * coarse-pointer device doesn't: hidden arrows (CardStack.tsx), always-on
   * click-to-promote, and eligibility for the proximity opacity/scale
   * engine and the dwell auto-promote timer (each still separately opted
   * into via their own stackConfig field — see stack.ts's own doc comments
   * on cursorIntentEnabled and neighborProximityOpacityEnabled/
   * neighborProximityScaleEnabled for why none of these imply each other). */
  hasHoverPointer: boolean;
  /** Promote this slot to active — called both by the click path and by
   * the local dwell timer below. Never triggers real navigation either
   * way (content-adapter-owned, e.g. AbstractJournalLabHueFadeCard's own
   * href/Link). */
  onPromote: (itemIndex: number) => void;
};

/**
 * One stack slot's render tree, extracted from CardStack.tsx's own
 * `visibleSlots.map()` (PLAN: extract the shared proximity detector) so it
 * can be its own component instance — required for `usePointerProximity`
 * (components/proximity/usePointerProximity.ts, the same detector already
 * driving card tilt/lift and the hologram interaction elsewhere in this
 * codebase) to be called legally: it's a hook meant for one call per
 * tracked element, and the neighbor slots used to render inside a single
 * parent's `.map()` whose length changes with viewport height — calling a
 * hook a variable number of times there breaks the rules of hooks. Each
 * `CardStackSlot` instance calls it exactly once, unconditionally,
 * regardless of how many total instances exist.
 *
 * Generic over `TItem` since `cardstack-content-renderer-boundary`
 * (bugs audit / feature-development agentic flow): this component owns the
 * shared proximity/tilt/dwell/promote interaction shell only, never a
 * specific card's own content — see `renderContent`'s own doc comment.
 */
export function CardStackSlot<TItem>({
  offset,
  itemIndex,
  isCurrentActive = offset === 0,
  presentationState = isCurrentActive ? 'active' : 'inactive',
  pose,
  staggerMs,
  translateY,
  interactive,
  stackSlotAnimating,
  stackPresentationTransitioning,
  stackNeighborSettled,
  motionCompletionSentinel,
  onMotionComplete,
  item,
  renderContent,
  stacked,
  cardWidthPx,
  cardHeightPx,
  aboveCount,
  belowCount,
  physicsConfig,
  stackConfig,
  tiltEasingCss,
  translateEasingCss,
  translateDurationMs,
  gradientRevealEasingCss,
  shadowFadeEasingCss,
  poseEasingCss,
  ctaHoverEasingCss,
  settleOpacityEasingCss,
  resolvedNeighborBackgroundColor,
  resolvedNeighborTextColor,
  resolvedNeighborTopicBorderColor,
  resolvedNeighborCardBorderColor,
  resolvedNeighborCardBorderHoverColor,
  prefersReducedMotion,
  cardRadius,
  hasHoverPointer,
  onPromote,
}: CardStackSlotProps<TItem>) {
  // A slot mid-step-transition never participates in anything below — its
  // own bounding box is being animated by the scripted stack motion right
  // now (round 14, PLAN-VERTICAL-CARD-STACK.md: measuring live cursor
  // distance against a moving box produces an erratic, non-monotonic
  // artifact), and it's never the active slot either way.
  const settledNeighbor = offset !== 0 && !stackSlotAnimating;
  // Four independent gates (PLAN: decouple cursor-intent navigation from
  // proximity visuals; hide arrows unconditionally on wide-pointer devices)
  // — any combination can be true at once, none implies another:
  //   - clickPromotable: a click/tap always promotes a settled neighbor on
  //     *any* device, touch included — mirrors wide-pointer devices' own
  //     click-to-promote (CardStack.tsx hides the arrows unconditionally
  //     there, making this the baseline navigation path that replaces
  //     them), but touch/coarse-pointer devices keep the arrows alongside
  //     it rather than losing them, since a vertical drag-to-step gesture
  //     still doesn't exist for them.
  //   - dwellActive: the *ambient* extra — hovering long enough auto-
  //     promotes without a click — layered on top of clickPromotable, only
  //     on wide-pointer devices (a touch tap has no hover state to dwell
  //     in) while the operator's own stackConfig.cursorIntentEnabled opts
  //     into it. Off by default has clickPromotable alone; on adds the
  //     timer.
  //   - opacityProximityActive / scaleProximityActive: whether *this*
  //     visual reads live proximity right now — purely decorative, entirely
  //     unrelated to either navigation gate above.
  const clickPromotable = settledNeighbor;
  const dwellActive = hasHoverPointer
    && stackConfig.cursorIntentEnabled
    && settledNeighbor;
  const opacityProximityActive = hasHoverPointer
    && stackConfig.neighborProximityOpacityEnabled && settledNeighbor;
  const scaleProximityActive = hasHoverPointer
    && stackConfig.neighborProximityScaleEnabled && settledNeighbor;
  // Real pointer-rest state, distinct from dwellActive above (which times
  // an auto-promote regardless of whether this flag exists) and from
  // opacityProximityActive/scaleProximityActive (continuous, distance-based
  // envelopes, not a binary on/off) — this just tracks whether the pointer
  // is currently inside the hit-zone below, gated the same way every other
  // pointer-only affordance in this file is (hasHoverPointer, settled). See
  // resolvedNeighborCardBorderHoverColor's own doc comment for why this
  // exists: swapping the neighbor border to a separate, operator-tunable
  // hover opacity.
  const [isHovered, setIsHovered] = useState(false);
  const hoverBorderActive = hasHoverPointer && settledNeighbor && isHovered;
  // Suppressed under prefers-reduced-motion — the dwell timer below never
  // starts; an explicit click still promotes instantly either way.
  const autoPromoteEnabled = dwellActive && !prefersReducedMotion;

  // Settle-grace window (SplitColumnCardStackConfig.neighborSettleOpacity-
  // TransitionMs's own doc comment): true for a brief, configurable window
  // right after this slot's own settledNeighbor flips from false to true,
  // so the tiltLayer's own CSS transition below (not usePointerProximity's
  // exponential attack envelope) governs that one opening opacity ramp —
  // an exponential envelope's steepest slope sits right at t=0, which reads
  // as an abrupt pop the one time the target jumps straight to a large
  // value on the very frame proximity turns on (the cursor already resting
  // on the card the instant a step finishes), rather than climbing from a
  // moving one. Every ramp *after* this window still comes from the live
  // JS envelope, unchanged — see the transitionProperty compositing below
  // for why the two can never both be active on opacity at once. Keyed off
  // a genuine false->true edge (not just "is settled"), so a re-render
  // while already settled never restarts it, and off entirely under
  // prefers-reduced-motion, matching every other motion in this file.
  const [settleGraceActive, setSettleGraceActive] = useState(false);
  const wasSettledRef = useRef(settledNeighbor);
  const settleTransitionMsRef = useRef(stackConfig.neighborSettleOpacityTransitionMs);
  settleTransitionMsRef.current = stackConfig.neighborSettleOpacityTransitionMs;
  useEffect(() => {
    const justSettled = settledNeighbor && !wasSettledRef.current;
    wasSettledRef.current = settledNeighbor;
    if (!justSettled || prefersReducedMotion) return undefined;
    setSettleGraceActive(true);
    const timeoutId = window.setTimeout(
      () => setSettleGraceActive(false),
      settleTransitionMsRef.current,
    );
    return () => window.clearTimeout(timeoutId);
  }, [settledNeighbor, prefersReducedMotion]);

  const proximityRef = usePointerProximity<HTMLDivElement>({
    radiusPx: stackConfig.neighborProximityRadiusPx,
    easing: stackConfig.neighborProximityEasing,
    // While settleGraceActive, the tiltLayer's own CSS transition below is
    // what's supposed to carry all of the opening ramp's softening — but
    // usePointerProximity's own exponential attack keeps climbing toward
    // its target at the same time by default, which makes the CSS
    // transition chase a *still-rising* target instead of easing to a
    // settled one. Verified live (round of manual RAF sampling against a
    // real page): that combination doesn't read as one clean ease — it
    // reads as a stall followed by a delayed catch-up jump, i.e. exactly
    // the "double-smoothed into a laggy blur" outcome the no-CSS-transition
    // default elsewhere in this file was already written to avoid. Forcing
    // the attack down to ~1ms here — only during the grace window —
    // converges stepPointerProximityEnvelope's exponential coefficient to
    // effectively 1 within a single frame (a looser value, e.g. 16ms, still
    // left a visible multi-frame chase — ~150-250ms — before the target
    // actually stabilized), so the JS side settles on its real target
    // almost immediately and the CSS transition spends its own full
    // configured duration easing toward an effectively fixed value instead
    // of one still climbing underneath it.
    attackMs: settleGraceActive ? 1 : stackConfig.neighborProximityAttackMs,
    releaseMs: stackConfig.neighborProximityReleaseMs,
    // Always called (rules of hooks), live only while at least one of the
    // two proximity visuals is active — resolves to 0 (--pointer-proximity
    // eases to rest) the rest of the time, which the opacity/scale
    // expressions below only ever multiply against in the first place, so
    // an idle subscription here is inert, not just disabled-in-spirit.
    disabled: !opacityProximityActive && !scaleProximityActive,
  });

  const dwellTimeoutRef = useRef(0);
  const clearDwellTimer = useCallback(() => {
    if (dwellTimeoutRef.current) {
      window.clearTimeout(dwellTimeoutRef.current);
      dwellTimeoutRef.current = 0;
    }
  }, []);
  useEffect(() => clearDwellTimer, [clearDwellTimer]);

  const handleHitZonePointerEnter = useCallback(() => {
    setIsHovered(true);
    clearDwellTimer();
    if (!autoPromoteEnabled) return;
    dwellTimeoutRef.current = window.setTimeout(() => {
      dwellTimeoutRef.current = 0;
      onPromote(itemIndex);
    }, stackConfig.dwellThresholdMs);
  }, [autoPromoteEnabled, clearDwellTimer, itemIndex, onPromote, stackConfig.dwellThresholdMs]);

  const handleHitZonePointerLeave = useCallback(() => {
    setIsHovered(false);
    clearDwellTimer();
  }, [clearDwellTimer]);

  const handlePromoteClick = useCallback(() => {
    clearDwellTimer();
    onPromote(itemIndex);
  }, [clearDwellTimer, itemIndex, onPromote]);

  const handleInteractionClick = useCallback(() => {
    if (!clickPromotable) return;
    handlePromoteClick();
  }, [clickPromotable, handlePromoteClick]);

  // transform/opacity are each independently excluded from the tiltLayer's
  // own CSS transition below while their matching proximity visual is live
  // — their rest components (--stack-slot-opacity/--stack-slot-scale) never
  // actually change in that state (only a real step changes them, which
  // always implies settledNeighbor is false), and the proximity component
  // is already smoothed by usePointerProximity's own attack/release
  // envelope; layering a CSS transition on top of an already-eased,
  // per-frame value the whole time would double-smooth it into a laggy
  // blur. Opacity gets one exception: while settleGraceActive (see that
  // state's own doc comment above), it rejoins the CSS transition list —
  // with its own duration/easing/zero delay, not stepTiltDurationMs/
  // tiltEasingCss/staggerMs — for that one settle-in ramp only, then drops
  // back out once the grace window elapses and the JS envelope takes back
  // over for continuous live cursor-follow.
  const tiltTransitionEntries: Array<{ delayMs: number; durationMs: number; easingCss: string; property: string }> = [];
  if (!scaleProximityActive) {
    // Uses neighborPoseDurationMs/poseEasingCss, not stepTiltDurationMs/
    // tiltEasingCss — this is the slot's own rotate+scale transform
    // (StackSlotPose), decoupled from the content adapter's own text/
    // scrim cross-fade duration (which still reads stepTiltDurationMs via
    // `presentation` below). Before this split, the pose transform shared
    // stepTiltDurationMs's short, rotate-tuned default (180ms) — well
    // under stepTranslateDurationMs's own 500ms default, so a neighbor
    // card visibly finished shrinking to its resting scale while still
    // well into its own translate slide, reading as an abrupt pop instead
    // of one connected motion (operator-reported).
    tiltTransitionEntries.push({
      delayMs: staggerMs, durationMs: stackConfig.neighborPoseDurationMs, easingCss: poseEasingCss, property: 'transform',
    });
  }
  if (!opacityProximityActive) {
    // Uses neighborGradientRevealDurationMs/-EasingCss, not
    // stepTiltDurationMs/tiltEasingCss above — this is the whole slot's own
    // rest-opacity fade (neighborOpacity), the same visual event as the
    // content adapter's own gradient-mesh cover fade (CardStackSlotPresentation
    // .gradientRevealDurationMs), so both move on one shared, longer window
    // instead of two independent short ones compounding into a pop.
    tiltTransitionEntries.push({
      delayMs: staggerMs,
      durationMs: stackConfig.neighborGradientRevealDurationMs,
      easingCss: gradientRevealEasingCss,
      property: 'opacity',
    });
  } else if (settleGraceActive) {
    tiltTransitionEntries.push({
      delayMs: 0, durationMs: stackConfig.neighborSettleOpacityTransitionMs, easingCss: settleOpacityEasingCss, property: 'opacity',
    });
  }

  return (
    <div
      className={styles.translateLayer}
      onTransitionEnd={event => {
        if (
          motionCompletionSentinel
          && event.target === event.currentTarget
          && event.propertyName === 'transform'
        ) {
          onMotionComplete();
        }
      }}
      style={{
        width: `${cardWidthPx}px`,
        height: `${cardHeightPx}px`,
        // Perspective declared once, here, as a plain CSS property -- not
        // embedded in the tiltLayer's own animated `transform` below. See
        // stackRotateCss's own doc comment for why (round 8: nesting a
        // second, local `transform: perspective()` directly against the
        // card's own independent perspective produced inconsistent-looking
        // rounded corners on rotated neighbor cards).
        perspective: `${physicsConfig.tiltPerspectivePx}px`,
        transform: `translate(-50%, calc(-50% + ${translateY}px))`,
        transitionProperty: 'transform',
        transitionDuration: `${translateDurationMs}ms`,
        transitionTimingFunction: translateEasingCss,
        // Same delay as the tiltLayer below (staggerMs only) -- translate
        // and tilt/scale/opacity start together, one fluid motion per
        // card, not translate waiting for tilt to finish. Only the
        // stagger *across* cards (by distance from the active slot) is
        // sequenced.
        transitionDelay: `${staggerMs}ms`,
        zIndex: aboveCount + belowCount + 2 - Math.abs(offset),
      } as CSSProperties}
    >
      <div
        ref={proximityRef}
        className={styles.tiltLayer}
        data-card-stack-offset={offset}
        data-card-stack-active={isCurrentActive ? 'true' : undefined}
        // Gates CardStack.module.css's own opacity-blend rule — renamed
        // from the old data-hover-intent now that this is specifically
        // about the opacity visual, decoupled from navigation.
        data-proximity-opacity={opacityProximityActive ? 'true' : undefined}
        style={{
          // Rotation only (rest pose, from stackRotateCss) plus a scale()
          // term composed right here: a plain literal when scale-proximity
          // is off, or a calc() blend of the rest scale with live proximity
          // when it's on. --proximity-scale-boost is the *only* thing that
          // differs between those two cases — 0 makes the calc()
          // expression resolve to exactly the rest scale, so scale-
          // proximity being off is provably inert, not just "usually a
          // no-op." Kept in the same `transform` list (not a separate CSS
          // `scale` property) so it composes with rotateX/rotateY in
          // exactly the order stackRotateCss's own callers have always
          // relied on.
          transform: `${stackRotateCss(pose)} scale(calc(var(--stack-slot-scale, 1) + var(--proximity-scale-boost, 0) * var(--pointer-proximity, 0)))`,
          // Plain numeric rest opacity, read by CardStack.module.css's own
          // `.tiltLayer` rule — never opacity directly (see that rule's
          // own doc comment): usePointerProximity above writes
          // `--pointer-proximity` onto this same element, and a second,
          // more specific CSS rule there blends the two. Writing opacity
          // directly here instead would make an inline style
          // un-overridable by that rule regardless of specificity.
          '--stack-slot-opacity': pose.opacity,
          '--stack-slot-scale': pose.scale,
          '--proximity-scale-boost': scaleProximityActive ? stackConfig.neighborProximityScaleAmount : 0,
          transitionProperty: tiltTransitionEntries.map(entry => entry.property).join(', ') || 'none',
          transitionDuration: tiltTransitionEntries.map(entry => `${entry.durationMs}ms`).join(', ') || '0ms',
          transitionTimingFunction: tiltTransitionEntries.map(entry => entry.easingCss).join(', ') || 'linear',
          transitionDelay: tiltTransitionEntries.map(entry => `${entry.delayMs}ms`).join(', ') || '0ms',
        } as CSSProperties}
      >
        {renderContent({
          item,
          itemIndex,
          interactive,
          stackActiveSlide: offset === 0,
          stackNeighborSettled,
          stackSlotAnimating,
          stackPresentationTransitioning,
          hasHoverPointer,
          prefersReducedMotion,
          stacked,
          presentation: {
            state: presentationState,
            surfaceColor: resolvedNeighborBackgroundColor,
            textColor: resolvedNeighborTextColor,
            topicBorderColor: resolvedNeighborTopicBorderColor,
            cardBorderColor: hoverBorderActive
              ? resolvedNeighborCardBorderHoverColor
              : resolvedNeighborCardBorderColor,
            headerOpacity: stackConfig.activeHeaderOpacity,
            textOpacity: stackConfig.activeTextOpacity,
            transitionDurationMs: prefersReducedMotion ? 0 : stackConfig.stepTiltDurationMs,
            transitionEasingCss: tiltEasingCss,
            transitionDelayMs: prefersReducedMotion ? 0 : staggerMs,
            gradientRevealDurationMs: prefersReducedMotion ? 0 : stackConfig.neighborGradientRevealDurationMs,
            gradientRevealEasingCss,
            gradientRevealBlurPx: prefersReducedMotion ? 0 : stackConfig.neighborGradientRevealBlurPx,
            shadowFadeDurationMs: prefersReducedMotion ? 0 : stackConfig.neighborShadowFadeDurationMs,
            shadowFadeEasingCss,
            ctaHoverDurationMs: prefersReducedMotion ? 0 : stackConfig.ctaHoverDurationMs,
            ctaHoverEasingCss,
            ctaHoverDelayMs: prefersReducedMotion ? 0 : stackConfig.ctaHoverDelayMs,
          },
          cardWidthPx,
          cardHeightPx,
          cardRadius,
        })}
        {!interactive ? (
          <div
            className={styles.slotInteractionLayer}
            data-promotable={clickPromotable ? 'true' : 'false'}
            aria-hidden="true"
            // One stable hit-test node survives the blocked -> promotable
            // handoff. A stationary cursor therefore does not depend on the
            // browser noticing that one composited overlay was removed and
            // another inserted after the transformed card settles.
            onPointerEnter={handleHitZonePointerEnter}
            onPointerLeave={handleHitZonePointerLeave}
            onClick={handleInteractionClick}
          />
        ) : null}
      </div>
    </div>
  );
}
