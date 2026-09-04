import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type PanInfo,
  type MotionValue,
} from 'motion/react';
import { useMeasuredElementRect } from '../../../../components/useMeasuredElementRect';
import { useBreakpointTier } from '../../../../components/useBreakpointTier';
import { DEFAULT_COVER_FLOW_CONFIG, type CoverFlowConfig } from './CoverFlow.config';

/**
 * Promoted from experiences/abstract/components/CoverFlowLab/CoverFlowLab.tsx
 * (the spike — see that file's own history for the full "SPIKE-ONLY fork of
 * https://github.com/ashishgogula/coverflow" provenance note). Same internal
 * mechanics verbatim: per-card x/z/rotateY transform derivation, spring
 * config, drag handling (incl. velocity-projected release), wheel
 * accumulator/threshold/cooldown, and no zIndex paired with `z` (WebKit
 * paint-order bug — see CoverFlowItemInner's own `z` doc comment).
 *
 * What changed in promotion: flat pixel props (itemWidth/centerGap/
 * stackSpacing/depthPx/perspective) collapsed into a single `config` object
 * (CoverFlowConfig) resolved per breakpoint tier internally — this used to
 * be pages/carousel-lab.tsx's own per-page responsibility (see that file's
 * history), now owned by the component so every future caller gets the
 * mobile-overlap fix for free instead of re-deriving it.
 *
 * experiences/abstract/components/CoverFlowLab/CoverFlowLab.tsx and
 * pages/carousel-lab.tsx are left running exactly as they were — a frozen
 * reference to diff against if this promoted copy ever regresses.
 */

export type CoverFlowItemGeometry = {
  width: number;
  height: number;
};

/** Geometry published to an externally-driven CoverFlow. `horizontalStepPx`
 * is the exact transform-space distance between adjacent card centres. It is
 * deliberately distinct from `activeCardWidthPx`: coverflow neighbours can
 * overlap, so card width is not necessarily the scroll travel distance. */
export type CoverFlowExternalGeometry = {
  activeCardWidthPx: number;
  horizontalStepPx: number;
};

/** Lets a parent own CoverFlow's continuous position. This is intentionally
 * a separate contract from the normal index-controlled interaction: the
 * parent maps its own input surface, such as document scroll, to `position`,
 * and CoverFlow only renders that position or requests a destination. */
export type CoverFlowExternalDriver = {
  position: number;
  /** Use CoverFlow's established spring when the external owner changes the
   * destination programmatically, such as selecting a row in the expanded
   * mobile list. Continuous page scrolling leaves this false so movement
   * remains exactly 1:1 with the finger. */
  animatePosition?: boolean;
  onPositionRequest: (index: number) => void;
  onGeometryChange?: (geometry: CoverFlowExternalGeometry) => void;
  onDragStart?: () => void;
  onDrag?: (deltaX: number) => void;
  onDragEnd?: (velocityX: number) => void;
};

/** Per-element delay, ms, within the opt-in staggered reveal sequence (see
 * CoverFlowConfig's own `staggeredCardRevealEnabled` doc comment for the
 * full cognitive-load ordering rationale) — topic tag first, CTA last.
 * `durationMs`/`easingCss` are shared across every element; only the delay
 * is staggered per element. */
export type CoverFlowCardRevealStagger = {
  elementDelaysMs: {
    topic: number;
    date: number;
    readingTime: number;
    title: number;
    excerpt: number;
    cta: number;
  };
  durationMs: number;
  easingCss: string;
};

/** Passed to `renderItem` for every card, not just the active one — a
 * `renderItem` implementation combines this with its own `isActive`
 * argument (`isActive && reveal.hasSettled`) to know whether *this*
 * specific card should reveal its own detail content right now, since
 * `hasSettled` describes "the currently-active card has settled," not
 * "this card is active." */
