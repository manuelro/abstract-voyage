import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type PanInfo,
  type MotionValue,
} from 'motion/react';

/**
 * SPIKE-ONLY fork of https://github.com/ashishgogula/coverflow
 * (registry/coverflow/coverflow.tsx, MIT). Kept: the per-card x/z/rotateY
 * transform derivation, the spring config, drag handling (incl.
 * velocity-projected release), and the wheel accumulator/threshold/cooldown.
 * Removed: the CoverFlowItem/image/renderImage contract (replaced by a
 * generic renderItem render-prop), all card chrome, the brightness filter,
 * the title/subtitle overlay, the reflection effect, the audio tick system,
 * and the container's own tabIndex/arrow-key handling. Made fully
 * controlled (activeIndex/onActiveIndexChange) — no internal index state.
 * Diverged from the original on one point: the original's explicit
 * `zIndex` (paired with `z`) was dropped — see CoverFlowLabItemInner's own
 * `z` doc comment for why (a real WebKit paint-order bug it caused).
 */

export type CoverFlowLabRenderItem<T> = (item: T, index: number, isActive: boolean) => ReactNode;

export interface CoverFlowLabProps<T> {
  items: readonly T[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  renderItem: CoverFlowLabRenderItem<T>;
  itemWidth?: number;
  itemHeight?: number;
  stackSpacing?: number;
  centerGap?: number;
  rotation?: number;
  /** CSS `perspective`, px. Kept independently tunable from itemWidth/
   * centerGap/stackSpacing (rather than folded into one of them) because a
   * caller scaling those three for a smaller container must scale this by
   * the same factor too — see the `z`/zIndex doc comment below for why. */
  perspective?: number;
  /** Magnitude (px) of the closest neighbour's own translateZ — see the
   * `z` useTransform below for the exact curve. Same scaling note as
   * `perspective` above applies here. */
  depthPx?: number;
  /** CSS `perspective-origin` — a raw value string (e.g. `'50% 50%'`),
   * passed straight through. Defaults to CSS's own initial value (dead
   * center) by simply omitting the style declaration, rather than this
   * component hardcoding '50% 50%' itself. */
  perspectiveOrigin?: string;
  enableClickToSnap?: boolean;
  enableScroll?: boolean;
  scrollThreshold?: number;
  /** Passed down from the caller's own usePrefersReducedMotion, matching
   * how CardStack.tsx already receives prefersReducedMotion as a prop
   * rather than each piece deriving it independently. */
  reduceMotion?: boolean;
  className?: string;
  onItemClick?: (item: T, index: number) => void;
}

function clampIndex(index: number, length: number) {
  return Math.min(Math.max(index, 0), Math.max(length - 1, 0));
}

export function CoverFlowLab<T>({
  items,
  activeIndex,
  onActiveIndexChange,
  renderItem,
  itemWidth = 400,
  itemHeight = 400,
  stackSpacing = 100,
  centerGap = 250,
  rotation = 50,
  perspective = 1000,
  depthPx = 200,
  perspectiveOrigin,
  enableClickToSnap = true,
  enableScroll = true,
  scrollThreshold = 100,
  reduceMotion = false,
  className,
  onItemClick,
}: CoverFlowLabProps<T>) {
  const safeInitial = clampIndex(activeIndex, items.length);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeIndexRef = useRef(safeInitial);
  const enableScrollRef = useRef(enableScroll);
  const scrollThresholdRef = useRef(scrollThreshold);
  const onItemClickRef = useRef(onItemClick);
  const enableClickToSnapRef = useRef(enableClickToSnap);
  const onActiveIndexChangeRef = useRef(onActiveIndexChange);

  enableScrollRef.current = enableScroll;
  scrollThresholdRef.current = scrollThreshold;
  onItemClickRef.current = onItemClick;
  enableClickToSnapRef.current = enableClickToSnap;
  onActiveIndexChangeRef.current = onActiveIndexChange;

  const scrollX = useMotionValue(safeInitial);
  const springX = useSpring(scrollX, { stiffness: 150, damping: 30, mass: 1 });
  const effectiveScrollX = reduceMotion ? scrollX : springX;

  // External activeIndex is the only source of truth for a change this
  // component didn't itself originate (jumpToIndex/onDragEnd below already
  // update activeIndexRef synchronously before calling onActiveIndexChange,
  // so the prop echoing back the same value is a no-op here).
  useEffect(() => {
    const clamped = clampIndex(activeIndex, items.length);
    if (clamped !== activeIndexRef.current) {
      activeIndexRef.current = clamped;
      scrollX.set(clamped);
    }
  }, [activeIndex, items.length, scrollX]);

  const jumpToIndex = useCallback(
    (index: number) => {
      const clamped = clampIndex(index, items.length);
      if (clamped === activeIndexRef.current) return;
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

  const onDragStart = useCallback(() => setIsDragging(true), []);

  const onDrag = useCallback(
    (_: unknown, info: PanInfo) => {
      scrollX.set(scrollX.get() - info.delta.x / (centerGap * 0.8));
    },
    [centerGap, scrollX],
  );

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      setIsDragging(false);
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
      ref={containerRef}
      className={`relative w-full h-full flex flex-col justify-center items-center overflow-hidden ${className ?? ''}`}
      style={{ perspective, perspectiveOrigin, cursor: isDragging ? 'grabbing' : 'grab' }}
      role="region"
      aria-label="Cover Flow"
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
        style={{ transformStyle: 'preserve-3d' }}
      >
        {items.map((item, index) => (
          <CoverFlowLabItem
            key={index}
            item={item}
            index={index}
            scrollX={effectiveScrollX}
            width={itemWidth}
            height={itemHeight}
            stackSpacing={stackSpacing}
            centerGap={centerGap}
            rotation={rotation}
            depthPx={depthPx}
            isActive={index === activeIndex}
            isDragging={isDragging}
            enableClickToSnap={enableClickToSnap}
            reduceMotion={reduceMotion}
            renderItem={renderItem}
            onCardClick={handleCardClick}
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
  isDragging: boolean;
  enableClickToSnap: boolean;
  reduceMotion: boolean;
  renderItem: CoverFlowLabRenderItem<T>;
  onCardClick: (item: T, index: number) => void;
}

function CoverFlowLabItemInner<T>({
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
  isDragging,
  enableClickToSnap,
  reduceMotion,
  renderItem,
  onCardClick,
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

  // depthPx is the closest neighbour's own magnitude (matches the original
  // fork's hardcoded -200/-400, now proportional to card size instead of a
  // fixed pixel value — see CoverFlowLabProps.depthPx's own doc comment).
  // No explicit zIndex alongside this: an earlier version paired z with a
  // `1000 - distance*10` zIndex to force paint order, which worked on
  // Chromium but not real WebKit (Safari, and every iOS browser, which is
  // required to run on WebKit) — confirmed live, mid-transition, on a real
  // iPhone in both Safari and Chrome: the outgoing card visibly painted on
  // top of the incoming one crossing in front of it. Root cause: z-index
  // forces its own stacking context, whose paint order WebKit doesn't
  // recompute in lockstep with a compositor-only animated transform the
  // way it recomputes `z` itself — the two fall out of sync exactly at the
  // crossover. Removing zIndex and leaving paint order to this element's
  // own live z depth, sorted by the parent's transform-style: preserve-3d
  // below, fixed it on both engines with no other change (verified via
  // Playwright's real webkit browser type, not Chromium's device
  // emulation, which never reproduced the bug at all).
  const z = useTransform(scrollX, (value) => {
    if (reduceMotion) return 0;
    const absPos = Math.abs(index - value);
    return absPos > 0.5 ? -depthPx : absPos * -depthPx * 2;
  });

  const cursor = isDragging ? 'grabbing' : isActive || enableClickToSnap ? 'pointer' : 'grab';

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 will-change-transform"
      style={{
        width,
        height,
        marginTop: -height / 2,
        marginLeft: -width / 2,
        x,
        z,
        rotateY,
        transformStyle: 'preserve-3d',
        cursor,
      }}
      onClick={() => onCardClick(item, index)}
    >
      {renderItem(item, index, isActive)}
    </motion.div>
  );
}

const CoverFlowLabItem = memo(CoverFlowLabItemInner) as typeof CoverFlowLabItemInner;
