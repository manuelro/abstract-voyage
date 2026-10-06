import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useCardLiftPhysics } from '../../../components/proximity/useCardLiftPhysics';
import type { CtaButtonConfig } from '../../../components/CtaButton/config/registered';
import type { AbstractCoverFlowTimelineSlotConfig } from '../../../pages/abstract.config';
import { tailwindTokenCssValue } from '../../../components/Panel/config/tailwindFields';

const VERTICAL_ALIGN_TO_JUSTIFY: Record<AbstractCoverFlowTimelineSlotConfig['verticalAlignMd'], CSSProperties['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
};

const FIGURE_CORNER_RADIUS = '1rem';

// 'betweenActiveAndLeftNeighbor' settle-detection tuning (see that effect's
// own doc comment): a sampled position must hold steady within EPSILON_PX
// for GAP_SETTLE_STABLE_MS before it's treated as a real resting target
// worth moving to, so a live drag (which changes the sample every frame)
// never itself triggers a move.
const GAP_POSITION_EPSILON_PX = 0.5;
const GAP_POSITION_SETTLE_STABLE_MS = 140;
const GAP_POSITION_TRANSITION = 'left 380ms cubic-bezier(0.19, 1, 0.22, 1)';

function cssLengthToPixels(cssLength: string): number {
  if (cssLength.endsWith('px')) return Number.parseFloat(cssLength) || 0;
  if (cssLength.endsWith('rem')) {
    const rootFontSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize);
    return (Number.parseFloat(cssLength) || 0) * (rootFontSize || 16);
  }
  return 0;
}

/** Mirrors MobilePinnedArticleSection's glass paint: alpha belongs in the
 * background color, never on the backdrop-filter element itself. Element
 * opacity can flatten the compositor layer and leave blur visually absent;
 * color-mix keeps the layer eligible to sample and blur the real CoverFlow
 * content behind it. */
function translucentGlassColor(color: string, opacity: number): string {
  return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;
}

export type AbstractCoverFlowTimelineSlotProps = {
  config: AbstractCoverFlowTimelineSlotConfig;
  tier: 'md' | 'lg';
  ctaConfig: CtaButtonConfig;
  hasHoverPointer: boolean;
  children: ReactNode;
};

/**
 * Opt-in figure that hosts the Timeline inside the CoverFlow's own track
 * (same absolutely-positioned plane the active card sits in), per
 * AbstractCoverFlowTimelineSlotConfig's own doc comment. `children` is the
 * page's own existing <AboutTimeline> instance verbatim (consumed, not
 * reimplemented) — this component only supplies the figure shell: sizing/
 * position/background/tint/tilt physics/no-shadow around it.
 *
 * Tilt reuses `ctaConfig` (normalizedCtaButtonConfig) directly — "same
 * config knobs as the card" — this component holds no tilt magnitude of its
 * own, only the enabled/disabled gate (config.tiltEnabled, hasHoverPointer).
 */