export type CoverFlowCardReveal = {
  /** True once the active card's snap/rotate/translate transition has
   * finished (see CoverFlowConfig's own `activeSettleDelayMs`) — false
   * while dragging, mid-transition, or immediately after `activeIndex`
   * changes. A `renderItem` implementation uses this to gate a card's own
   * detail-content reveal so it doesn't race the position transition. */
  hasSettled: boolean;
  /** Present only while `CoverFlowConfig.staggeredCardRevealEnabled` is on
   * — undefined (not just an empty object) otherwise, so a `renderItem`
   * implementation can treat "no stagger" and "stagger disabled"
   * identically via `reveal.stagger?.`. */
  stagger?: CoverFlowCardRevealStagger;
  /** Always present, unlike `stagger` above — leaving never staggers
   * regardless of `staggeredCardRevealEnabled`, so there's always exactly
   * one shared exit timing to apply, not an opt-in one. See
   * `CoverFlowConfig`'s own `cardRevealExitDelayMs`/`-DurationMs`/
   * `-EasingCss` doc comment. */
  exit: {
    delayMs: number;
    durationMs: number;
    easingCss: string;
  };
};

export type CoverFlowRenderItem<T> = (
  item: T,
  index: number,
  isActive: boolean,
  geometry: CoverFlowItemGeometry,
  reveal: CoverFlowCardReveal,
  position: { distanceFromActive: number },
) => ReactNode;

