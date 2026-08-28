import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefCallback,
  TransitionEvent as ReactTransitionEvent,
} from 'react';

const WHEEL_BURST_IDLE_MS = 140;
const WHEEL_LINE_HEIGHT_PX = 16;
const EDGE_RESISTANCE_RATIO = 0.18;
const WHEEL_PREVIEW_RATIO = 0.35;
const WHEEL_PREVIEW_LIMIT_RATIO = 0.35;

type GestureAxis = 'horizontal' | 'vertical' | null;
type HorizontalDirection = 1 | -1;
type SettlingMode = 'css' | 'spring' | 'commit' | null;

type PointerGesture = {
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  axis: GestureAxis;
  activated: boolean;
  startHorizontalOffset: number;
  /** Exponentially-smoothed vertical release velocity (px/ms), sampled from
   * consecutive pointermove events. Reported to onAdvance/onRetreat at
   * commit time so a fast flick can settle faster than a slow drag — see
   * this hook's own doc comment. */
  lastSampleTimeMs: number;
  lastSampleY: number;
  velocityPxPerMs: number;
};

type WheelBurst = {
  accumulatedY: number;
  committed: boolean;
  /** When the current burst's first delta arrived — used to derive a
   * release velocity (accumulatedY / elapsed) at commit time, the wheel
   * equivalent of PointerGesture's own velocityPxPerMs. */
  startTimeMs: number;
};

export type StackGestureNavigation = {
  surfaceRef: RefCallback<HTMLDivElement>;
  activeAxis: GestureAxis;
  horizontalOffsetPx: number;
  verticalOffsetPx: number;
  isDragging: boolean;
  isSettling: boolean;
  settlingMode: SettlingMode;
  horizontalPreviewDirection: HorizontalDirection | null;
  horizontalPreviewProgress: number;
  touchAction: CSSProperties['touchAction'];
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onTransitionEnd: (event: ReactTransitionEvent<HTMLDivElement>) => void;
  onClickCapture: (event: ReactMouseEvent<HTMLDivElement>) => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeWheelDelta(value: number, deltaMode: number, pageSizePx: number): number {
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) return value * WHEEL_LINE_HEIGHT_PX;
  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) return value * pageSizePx;
  return value;
}

/**
 * Resolves wheel, trackpad, and pointer drags into the card stack's existing
 * semantic next/previous and Articles/Labs commands. It deliberately does
 * not identify hardware: trackpads and mouse wheels both arrive as wheel
 * events, while direct touch/pen manipulation arrives through Pointer Events.
 *
 * The hook owns gesture recognition only. Active-card state and scripted
 * settling remain in useStackStepMotion, while list switching remains in
 * useStackSwipeTransition.
 */