export default function AbstractCoverFlowTimelineSlot({
  config, tier, ctaConfig, hasHoverPointer, children,
}: AbstractCoverFlowTimelineSlotProps) {
  const widthPercent = tier === 'lg' ? config.widthPercentLg : config.widthPercentMd;
  const xPercent = tier === 'lg' ? config.xPercentLg : config.xPercentMd;
  const verticalAlign = tier === 'lg' ? config.verticalAlignLg : config.verticalAlignMd;
  const aspectRatio = tier === 'lg' ? config.aspectRatioLg : config.aspectRatioMd;
  const positionMode = tier === 'lg' ? config.positionModeLg : config.positionModeMd;
  const backgroundMode = tier === 'lg' ? config.backgroundModeLg : config.backgroundModeMd;
  const backgroundColor = tier === 'lg' ? config.backgroundColorLg : config.backgroundColorMd;
  const backgroundOpacity = tier === 'lg' ? config.backgroundOpacityLg : config.backgroundOpacityMd;
  const backdropBlurPx = tier === 'lg' ? config.backdropBlurPxLg : config.backdropBlurPxMd;
  const backgroundGradientColorEnd = tier === 'lg'
    ? config.backgroundGradientColorEndLg
    : config.backgroundGradientColorEndMd;
  const backgroundGradientAngleDeg = tier === 'lg'
    ? config.backgroundGradientAngleDegLg
    : config.backgroundGradientAngleDegMd;
  const backgroundGradientScale = tier === 'lg'
    ? config.backgroundGradientScaleLg
    : config.backgroundGradientScaleMd;
  const minWidth = tier === 'lg' ? config.minWidthLg : config.minWidthMd;
  const minLeftInsetClassName = tier === 'lg'
    ? config.minLeftInsetClassNameLg
    : config.minLeftInsetClassNameMd;
  const minLeftInsetCssValue = tailwindTokenCssValue(
    'paddingLeft', tier === 'lg' ? 'lg' : 'md', minLeftInsetClassName,
  );
  const alignToTopWordmark = tier === 'lg'
    ? config.alignToTopWordmarkLg
    : config.alignToTopWordmarkMd;

  const figureGlassBackground = backgroundMode === 'gradient'
    ? `linear-gradient(${backgroundGradientAngleDeg}deg, ${translucentGlassColor(backgroundColor, backgroundOpacity)}, ${translucentGlassColor(backgroundGradientColorEnd, backgroundOpacity)} ${backgroundGradientScale}%)`
    : translucentGlassColor(backgroundColor, backgroundOpacity);

  // 'snapLeft'/'snapRight' bleed the figure flush against that edge of the
  // CoverFlow's own visible track instead of the xPercent-centered
  // positioning 'free' uses — no translateX centering, no xPercent read.
  // 'betweenActiveAndLeftNeighbor' also ignores xPercent, and deliberately
  // sets no left/right/transform here at all: its own left/transform are
  // owned entirely by the live-tracking effect below, written imperatively
  // every frame. Setting a value here too would fight that effect — this
  // style object gets reapplied on every React re-render (any state change
  // anywhere on the page), which would otherwise reset left/transform back
  // to a placeholder and visibly flicker until the next animation frame
  // corrected it again.
  const outerPositionStyle: CSSProperties = positionMode === 'snapLeft'
    ? { left: 0 }
    : positionMode === 'snapRight'
      ? { right: 0 }
      : positionMode === 'betweenActiveAndLeftNeighbor'
        ? {}
        : { left: `${xPercent}%`, transform: 'translateX(-50%)' };

  // The snapped edge reads as flush/seamless against the track boundary
  // (operator ask) rather than visibly rounded-off mid-air — only the two
  // corners on that edge go to 0, the opposite edge keeps the figure's
  // normal corner radius. 'betweenActiveAndLeftNeighbor' keeps every corner
  // rounded — it never touches the track's own edge, same as 'free'.
  const borderRadius = positionMode === 'snapLeft'
    ? `0 ${FIGURE_CORNER_RADIUS} ${FIGURE_CORNER_RADIUS} 0`
    : positionMode === 'snapRight'
      ? `${FIGURE_CORNER_RADIUS} 0 0 ${FIGURE_CORNER_RADIUS}`
      : FIGURE_CORNER_RADIUS;

  // Only the two snapped modes force tilt/lift off regardless of
  // tiltEnabled — a flush-mounted edge panel reads as part of the track's
  // own frame, not a free-floating hoverable card.
  // 'betweenActiveAndLeftNeighbor' behaves like 'free' here.
  const tiltDisabled = positionMode === 'snapLeft' || positionMode === 'snapRight'
    || !config.tiltEnabled || !hasHoverPointer;

  // The figure's own positioning transform (translateX centering, 'free'
  // mode only) lives on the OUTER element; this ref is attached to the
  // INNER element instead, so the lift engine's own composeAndApply writes
  // are the only transform ever set there — the same split
  // CoverFlowItemInner's own card wrapper uses, so the two transforms never
  // fight over one style string.
  const { ref: liftRef } = useCardLiftPhysics<HTMLDivElement>({
    config: ctaConfig,
    disabled: tiltDisabled,
    shadowEnabled: false,
  });

  const outerRef = useRef<HTMLDivElement | null>(null);

  // A percentage `left` normally follows its containing block automatically,
  // but this overlay can inherit imperative left/right writes from the gap
  // placement mode. Reconcile free placement against the *current* CoverFlow
  // track width on mount and whenever that track resizes, so a resize cannot
  // leave a previously measured pixel position (or edge constraint) in
  // control. The configured value remains a center percentage: 0, 50, and
  // 100 mean the track's left edge, center, and right edge respectively.
  // Its rendered left edge is additionally bounded by the chosen shared
  // Tailwind spacing token, so a minimum inset remains meaningful even when
  // a wide figure makes a low center percentage unsafe.
  useLayoutEffect(() => {
    if (positionMode !== 'free') return undefined;
    const outer = outerRef.current;
    const track = outer?.parentElement;
    if (!outer || !track) return undefined;

    const applyFreePosition = () => {
      const wordmark = alignToTopWordmark
        ? Array.from(document.querySelectorAll<HTMLElement>('[data-site-wordmark-anchor="true"]'))
          .find(candidate => candidate.getBoundingClientRect().width > 0)
        : null;
      const trackRect = track.getBoundingClientRect();
      const requestedCenterPx = wordmark
        ? wordmark.getBoundingClientRect().left - trackRect.left + outer.offsetWidth / 2
        : track.clientWidth * (xPercent / 100);
      const minCenterPx = cssLengthToPixels(minLeftInsetCssValue) + outer.offsetWidth / 2;
      outer.style.left = `${Math.max(requestedCenterPx, minCenterPx)}px`;
      outer.style.right = 'auto';
      outer.style.transform = 'translateX(-50%)';
    };

    applyFreePosition();
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(applyFreePosition);
    resizeObserver?.observe(track);
    const wordmark = alignToTopWordmark
      ? Array.from(document.querySelectorAll<HTMLElement>('[data-site-wordmark-anchor="true"]'))
        .find(candidate => candidate.getBoundingClientRect().width > 0)
      : null;
    if (wordmark) resizeObserver?.observe(wordmark);
    window.addEventListener('resize', applyFreePosition);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', applyFreePosition);
    };
  }, [alignToTopWordmark, minLeftInsetCssValue, positionMode, xPercent]);

  // 'betweenActiveAndLeftNeighbor' — centers this figure on the RESTING gap
  // between the active CoverFlow card's left edge and its left neighbor's
  // right edge (or the track's own left edge, substituting for a missing
  // neighbor at index 0). Measured from the real, rendered card boxes —
  // rather than recomputed from CoverFlow's own spacing/landing-mode
  // formulas — so it stays correct under any configuration of those
  // (consume the real geometry, don't reimplement it).
  //
  // Deliberately NOT written on every sample: operator-reported, the figure
  // was visibly sliding along with the cards while the end user dragged —
  // wrong, this figure is meant to read as a fixed fixture the cards move
  // past, not another moving slide. The sampling loop below still runs
  // every frame (cheap — two getBoundingClientRect calls), but only
  // COMMITS a new position once the sampled value has held steady (within
  // GAP_POSITION_EPSILON_PX) for GAP_POSITION_SETTLE_STABLE_MS — which a
  // live drag, changing the sample continuously, never satisfies. Once a
  // release/settle/navigation lands on a genuinely new resting gap, the
  // sample stops changing, the stability window elapses, and exactly one
  // committed move happens — eased via GAP_POSITION_TRANSITION (a real CSS
  // transition on `left`, set once in the style object below, not fought by
  // this effect's own imperative writes since it never touches
  // `transition` itself) — landing the figure there until the next real
  // change. The very first sample after mount commits immediately (no
  // stability wait), so the figure has a correct position from first paint
  // rather than sitting at its unstyled fallback for one settle window.
  useEffect(() => {
    if (positionMode !== 'betweenActiveAndLeftNeighbor') return undefined;
    const outer = outerRef.current;
    if (!outer) return undefined;
    const track = outer.parentElement;
    if (!track) return undefined;
    // CoverFlow's own root — the exact element Framer Motion's `drag="x"`
    // attaches native pointer handling to (CoverFlow.tsx's own
    // data-cover-flow-geometry attribute). A pause mid-gesture (a human
    // swipe rarely moves at a perfectly constant rate) can hold the sampled
    // gap position steady for longer than GAP_POSITION_SETTLE_STABLE_MS
    // even while the user is still actively dragging — the stability timer
    // alone isn't a reliable "the user let go" signal. Listening for the
    // real pointer gesture directly is: while pointerIsDown is true, no
    // commit happens no matter how long the sample has looked stable.
    // `track` (this figure's own parent) IS that root now that the figure
    // renders via CoverFlow's own `overlayContent` prop
    // (PLAN-COVERFLOW-TIMELINE-SLOT-DRAG-AREA.md) rather than as an
    // external sibling — `matches` covers that; `querySelector` is kept as
    // a fallback for any other ancestor shape this component might ever be
    // mounted under.
    const coverFlowRoot = track.matches('[data-cover-flow-geometry]')
      ? track
      : track.querySelector('[data-cover-flow-geometry]');

    let frame = 0;
    let lastSample: number | null = null;
    let lastChangeAt = 0;
    let appliedCenter: number | null = null;
    let pointerIsDown = false;

    // BUG (root cause, live-instrumented): dragging across several cards
    // then pausing WITHOUT releasing (a "hold" — the pointer is still down,
    // it has simply stopped moving) freezes the sampled gap at whatever the
    // still-labeled-active (stale, pre-release) card's dragged-away
    // position happens to be. That frozen sample sits "stable" for as long
    // as the hold lasts — often far longer than GAP_POSITION_SETTLE_STABLE_MS
    // — so by the instant the pointer actually lifts, `stableForMs` is
    // already huge and the very next animation frame (before the real
    // active card has even updated in the DOM, let alone visually settled)
    // committed that stale mid-drag value — the figure could commit
    // anywhere, including fully outside the viewport. The stability clock
    // itself was never wrong about "how long has the SAMPLE been
    // unchanged" — the bug was letting a streak accumulated BEFORE/DURING
    // the gesture count as evidence toward a commit decision made AFTER
    // it. Fix: any real pointer transition (down — a fresh grab, possibly
    // interrupting a still-settling previous move; up — a release, real or
    // out of a hold) invalidates whatever streak came before it, forcing
    // the settle window to restart from that instant. A commit can now
    // only ever happen from stability measured strictly after the
    // gesture's own boundary, never from before or during it.
    const resetStabilityClock = () => {
      lastSample = null;
    };
    // BUG (operator-reported, screenshot): clicking a Timeline row to
    // navigate — as opposed to dragging the CoverFlow itself — made the
    // figure visibly shift left or right (toward whichever side the newly
    // active card's gap happened to land on). Confusing specifically for
    // this gesture: the element the operator just pressed relocates itself
    // as a direct result of that press, unlike a drag on the cards
    // elsewhere, where the operator's attention is already on the track
    // moving. Fix: a pointerdown that originates *inside this figure's own
    // subtree* (a Timeline row link, not a card or empty track) marks every
    // commit for the REST of that gesture as one to skip, not just the
    // next one — a click-driven navigation's own settle can itself land on
    // a transient plateau before its true final position (the same
    // multi-stage-settle shape a big drag jump already showed elsewhere in
    // this file), so consuming the suppression after a single commit let
    // that later, real commit through unsuppressed (live-instrumented:
    // confirmed a false-plateau commit followed by a second, genuine one).
    // Position bookkeeping (appliedCenter/lastSample) still updates
    // normally either way, so a later, real drag-driven move starts from a
    // consistent baseline — only the visible `style.left` write is ever
    // skipped. Reset exclusively by the *next* pointerdown (to true or
    // false depending on THAT gesture's own target), never by a commit —
    // a pointerdown starting anywhere else (a card, the empty track)
    // resumes the normal gap-settle behavior immediately, which is the
    // whole point of this position mode and stays exactly as designed
    // there.
    let suppressCommits = false;
    const handlePointerDown = (event: Event) => {
      pointerIsDown = true;
      resetStabilityClock();
      suppressCommits = event.target instanceof Node && outer.contains(event.target);
    };
    const handlePointerUp = () => {
      pointerIsDown = false;
      resetStabilityClock();
    };
    coverFlowRoot?.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    const measure = (): number | null => {
      const trackRect = track.getBoundingClientRect();
      const activeCard = track.querySelector('[data-cover-flow-active="true"]');
      if (!activeCard) return null;
      const activeRect = activeCard.getBoundingClientRect();
      const leftNeighbor = activeCard.previousElementSibling;
      const leftNeighborRect = leftNeighbor instanceof Element
        ? leftNeighbor.getBoundingClientRect()
        : null;
      const activeLeftEdge = activeRect.left - trackRect.left;
      // BUG (operator-reported, screenshot): CoverFlow renders every item,
      // not just the visible neighbours — the rest sit absolutely
      // positioned far outside the track, still real DOM siblings. Trusting
      // leftNeighborRect unconditionally (the original check here was only
      // "does a DOM sibling exist at all", true for every index > 0) fed
      // this figure an off-screen coordinate as its centering reference
      // whenever a landing/spacing mode leaves no neighbour actually
      // visible next to the active card — visually the figure landed flush
      // against the track's own edge instead of centered in the empty
      // space beside the active card. A neighbour only counts as a real
      // reference once part of it is still on-screen (its right edge at or
      // past the track's own left edge); otherwise this falls back to the
      // track's own left edge, the same substitution index 0's genuine
      // "no sibling at all" case already used.
      const leftNeighborVisible = leftNeighborRect !== null
        && leftNeighborRect.right - trackRect.left > 0;
      const referenceRightEdge = leftNeighborVisible
        ? leftNeighborRect.right - trackRect.left
        : 0;
      return (activeLeftEdge + referenceRightEdge) / 2;
    };

    const step = (now: number) => {
      frame = 0;
      const sample = measure();
      if (sample !== null) {
        if (lastSample === null || Math.abs(sample - lastSample) >= GAP_POSITION_EPSILON_PX) {
          lastSample = sample;
          lastChangeAt = now;
        }
        const stableForMs = now - lastChangeAt;
        const valueChanged = appliedCenter === null
          || Math.abs(lastSample - appliedCenter) >= GAP_POSITION_EPSILON_PX;
        const readyToCommit = !pointerIsDown
          && (appliedCenter === null || stableForMs >= GAP_POSITION_SETTLE_STABLE_MS);
        if (readyToCommit && valueChanged) {
          appliedCenter = lastSample;
          if (!suppressCommits) {
            outer.style.left = `${lastSample}px`;
            outer.style.right = 'auto';
            outer.style.transform = 'translateX(-50%)';
          }
        }
      }
      frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      coverFlowRoot?.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [positionMode]);

  return (
    <div
      ref={outerRef}
      className="absolute"
      data-abstract-cover-flow-timeline-slot="true"
      data-position-mode={positionMode}
      style={{
        top: 0,
        bottom: 0,
        width: `${widthPercent}%`,
        minWidth: minWidth > 0 ? `${minWidth}px` : undefined,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: VERTICAL_ALIGN_TO_JUSTIFY[verticalAlign],
        pointerEvents: 'none',
        // Only 'betweenActiveAndLeftNeighbor' ever rewrites `left`
        // post-mount (the settle-detection effect above) — this is what
        // turns that single, infrequent write into a smooth eased move
        // instead of a snap. Harmless no-op for every other mode (their own
        // left/right/transform are static from render to render).
        transition: positionMode === 'betweenActiveAndLeftNeighbor' ? GAP_POSITION_TRANSITION : undefined,
        ...outerPositionStyle,
      }}
    >
      <div
        ref={liftRef}
        style={{
          width: '100%',
          aspectRatio: String(aspectRatio),
          borderRadius,
          pointerEvents: 'auto',
          // BUG (operator-reported, screenshot): centering the content here
          // (a prior fix for padding-bottom silently doing nothing — see
          // below) clips symmetrically once total content height exceeds
          // this fixed-aspect-ratio box, which cut off the TOP of the
          // description text just as readily as it could the bottom of the
          // row list. A "protective container" needs BOTH directions
          // genuinely safe, not a trade-off between which edge clips.
          //
          // Top-anchored (flex-start, not center) content is never clipped
          // at its own top — padding-top always renders in full, by
          // definition of starting there. `overflowY: 'auto'` (not
          // `hidden`) is the other half: anything that still doesn't fit —
          // including trailing padding-bottom — becomes reachable by
          // scrolling instead of silently vanishing past a hard clip.
          // `overflowX: 'hidden'` keeps the figure's own rounded corners
          // intact on the axis that never needs to scroll. The row list's
          // own internal scroll/snap (AboutTimeline's own
          // scrollWindowVisibleCount) remains the PRIMARY way to browse
          // rows; this outer scroll is the safety net for whatever it
          // doesn't already bound (the description block above it, or an
          // operator leaving the row count uncapped).
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          position: 'relative',
        }}
      >
        {/* This must be a dedicated layer: setting opacity on the figure
            would also fade the Timeline's text and controls. Keeping blur
            here likewise makes it a surface treatment, not a text effect. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            // Same paint/compositing strategy as the mobile expanded list:
            // alpha is already in figureGlassBackground, leaving this layer
            // fully composited so backdrop-filter samples the CoverFlow cards
            // behind it instead of becoming a merely translucent tint.
            background: figureGlassBackground,
            backdropFilter: `blur(${backdropBlurPx}px)`,
            WebkitBackdropFilter: `blur(${backdropBlurPx}px)`,
            pointerEvents: 'none',
          }}
        />
        {/* `AboutTimeline` uses margin-top:auto to pin a bottom toolbar.
            This wrapper is part of the percentage-height chain between that
            component and the fixed-aspect-ratio figure; without an explicit
            height, the auto margin has no remaining space to consume and the
            supposedly bottom toolbar sits under the rows instead. */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flex: '1 1 auto',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