export interface CoverFlowProps<T> {
  items: readonly T[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  renderItem: CoverFlowRenderItem<T>;
  config?: CoverFlowConfig;
  /** Optional width basis for card geometry when the CoverFlow interaction
   * plane is wider than the content measure cards should follow. CardStack
   * uses the same split: its clip viewport spans the whole page while its
   * cards stay sized from a narrower measured anchor. */
  cardWidthBasisPx?: number;
  /** Matches how CardStack.tsx already receives prefersReducedMotion as a
   * prop rather than each piece deriving it independently. */
  prefersReducedMotion?: boolean;
  /** The rendered card's own live cursor-proximity hover physics — the same
   * `CtaButtonConfig` instance the caller already threads into its
   * `renderItem` (e.g. /abstract's own `ctaConfig={normalizedCtaButtonConfig}`
   * on `AbstractJournalLabHueFadeCard`), not a second, independently-tuned
   * copy. `useCoverFlowGeometry`'s own vertical-fit math needs to know the
   * *worst-case* size a hovered/active card's `useCardLiftPhysics` transform
   * (components/proximity/useCardLiftPhysics.ts) can reach — `scale(...)`
   * grows the box, `translate3d` lifts it upward, `rotateX` tilts it under
   * `perspective` — so it can reserve that headroom below the container's
   * own available height *before* clipping happens against CoverFlow's own
   * `overflow-hidden` root, rather than sizing the flat, at-rest card flush
   * against the container and letting the hover transform overshoot it.
   * All four default to a no-op envelope (scale 1, no lift, no tilt) so a
   * consumer that doesn't have this hover effect at all — or doesn't care to
   * reserve headroom for it — is byte-identical to before these existed. */
  hoverMaxScale?: number;
  /** Max `translate3d` lift, px — `CtaButtonConfig.proximityLiftPx`. */
  hoverMaxLiftPx?: number;
  /** Max `rotateX`/`rotateY` tilt, degrees — `CtaButtonConfig.tiltMaxDegrees`,
   * already resolved to 0 by the caller when `tiltEnabled` is off. */
  hoverMaxTiltDeg?: number;
  /** CSS `perspective` the tilt above renders under — `CtaButtonConfig.
   * tiltPerspectivePx` — governs how much the tilt's own foreshortening
   * grows the card's screen-space extent. */
  hoverTiltPerspectivePx?: number;
  className?: string;
  onItemClick?: (item: T, index: number) => void;
  /** Optional continuous external-driver contract. On mobile, the pinned
   * section supplies page-scroll progress so vertical pixels and active-card
   * horizontal pixels stay in direct 1:1 correspondence. */
  externalDriver?: CoverFlowExternalDriver;
  /** Mobile list owns keyboard navigation, so its paired carousel is hidden
   * from the accessibility tree and any links inside its unchanged card
   * renderer are removed from sequential focus. */
  accessibilityHidden?: boolean;
}

function clampIndex(index: number, length: number) {
  return Math.min(Math.max(index, 0), Math.max(length - 1, 0));
}

/** The tallest a flat, at-rest card of `containerHeightPx` worth of
 * available vertical room can be while still guaranteeing its *hovered*
 * envelope (useCardLiftPhysics's own `scale()` + upward `translate3d` lift
 * + `rotateX` tilt under `perspective` — see CoverFlowProps's own
 * `hoverMax*` doc comments) still lands inside that same room, given
 * CoverFlowItemInner centers every card via `top/left: 50%` + a negative
 * half-size margin (so hover growth expands symmetrically around the
 * container's own center, same as the lift shifts it symmetrically upward
 * from that center).
 *
 * Derivation: a card of flat height H, scaled by `hoverMaxScale` and tilted
 * by `hoverMaxTiltDeg` under `hoverTiltPerspectivePx`, reaches a worst-case
 * half-height of `(H/2) * hoverMaxScale * tiltGrowthFactor` above/below its
 * own center, then the whole box shifts up by `hoverMaxLiftPx` on top of
 * that. The topmost point (the binding edge, since the lift only ever
 * pushes it *further* from the container's top than the bottom is from the
 * container's bottom) must stay within the container's own half-height:
 *   H/2 * hoverMaxScale * tiltGrowthFactor + hoverMaxLiftPx <= containerHeightPx / 2
 * `tiltGrowthFactor` (the perspective foreshortening from tilting a plane by
 * `hoverMaxTiltDeg`) technically depends on H itself — resolved instead
 * against `containerHeightPx / 2`, an upper bound on H/2, which only ever
 * reserves a hair more headroom than the solved-for H strictly needs, never
 * less (no clipping risk from the approximation, only a marginally smaller
 * card than the exact optimum). */
function resolveMaxHoverSafeItemHeightPx(
  containerHeightPx: number,
  hoverMaxScale: number,
  hoverMaxLiftPx: number,
  hoverMaxTiltDeg: number,
  hoverTiltPerspectivePx: number,
): number {
  const halfContainer = containerHeightPx / 2;
  const tiltRad = (hoverMaxTiltDeg * Math.PI) / 180;
  const tiltGrowthFactor = hoverTiltPerspectivePx
    / Math.max(hoverTiltPerspectivePx - halfContainer * Math.sin(tiltRad), 1);
  const effectiveScale = Math.max(hoverMaxScale, 1) * tiltGrowthFactor;
  return Math.max(0, (containerHeightPx - 2 * hoverMaxLiftPx) / effectiveScale);
}

/** Resolves CoverFlowConfig's per-tier ratios into concrete pixel geometry
 * against the supplied card-width basis (or the container's measured width)
 * — same derivation
 * pages/carousel-lab.tsx used to do inline (cardWidthPx/cardHeightPx/
 * centerGap/stackSpacing/depthPx/perspectiveOrigin), now internal so callers
 * don't have to repeat it. */
function useCoverFlowGeometry(
  config: CoverFlowConfig,
  containerWidthPx: number | undefined,
  containerHeightPx: number | undefined,
  hoverMaxScale: number,
  hoverMaxLiftPx: number,
  hoverMaxTiltDeg: number,
  hoverTiltPerspectivePx: number,
) {
  const { tier } = useBreakpointTier();

  return useMemo(() => {
    const cardWidthRatio = tier === 'lg'
      ? config.cardWidthRatioLg
      : tier === 'md'
        ? config.cardWidthRatioMd
        : config.cardWidthRatio;
    const cardDistanceRatio = tier === 'lg'
      ? config.cardDistanceRatioLg
      : tier === 'md'
        ? config.cardDistanceRatioMd
        : config.cardDistanceRatio;

    // Falls back to the reference width before the first real measurement
    // lands. No fixed pixel ceiling — see CoverFlow.config.ts's own
    // cardWidthRatio doc comment for why a ceiling makes the ratio a no-op.
    let itemWidth = containerWidthPx && containerWidthPx > 0
      ? Math.min(containerWidthPx, Math.max(config.minCardWidthPx, containerWidthPx * cardWidthRatio))
      : config.referenceWidthPx;
    let itemHeight = itemWidth * config.cardAspectRatio;
    // config.cardAspectRatio is never deformed: whenever the available
    // vertical room forces the card smaller, width shrinks right along with
    // height (never height alone) so the card's own proportions stay
    // exactly what cardAspectRatio says, at any size. The ceiling this
    // checks against isn't the container's raw height, though — it's
    // resolveMaxHoverSafeItemHeightPx's own, smaller value, so the
    // *hovered* card (scaled/lifted/tilted by useCardLiftPhysics) still
    // fits inside the container instead of overshooting it and getting cut
    // off by this component's own overflow-hidden root (confirmed live:
    // sizing the flat card flush against the container leaves zero headroom
    // for that hover growth, cropping the top and bottom the instant a card
    // is hovered/active).
    if (containerHeightPx && containerHeightPx > 0) {
      const maxHoverSafeHeight = resolveMaxHoverSafeItemHeightPx(
        containerHeightPx, hoverMaxScale, hoverMaxLiftPx, hoverMaxTiltDeg, hoverTiltPerspectivePx,
      );
      if (itemHeight > maxHoverSafeHeight) {
        itemHeight = maxHoverSafeHeight;
        itemWidth = itemHeight / config.cardAspectRatio;
      }
    }
    const centerGap = itemWidth * cardDistanceRatio;
    const stackSpacing = centerGap * config.stackSpacingToCenterGapRatio;
    const depthScale = itemWidth / config.referenceWidthPx;
    const depthPx = config.depthPxAtReferenceWidth * depthScale;
    const perspectiveOrigin = `${config.perspectiveOriginXPercent}% ${config.perspectiveOriginYPercent}%`;

    return { itemWidth, itemHeight, centerGap, stackSpacing, depthPx, perspectiveOrigin };
  }, [
    config, containerWidthPx, containerHeightPx, tier,
    hoverMaxScale, hoverMaxLiftPx, hoverMaxTiltDeg, hoverTiltPerspectivePx,
  ]);
}

export function CoverFlow<T>({
  items,
  activeIndex,
  onActiveIndexChange,
  renderItem,
  config = DEFAULT_COVER_FLOW_CONFIG,
  cardWidthBasisPx,
  prefersReducedMotion = false,
  hoverMaxScale = 1,
  hoverMaxLiftPx = 0,
  hoverMaxTiltDeg = 0,
  hoverTiltPerspectivePx = 1000,
  className,
  onItemClick,
  externalDriver,
  accessibilityHidden = false,
}: CoverFlowProps<T>) {
  const safeInitial = clampIndex(activeIndex, items.length);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { ref: measureRef, rect: containerRect } = useMeasuredElementRect<HTMLDivElement>();
  const setContainerRef = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element;
    measureRef(element);
  }, [measureRef]);

  const { itemWidth, itemHeight, centerGap, stackSpacing, depthPx, perspectiveOrigin } =
    useCoverFlowGeometry(
      config, cardWidthBasisPx ?? containerRect?.width, containerRect?.height,
      hoverMaxScale, hoverMaxLiftPx, hoverMaxTiltDeg, hoverTiltPerspectivePx,
    );

  const activeIndexRef = useRef(safeInitial);
  const enableScrollRef = useRef(config.enableScroll);
  const scrollThresholdRef = useRef(config.scrollThresholdPx);
  const onItemClickRef = useRef(onItemClick);
  const enableClickToSnapRef = useRef(config.enableClickToSnap);
  const onActiveIndexChangeRef = useRef(onActiveIndexChange);

  enableScrollRef.current = config.enableScroll;
  scrollThresholdRef.current = config.scrollThresholdPx;
  onItemClickRef.current = onItemClick;
  enableClickToSnapRef.current = config.enableClickToSnap;
  onActiveIndexChangeRef.current = onActiveIndexChange;

  const scrollX = useMotionValue(safeInitial);
  const springX = useSpring(scrollX, { stiffness: 150, damping: 30, mass: 1 });
  const externallyControlled = externalDriver !== undefined;
  const externalDriverRef = useRef(externalDriver);
  externalDriverRef.current = externalDriver;
  const effectiveScrollX = prefersReducedMotion
    || (externallyControlled && !externalDriver?.animatePosition)
    ? scrollX
    : springX;

  useEffect(() => {
    if (!externalDriver) return;
    scrollX.set(clampIndex(externalDriver.position, items.length));
  }, [externalDriver?.position, items.length, scrollX]);

  useEffect(() => {
    const onGeometryChange = externalDriverRef.current?.onGeometryChange;
    if (!onGeometryChange) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const activeCard = containerRef.current?.querySelector<HTMLElement>(
        '[data-cover-flow-active="true"]',
      );
      const renderedWidth = activeCard?.offsetWidth ?? itemWidth;
      onGeometryChange({
        activeCardWidthPx: renderedWidth,
        horizontalStepPx: centerGap,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeIndex, centerGap, itemWidth]);

  useEffect(() => {
    if (!accessibilityHidden) return;
    containerRef.current
      ?.querySelectorAll<HTMLElement>('a, button, [tabindex]')
      .forEach(element => element.setAttribute('tabindex', '-1'));
  }, [accessibilityHidden, activeIndex, items]);

  // "Settled" tracks activeIndex, not internal jump bookkeeping — a drag or
  // wheel gesture only ever settles once its own jumpToIndex/onDragEnd call
  // has echoed back through the caller's onActiveIndexChange and landed as
  // a new activeIndex prop (see the effect above), matching the same
  // "external prop is the only source of truth" rule that effect already
  // follows. No spring "has this settled" event exists to read instead
  // (framer-motion only exposes the spring's continuously-updating value),
  // so this approximates it with config.activeSettleDelayMs, a plain timer
  // reset on every activeIndex change.
  const [settledIndex, setSettledIndex] = useState<number | null>(
    prefersReducedMotion ? safeInitial : null,
  );
  useEffect(() => {
    if (prefersReducedMotion) {
      setSettledIndex(activeIndex);
      return undefined;
    }
    setSettledIndex((current) => (current === activeIndex ? current : null));
    const timer = setTimeout(() => setSettledIndex(activeIndex), config.activeSettleDelayMs);
    return () => clearTimeout(timer);
  }, [activeIndex, prefersReducedMotion, config.activeSettleDelayMs]);
  const hasSettled = settledIndex === activeIndex;

  // See CoverFlowConfig's own staggeredCardRevealEnabled doc comment for
  // the ordering rationale (topic → date/reading-time → title → excerpt →
  // CTA, ascending information value/cognitive load).
  const stagger = useMemo<CoverFlowCardRevealStagger | undefined>(() => {
    if (!config.staggeredCardRevealEnabled) return undefined;
    const step = config.staggeredCardRevealStepMs;
    return {
      elementDelaysMs: {
        topic: 0,
        date: step,
        readingTime: step,
        title: step * 2,
        excerpt: step * 3,
        cta: step * 4,
      },
      durationMs: config.staggeredCardRevealElementDurationMs,
      easingCss: config.staggeredCardRevealEasingCss,
    };
  }, [
    config.staggeredCardRevealEnabled,
    config.staggeredCardRevealStepMs,
    config.staggeredCardRevealElementDurationMs,
    config.staggeredCardRevealEasingCss,
  ]);
  const exit = useMemo(() => ({
    delayMs: config.cardRevealExitDelayMs,
    durationMs: config.cardRevealExitDurationMs,
    easingCss: config.cardRevealExitEasingCss,
  }), [config.cardRevealExitDelayMs, config.cardRevealExitDurationMs, config.cardRevealExitEasingCss]);
  const reveal = useMemo<CoverFlowCardReveal>(
    () => ({ hasSettled, stagger, exit }),
    [hasSettled, stagger, exit],
  );

  // External activeIndex is the only source of truth for a change this
  // component didn't itself originate (jumpToIndex/onDragEnd below already
  // update activeIndexRef synchronously before calling onActiveIndexChange,
  // so the prop echoing back the same value is a no-op here).
  useEffect(() => {
    const clamped = clampIndex(activeIndex, items.length);
    if (clamped !== activeIndexRef.current) {
      activeIndexRef.current = clamped;
      if (!externallyControlled) scrollX.set(clamped);
    }
  }, [activeIndex, externallyControlled, items.length, scrollX]);

  const jumpToIndex = useCallback(
    (index: number) => {
      const clamped = clampIndex(index, items.length);
      if (clamped === activeIndexRef.current) return;
      if (externalDriverRef.current) {
        externalDriverRef.current.onPositionRequest(clamped);
        return;
      }
      activeIndexRef.current = clamped;
      scrollX.set(clamped);
      onActiveIndexChangeRef.current(clamped);
    },
    [items.length, scrollX],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let accumulator = 0;
    let lastTime = Date.now();
    let lastJump = 0;

    const handleWheel = (e: WheelEvent) => {
      if (!enableScrollRef.current) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
      e.preventDefault();

      const now = Date.now();
      if (now - lastTime > 200) accumulator = 0;
      lastTime = now;
      accumulator += e.deltaX;

      const threshold = scrollThresholdRef.current;
      const shouldJump =
        (accumulator > threshold || accumulator < -threshold) &&
        now - lastJump > 150;

      if (shouldJump) {
        jumpToIndex(Math.round(scrollX.get()) + (accumulator > 0 ? 1 : -1));
        accumulator = 0;
        lastJump = now;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [jumpToIndex, scrollX]);

  const handleCardClick = useCallback(
    (item: T, index: number) => {
      if (index === activeIndexRef.current) {
        onItemClickRef.current?.(item, index);
      } else if (enableClickToSnapRef.current) {
        jumpToIndex(index);
      }
    },
    [jumpToIndex],
  );

  const externalDragActiveRef = useRef(false);
  const onDragStart = useCallback(() => {
    if (!externalDriverRef.current) setIsDragging(true);
  }, []);

  const onDrag = useCallback(
    (_: unknown, info: PanInfo) => {
      const driver = externalDriverRef.current;
      if (driver) {
        if (!externalDragActiveRef.current) {
          const horizontalIntent = Math.abs(info.offset.x) >= 8
            && Math.abs(info.offset.x) > Math.abs(info.offset.y);
          if (!horizontalIntent) return;
          externalDragActiveRef.current = true;
          setIsDragging(true);
          driver.onDragStart?.();
        }
        driver.onDrag?.(info.delta.x);
        return;
      }
      scrollX.set(scrollX.get() - info.delta.x / (centerGap * 0.8));
    },
    [centerGap, scrollX],
  );

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      setIsDragging(false);
      const driver = externalDriverRef.current;
      if (driver) {
        const wasExternallyDragging = externalDragActiveRef.current;
        externalDragActiveRef.current = false;
        if (wasExternallyDragging) driver.onDragEnd?.(info.velocity.x);
        return;
      }
      const projected = scrollX.get() - info.velocity.x * 0.002;
      const clamped = clampIndex(Math.round(projected), items.length);
      if (clamped !== activeIndexRef.current) {
        activeIndexRef.current = clamped;
        onActiveIndexChangeRef.current(clamped);
      }
      scrollX.set(clamped);
    },
    [items.length, scrollX],
  );

  if (items.length === 0) return null;

  return (
    <motion.div
      ref={setContainerRef}
      className={`relative w-full h-full flex flex-col justify-center items-center overflow-hidden ${className ?? ''}`}
      style={{
        perspective: prefersReducedMotion && externallyControlled ? 'none' : config.perspectivePx,
        perspectiveOrigin,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: externallyControlled ? 'pan-y' : undefined,
      }}
      role={accessibilityHidden ? undefined : 'region'}
      aria-label={accessibilityHidden ? undefined : 'Cover Flow'}
      aria-hidden={accessibilityHidden || undefined}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0}
      dragMomentum={false}
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
    >
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{
          transformStyle: prefersReducedMotion && externallyControlled ? 'flat' : 'preserve-3d',
        }}
      >
        {items.map((item, index) => (
          <CoverFlowItem
            key={index}
            item={item}
            index={index}
            scrollX={effectiveScrollX}
            width={itemWidth}
            height={itemHeight}
            stackSpacing={stackSpacing}
            centerGap={centerGap}
            rotation={config.rotationDeg}
            depthPx={depthPx}
            isActive={index === activeIndex}
            activeIndex={activeIndex}
            isDragging={isDragging}
            enableClickToSnap={config.enableClickToSnap}
            reduceMotion={prefersReducedMotion}
            renderItem={renderItem}
            onCardClick={handleCardClick}
            reveal={reveal}
            dataActive={index === activeIndex}
            flattenPerspective={prefersReducedMotion && externallyControlled}
          />
        ))}
      </div>
    </motion.div>
  );
}