export function useStackGestureNavigation({
  verticalGesturesEnabled,
  horizontalGestureEnabled,
  canAdvance,
  canRetreat,
  isTransitioning,
  commitThresholdPx,
  directionLockThresholdPx,
  settleDurationMs,
  horizontalPreviewEnabled,
  horizontalPreviewThresholdPx,
  horizontalPreviewRangePx,
  horizontalCommitDistancePx,
  horizontalCommitDurationMs,
  horizontalEdgeSpringEnabled,
  edgeResistancePercent,
  edgeMaxDisplacementPx,
  edgeSpringStiffness,
  edgeSpringDamping,
  edgeSpringMaxDurationMs,
  verticalEdgeSpringEnabled,
  verticalEdgeSpringStiffness,
  verticalEdgeSpringDamping,
  verticalEdgeSpringMaxDurationMs,
  onAdvance,
  onRetreat,
  onHorizontalCommit,
}: {
  verticalGesturesEnabled: boolean;
  horizontalGestureEnabled: boolean;
  canAdvance: boolean;
  canRetreat: boolean;
  isTransitioning: boolean;
  commitThresholdPx: number;
  directionLockThresholdPx: number;
  settleDurationMs: number;
  /** Mobile-only CardStack supplies these values. The desktop list-switch
   * path leaves both gates false and therefore retains its prior behavior. */
  horizontalPreviewEnabled: boolean;
  horizontalPreviewThresholdPx: number;
  horizontalPreviewRangePx: number;
  /** Final surface travel for a committed horizontal drag. The same live
   * surface that followed the pointer owns this remaining distance. */
  horizontalCommitDistancePx: number;
  /** Duration of the release-to-landing leg. Zero commits immediately for
   * reduced motion and non-card horizontal commands. */
  horizontalCommitDurationMs: number;
  horizontalEdgeSpringEnabled: boolean;
  edgeResistancePercent: number;
  edgeMaxDisplacementPx: number;
  edgeSpringStiffness: number;
  edgeSpringDamping: number;
  edgeSpringMaxDurationMs: number;
  /** Vertical counterpart of the horizontalEdgeSpring* group above — same
   * damped-spring model, applied to overscroll past the first/last card
   * instead of the flat CSS settle. */
  verticalEdgeSpringEnabled: boolean;
  verticalEdgeSpringStiffness: number;
  verticalEdgeSpringDamping: number;
  verticalEdgeSpringMaxDurationMs: number;
  /** velocityPxPerMs is the release speed that triggered the commit (null
   * for a programmatic/keyboard-equivalent call with no real gesture) — the
   * caller can use it to scale the resulting step's own animation duration.
   * This hook never reads its own report back; it only measures and hands
   * it off. */
  onAdvance: (velocityPxPerMs?: number | null) => void;
  onRetreat: (velocityPxPerMs?: number | null) => void;
  onHorizontalCommit: (direction: 1 | -1, releaseOffsetPx: number) => void;
}): StackGestureNavigation {
  const [surfaceElement, setSurfaceElement] = useState<HTMLDivElement | null>(null);
  const surfaceRef = useCallback<RefCallback<HTMLDivElement>>(element => {
    setSurfaceElement(element);
  }, []);
  const pointerRef = useRef<PointerGesture | null>(null);
  const wheelBurstRef = useRef<WheelBurst>({ accumulatedY: 0, committed: false, startTimeMs: 0 });
  const wheelIdleTimerRef = useRef(0);
  const settleTimerRef = useRef(0);
  const edgeSpringFrameRef = useRef(0);
  const clickResetTimerRef = useRef(0);
  const horizontalCommitRef = useRef<{
    direction: HorizontalDirection;
    releaseOffsetPx: number;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const horizontalOffsetRef = useRef(0);
  const verticalOffsetRef = useRef(0);

  const [activeAxis, setActiveAxis] = useState<GestureAxis>(null);
  const [horizontalOffsetPx, setHorizontalOffsetPx] = useState(0);
  const [verticalOffsetPx, setVerticalOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [settlingMode, setSettlingMode] = useState<SettlingMode>(null);
  const [horizontalPreviewDirection, setHorizontalPreviewDirection] = useState<HorizontalDirection | null>(null);
  const [horizontalPreviewProgress, setHorizontalPreviewProgress] = useState(0);

  const writeHorizontalOffset = useCallback((value: number) => {
    horizontalOffsetRef.current = value;
    setHorizontalOffsetPx(value);
  }, []);

  const writeVerticalOffset = useCallback((value: number) => {
    verticalOffsetRef.current = value;
    setVerticalOffsetPx(value);
  }, []);

  const clearWheelIdleTimer = useCallback(() => {
    if (!wheelIdleTimerRef.current) return;
    window.clearTimeout(wheelIdleTimerRef.current);
    wheelIdleTimerRef.current = 0;
  }, []);

  const clearSettleTimer = useCallback(() => {
    if (!settleTimerRef.current) return;
    window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = 0;
  }, []);

  const clearEdgeSpring = useCallback(() => {
    if (!edgeSpringFrameRef.current) return;
    window.cancelAnimationFrame(edgeSpringFrameRef.current);
    edgeSpringFrameRef.current = 0;
  }, []);

  const clearHorizontalPreview = useCallback(() => {
    setHorizontalPreviewDirection(null);
    setHorizontalPreviewProgress(0);
  }, []);

  const finishSettle = useCallback(() => {
    clearSettleTimer();
    clearEdgeSpring();
    setIsSettling(false);
    setSettlingMode(null);
    setActiveAxis(null);
    clearHorizontalPreview();
  }, [clearEdgeSpring, clearHorizontalPreview, clearSettleTimer]);

  /** Completes the semantic index change only after the exact surface that
   * followed the finger has landed. React batches this callback with the
   * offset reset, so the incoming track card becomes the centered active
   * card without an intermediate reset, duplicate layer, or second entry. */
  const finishHorizontalCommit = useCallback(() => {
    const commit = horizontalCommitRef.current;
    if (!commit) return;
    horizontalCommitRef.current = null;
    clearSettleTimer();
    onHorizontalCommit(commit.direction, commit.releaseOffsetPx);
    writeHorizontalOffset(0);
    writeVerticalOffset(0);
    setIsDragging(false);
    setIsSettling(false);
    setSettlingMode(null);
    setActiveAxis(null);
    clearHorizontalPreview();
  }, [
    clearHorizontalPreview,
    clearSettleTimer,
    onHorizontalCommit,
    writeHorizontalOffset,
    writeVerticalOffset,
  ]);

  const startHorizontalCommit = useCallback((
    direction: HorizontalDirection,
    releaseOffsetPx: number,
  ) => {
    clearSettleTimer();
    clearEdgeSpring();
    setIsDragging(false);
    setActiveAxis('horizontal');
    setHorizontalPreviewDirection(direction);
    setHorizontalPreviewProgress(1);
    horizontalCommitRef.current = { direction, releaseOffsetPx };
    if (horizontalCommitDurationMs <= 0 || horizontalCommitDistancePx <= 0) {
      finishHorizontalCommit();
      return;
    }
    setIsSettling(true);
    setSettlingMode('commit');
    writeHorizontalOffset(direction * horizontalCommitDistancePx);
    // transitionend is authoritative. This is only the lost-event ceiling.
    settleTimerRef.current = window.setTimeout(
      finishHorizontalCommit,
      horizontalCommitDurationMs + 80,
    );
  }, [
    clearEdgeSpring,
    clearSettleTimer,
    finishHorizontalCommit,
    horizontalCommitDistancePx,
    horizontalCommitDurationMs,
    writeHorizontalOffset,
  ]);

  const settleOffsets = useCallback((axis: Exclude<GestureAxis, null>) => {
    clearSettleTimer();
    setIsDragging(false);
    setActiveAxis(axis);
    writeHorizontalOffset(0);
    writeVerticalOffset(0);
    // Keep the last direction mounted through a CSS return so CardStack's
    // incoming preview can travel back out from its real visible position;
    // clearing it here would unmount that card in the same frame and pop.
    if (axis === 'horizontal') setHorizontalPreviewProgress(0);
    if (settleDurationMs <= 0) {
      setIsSettling(false);
      setSettlingMode(null);
      setActiveAxis(null);
      clearHorizontalPreview();
      return;
    }
    setIsSettling(true);
    setSettlingMode('css');
    settleTimerRef.current = window.setTimeout(finishSettle, settleDurationMs);
  }, [
    clearSettleTimer,
    finishSettle,
    clearHorizontalPreview,
    settleDurationMs,
    writeHorizontalOffset,
    writeVerticalOffset,
  ]);

  /** A physically integrated edge settle rather than a cubic-bezier alias.
   * The hook owns the animation because the output must be continuously
   * re-targetable by a new pointer drag, unlike a fire-and-forget CSS
   * transition. `*MaxDurationMs` is only a cleanup cap: a spring that has
   * reached both a small displacement and velocity ends sooner. Shared by
   * both axes — `axis` picks which offset ref/setter and which
   * stiffness/damping/max-duration triad drives the integration; the
   * horizontal Articles/Labs edge and the vertical first/last-card edge
   * are otherwise physically identical. */
  const startEdgeSpringForAxis = useCallback((axis: 'horizontal' | 'vertical') => {
    clearSettleTimer();
    clearEdgeSpring();
    setIsDragging(false);
    setActiveAxis(axis);
    const offsetRef = axis === 'horizontal' ? horizontalOffsetRef : verticalOffsetRef;
    const writeOffset = axis === 'horizontal' ? writeHorizontalOffset : writeVerticalOffset;
    const stiffness = axis === 'horizontal' ? edgeSpringStiffness : verticalEdgeSpringStiffness;
    const damping = axis === 'horizontal' ? edgeSpringDamping : verticalEdgeSpringDamping;
    const maxDurationMs = axis === 'horizontal' ? edgeSpringMaxDurationMs : verticalEdgeSpringMaxDurationMs;
    if (maxDurationMs <= 0 || Math.abs(offsetRef.current) < 0.01) {
      writeOffset(0);
      finishSettle();
      return;
    }
    setIsSettling(true);
    setSettlingMode('spring');
    let position = offsetRef.current;
    let velocity = 0;
    let previousTime = performance.now();
    let elapsedMs = 0;
    const tick = (now: number) => {
      const seconds = Math.min(0.032, Math.max(0.001, (now - previousTime) / 1000));
      previousTime = now;
      // Accumulate the integration step instead of relying separately on
      // `now - startedAt`: browser rAF timestamps are monotonic, but this
      // also keeps the safety cap deterministic under a paused tab or the
      // fake rAF clock used by the gesture contract tests.
      elapsedMs += seconds * 1000;
      // Unit-mass damped spring: x'' = -k*x - c*x'. The ranges are
      // normalized by stack.ts and use pixels/seconds here only at the
      // runtime boundary where the card's actual displacement is known.
      const acceleration = -stiffness * position - damping * velocity;
      velocity += acceleration * seconds;
      position += velocity * seconds;
      if ((Math.abs(position) < 0.5 && Math.abs(velocity) < 4) || elapsedMs >= maxDurationMs) {
        writeOffset(0);
        edgeSpringFrameRef.current = 0;
        finishSettle();
        return;
      }
      writeOffset(position);
      edgeSpringFrameRef.current = window.requestAnimationFrame(tick);
    };
    edgeSpringFrameRef.current = window.requestAnimationFrame(tick);
  }, [
    clearEdgeSpring,
    clearSettleTimer,
    edgeSpringDamping,
    edgeSpringMaxDurationMs,
    edgeSpringStiffness,
    verticalEdgeSpringDamping,
    verticalEdgeSpringMaxDurationMs,
    verticalEdgeSpringStiffness,
    finishSettle,
    writeHorizontalOffset,
    writeVerticalOffset,
  ]);

  const resetWheelBurst = useCallback(() => {
    clearWheelIdleTimer();
    const wasCommitted = wheelBurstRef.current.committed;
    const shouldSettle = !wasCommitted && verticalOffsetRef.current !== 0;
    wheelBurstRef.current = { accumulatedY: 0, committed: false, startTimeMs: 0 };
    // A committed burst's own settle (settleOffsets/startEdgeSpringForAxis,
    // called from handleWheel below) already owns the transition back to
    // rest — touching the offset/axis here too would cut that animation
    // short at this idle timer's own fixed 140ms mark instead of letting it
    // run its real, longer configured duration.
    if (wasCommitted) return;
    if (shouldSettle && pointerRef.current === null) settleOffsets('vertical');
    else {
      writeVerticalOffset(0);
      setActiveAxis(axis => axis === 'vertical' && pointerRef.current === null ? null : axis);
    }
  }, [clearWheelIdleTimer, settleOffsets, writeVerticalOffset]);

  useEffect(() => () => {
    clearWheelIdleTimer();
    clearSettleTimer();
    clearEdgeSpring();
    horizontalCommitRef.current = null;
    if (clickResetTimerRef.current) window.clearTimeout(clickResetTimerRef.current);
  }, [clearEdgeSpring, clearSettleTimer, clearWheelIdleTimer]);

  useEffect(() => {
    const surface = surfaceElement;
    if (!surface || !verticalGesturesEnabled) return undefined;

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      const pageSizePx = surface.clientHeight || window.innerHeight || 1;
      const deltaX = normalizeWheelDelta(event.deltaX, event.deltaMode, pageSizePx);
      const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode, pageSizePx);
      if (deltaY === 0 || Math.abs(deltaX) >= Math.abs(deltaY)) return;

      const wantsAdvance = deltaY > 0;
      const canMove = wantsAdvance ? canAdvance : canRetreat;
      if (!canMove) return;

      // Once the stack claims an eligible wheel burst, keep the document
      // stationary through its inertial tail. A boundary direction above is
      // intentionally left unclaimed so normal page scrolling can continue.
      if (event.cancelable) event.preventDefault();
      clearWheelIdleTimer();
      wheelIdleTimerRef.current = window.setTimeout(resetWheelBurst, WHEEL_BURST_IDLE_MS);

      const burst = wheelBurstRef.current;
      if (burst.committed) return;
      clearSettleTimer();
      setIsSettling(false);
      if (isTransitioning) {
        burst.committed = true;
        writeVerticalOffset(0);
        return;
      }

      if (burst.accumulatedY !== 0 && Math.sign(burst.accumulatedY) !== Math.sign(deltaY)) {
        burst.accumulatedY = deltaY;
        burst.startTimeMs = event.timeStamp;
      } else {
        if (burst.accumulatedY === 0) burst.startTimeMs = event.timeStamp;
        burst.accumulatedY += deltaY;
      }

      const previewLimitPx = commitThresholdPx * WHEEL_PREVIEW_LIMIT_RATIO;
      setActiveAxis('vertical');
      writeVerticalOffset(clamp(
        -burst.accumulatedY * WHEEL_PREVIEW_RATIO,
        -previewLimitPx,
        previewLimitPx,
      ));

      if (Math.abs(burst.accumulatedY) < commitThresholdPx) return;
      burst.committed = true;
      // Release velocity from the burst's own accumulation rate — reported
      // to the caller so a fast flick can settle faster than a slow one.
      const elapsedMs = Math.max(1, event.timeStamp - burst.startTimeMs);
      const velocityPxPerMs = burst.accumulatedY / elapsedMs;
      if (burst.accumulatedY > 0) onAdvance(velocityPxPerMs);
      else onRetreat(velocityPxPerMs);
      // Continuity fix: transition the live preview offset back to rest
      // over the same window the committed row's own step animation runs,
      // instead of snapping it to 0 with no transition in this same frame
      // (see PLAN-CARDSTACK-DESKTOP-MOTION-CONTINUITY.md finding 1).
      settleOffsets('vertical');
    };

    surface.addEventListener('wheel', handleWheel, { passive: false });
    return () => surface.removeEventListener('wheel', handleWheel);
  }, [
    canAdvance,
    canRetreat,
    clearSettleTimer,
    clearWheelIdleTimer,
    commitThresholdPx,
    isTransitioning,
    onAdvance,
    onRetreat,
    resetWheelBurst,
    settleOffsets,
    surfaceElement,
    verticalGesturesEnabled,
    writeVerticalOffset,
  ]);

  const touchAction = useMemo<CSSProperties['touchAction']>(() => {
    if (!verticalGesturesEnabled) return horizontalGestureEnabled ? 'pan-y' : 'auto';
    if (!canAdvance && !canRetreat) return horizontalGestureEnabled ? 'pan-y' : 'auto';
    // Directional native panning gives the page back the unavailable edge
    // direction while the opposite direction remains stack-owned. Horizontal
    // movement remains available to the custom Articles/Labs recognizer.
    if (!canRetreat) return 'pan-down';
    if (!canAdvance) return 'pan-up';
    return 'none';
  }, [canAdvance, canRetreat, horizontalGestureEnabled, verticalGesturesEnabled]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const directPointer = event.pointerType !== 'mouse';
    if (horizontalCommitRef.current
      || isTransitioning
      || (!horizontalGestureEnabled && !(verticalGesturesEnabled && directPointer))) return;
    clearSettleTimer();
    clearEdgeSpring();
    setIsSettling(false);
    setSettlingMode(null);
    setActiveAxis(null);
    clearHorizontalPreview();
    pointerRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      axis: null,
      activated: false,
      startHorizontalOffset: horizontalOffsetRef.current,
      lastSampleTimeMs: event.timeStamp,
      lastSampleY: event.clientY,
      velocityPxPerMs: 0,
    };
  }, [
    clearEdgeSpring,
    clearHorizontalPreview,
    clearSettleTimer,
    horizontalGestureEnabled,
    isTransitioning,
    verticalGesturesEnabled,
  ]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - pointer.startX;
    const deltaY = event.clientY - pointer.startY;

    if (pointer.axis === null) {
      if (Math.abs(deltaX) <= directionLockThresholdPx && Math.abs(deltaY) <= directionLockThresholdPx) return;
      const candidateAxis: Exclude<GestureAxis, null> = Math.abs(deltaX) > Math.abs(deltaY)
        ? 'horizontal'
        : 'vertical';
      const candidateEnabled = candidateAxis === 'horizontal'
        ? horizontalGestureEnabled
        : verticalGesturesEnabled && pointer.pointerType !== 'mouse';
      if (!candidateEnabled) return;
      pointer.axis = candidateAxis;
      pointer.activated = true;
      setActiveAxis(candidateAxis);
      setIsDragging(true);
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    if (!pointer.activated) return;
    event.preventDefault();
    if (pointer.axis === 'horizontal') {
      const requestedOffsetPx = pointer.startHorizontalOffset + deltaX;
      const direction: HorizontalDirection = requestedOffsetPx >= 0 ? 1 : -1;
      const directionAvailable = direction === -1 ? canAdvance : canRetreat;
      if (horizontalEdgeSpringEnabled && !directionAvailable) {
        // Bounded nonlinear resistance makes a longer outward drag feel
        // progressively heavier, not merely like the same movement scaled
        // by a constant. It is the visual input to the physical release
        // spring, never a no-op navigation command.
        const resistanceScale = Math.max(0.05, 1 - edgeResistancePercent / 100);
        const maximum = Math.max(1, edgeMaxDisplacementPx);
        const resisted = Math.sign(requestedOffsetPx)
          * maximum * Math.tanh((Math.abs(requestedOffsetPx) * resistanceScale) / maximum);
        writeHorizontalOffset(resisted);
        clearHorizontalPreview();
        return;
      }
      writeHorizontalOffset(requestedOffsetPx);
      if (horizontalPreviewEnabled && directionAvailable) {
        const progress = clamp(
          (Math.abs(requestedOffsetPx) - horizontalPreviewThresholdPx)
            / Math.max(1, horizontalPreviewRangePx - horizontalPreviewThresholdPx),
          0,
          1,
        );
        if (progress > 0) {
          setHorizontalPreviewDirection(direction);
          setHorizontalPreviewProgress(progress);
        } else {
          clearHorizontalPreview();
        }
      }
      return;
    }

    // Exponentially-smoothed release velocity — a single last-sample delta
    // is noisy (jitters with real pointermove event spacing), so this blends
    // each new instantaneous reading against the running estimate rather
    // than replacing it outright.
    const sampleElapsedMs = Math.max(1, event.timeStamp - pointer.lastSampleTimeMs);
    const instantVelocityPxPerMs = (event.clientY - pointer.lastSampleY) / sampleElapsedMs;
    pointer.velocityPxPerMs = pointer.velocityPxPerMs * 0.7 + instantVelocityPxPerMs * 0.3;
    pointer.lastSampleTimeMs = event.timeStamp;
    pointer.lastSampleY = event.clientY;

    const blockedAtStart = deltaY > 0 && !canRetreat;
    const blockedAtEnd = deltaY < 0 && !canAdvance;
    writeVerticalOffset((blockedAtStart || blockedAtEnd) ? deltaY * EDGE_RESISTANCE_RATIO : deltaY);
  }, [
    canAdvance,
    canRetreat,
    directionLockThresholdPx,
    horizontalGestureEnabled,
    horizontalEdgeSpringEnabled,
    horizontalPreviewEnabled,
    horizontalPreviewRangePx,
    horizontalPreviewThresholdPx,
    edgeMaxDisplacementPx,
    edgeResistancePercent,
    clearHorizontalPreview,
    verticalGesturesEnabled,
    writeHorizontalOffset,
    writeVerticalOffset,
  ]);

  const finishPointer = useCallback((
    event: ReactPointerEvent<HTMLDivElement>,
    cancelled: boolean,
  ) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const consumed = pointer.activated;
    let committed = false;
    if (!cancelled && pointer.axis === 'horizontal'
      && Math.abs(horizontalOffsetRef.current) > commitThresholdPx) {
      const direction: HorizontalDirection = horizontalOffsetRef.current >= 0 ? 1 : -1;
      const directionAvailable = direction === -1 ? canAdvance : canRetreat;
      if (!horizontalEdgeSpringEnabled || directionAvailable) {
        committed = true;
        startHorizontalCommit(direction, horizontalOffsetRef.current);
      }
    } else if (!cancelled && pointer.axis === 'vertical') {
      if (verticalOffsetRef.current <= -commitThresholdPx && canAdvance) {
        committed = true;
        onAdvance(pointer.velocityPxPerMs);
      } else if (verticalOffsetRef.current >= commitThresholdPx && canRetreat) {
        committed = true;
        onRetreat(pointer.velocityPxPerMs);
      }
    }

    pointerRef.current = null;
    if (consumed && !committed && pointer.axis) {
      const isUnavailableHorizontalEdge = pointer.axis === 'horizontal'
        && horizontalEdgeSpringEnabled
        && (horizontalOffsetRef.current < 0 ? !canAdvance : !canRetreat);
      const isUnavailableVerticalEdge = pointer.axis === 'vertical'
        && verticalEdgeSpringEnabled
        && (verticalOffsetRef.current < 0 ? !canAdvance : !canRetreat);
      if (isUnavailableHorizontalEdge) startEdgeSpringForAxis('horizontal');
      else if (isUnavailableVerticalEdge) startEdgeSpringForAxis('vertical');
      else settleOffsets(pointer.axis);
    }
    // Continuity fix: a committed vertical step transitions the live drag
    // offset back to rest over settleDurationMs, the same window the
    // committed row's own step animation runs, instead of the raw instant
    // reset below (see PLAN-CARDSTACK-DESKTOP-MOTION-CONTINUITY.md finding
    // 1). Horizontal's own committed path is already handled by
    // startHorizontalCommit/finishHorizontalCommit above and never reaches
    // here.
    else if (committed && pointer.axis === 'vertical') {
      settleOffsets('vertical');
    }
    else if (!(committed && pointer.axis === 'horizontal')) {
      writeHorizontalOffset(0);
      writeVerticalOffset(0);
      setActiveAxis(null);
      setIsDragging(false);
      setIsSettling(false);
      setSettlingMode(null);
      clearHorizontalPreview();
    }

    if (consumed) {
      suppressClickRef.current = true;
      if (clickResetTimerRef.current) window.clearTimeout(clickResetTimerRef.current);
      clickResetTimerRef.current = window.setTimeout(() => {
        clickResetTimerRef.current = 0;
        suppressClickRef.current = false;
      }, 0);
    }
  }, [
    canAdvance,
    canRetreat,
    clearHorizontalPreview,
    commitThresholdPx,
    horizontalEdgeSpringEnabled,
    verticalEdgeSpringEnabled,
    onAdvance,
    onRetreat,
    settleOffsets,
    startHorizontalCommit,
    startEdgeSpringForAxis,
    writeHorizontalOffset,
    writeVerticalOffset,
  ]);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    finishPointer(event, false);
  }, [finishPointer]);

  const onPointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    finishPointer(event, true);
  }, [finishPointer]);

  const onTransitionEnd = useCallback((event: ReactTransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;
    finishHorizontalCommit();
  }, [finishHorizontalCommit]);

  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    surfaceRef,
    activeAxis,
    horizontalOffsetPx,
    verticalOffsetPx,
    isDragging,
    isSettling,
    settlingMode,
    horizontalPreviewDirection,
    horizontalPreviewProgress,
    touchAction,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onTransitionEnd,
    onClickCapture,
  };
}