interface CardProps<T> {
  item: T;
  index: number;
  scrollX: MotionValue<number>;
  width: number;
  height: number;
  stackSpacing: number;
  centerGap: number;
  rotation: number;
  depthPx: number;
  isActive: boolean;
  activeIndex: number;
  isDragging: boolean;
  enableClickToSnap: boolean;
  reduceMotion: boolean;
  renderItem: CoverFlowRenderItem<T>;
  onCardClick: (item: T, index: number) => void;
  reveal: CoverFlowCardReveal;
  dataActive: boolean;
  flattenPerspective: boolean;
}

function CoverFlowItemInner<T>({
  item,
  index,
  scrollX,
  width,
  height,
  stackSpacing,
  centerGap,
  rotation,
  depthPx,
  isActive,
  activeIndex,
  isDragging,
  enableClickToSnap,
  reduceMotion,
  renderItem,
  onCardClick,
  reveal,
  dataActive,
  flattenPerspective,
}: CardProps<T>) {
  const rotateY = useTransform(scrollX, (value) => {
    if (reduceMotion) return 0;
    const pos = index - value;
    const absPos = Math.abs(pos);
    return absPos < 0.5 ? -pos * (rotation * 2) : pos < 0 ? rotation : -rotation;
  });

  const x = useTransform(scrollX, (value) => {
    const pos = index - value;
    const absPos = Math.abs(pos);
    if (absPos < 1) return pos * centerGap;
    return pos < 0
      ? -centerGap - (absPos - 1) * stackSpacing
      : centerGap + (absPos - 1) * stackSpacing;
  });

  // depthPx is the closest neighbour's own magnitude, proportional to card
  // size (see CoverFlow.config.ts's own depthPxAtReferenceWidth doc
  // comment). No explicit zIndex alongside this: an earlier version paired
  // z with a `1000 - distance*10` zIndex to force paint order, which worked
  // on Chromium but not real WebKit (Safari, and every iOS browser) —
  // confirmed live, mid-transition, on a real iPhone in both Safari and
  // Chrome: the outgoing card visibly painted on top of the incoming one
  // crossing in front of it. Root cause: z-index forces its own stacking
  // context, whose paint order WebKit doesn't recompute in lockstep with a
  // compositor-only animated transform the way it recomputes `z` itself —
  // the two fall out of sync exactly at the crossover. Removing zIndex and
  // leaving paint order to this element's own live z depth, sorted by the
  // parent's transform-style: preserve-3d above, fixed it on both engines
  // with no other change (verified via Playwright's real webkit browser
  // type, not Chromium's device emulation, which never reproduced the bug
  // at all).
  const z = useTransform(scrollX, (value) => {
    if (reduceMotion) return 0;
    const absPos = Math.abs(index - value);
    return absPos > 0.5 ? -depthPx : absPos * -depthPx * 2;
  });

  const cursor = isDragging ? 'grabbing' : isActive || enableClickToSnap ? 'pointer' : 'grab';

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 will-change-transform"
      data-cover-flow-active={dataActive}
      style={{
        width,
        height,
        marginTop: -height / 2,
        marginLeft: -width / 2,
        x,
        z,
        rotateY,
        transformStyle: flattenPerspective ? 'flat' : 'preserve-3d',
        cursor,
      }}
      onClick={() => onCardClick(item, index)}
    >
      {renderItem(
        item,
        index,
        isActive,
        { width, height },
        reveal,
        {
          distanceFromActive: Math.abs(index - activeIndex),
        },
      )}
    </motion.div>
  );
}

const CoverFlowItem = memo(CoverFlowItemInner) as typeof CoverFlowItemInner;
