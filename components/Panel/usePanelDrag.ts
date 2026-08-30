import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { CTA_BUTTON_MOTION_EASINGS, type CtaButtonMotionEasing } from '../CtaButton/config/registered';
import { usePanelPosition, type PanelPosition } from './config/usePanelPosition';

// A plain synchronous check, not the shared usePrefersReducedMotion hook —
// that hook calls window.matchMedia with no feature guard, which throws in
// this repo's own test environment (jsdom doesn't implement matchMedia) and
// would crash every test that renders PanelShell. Same defensive read
// components/proximity/useCardLiftPhysics.ts's own local
// prefersReducedMotion() already uses, read once at spring-start time
// rather than kept as live reactive state (this hook has no ongoing need to
// re-render if the setting changes mid-drag).
const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

// Same SSR-safe useLayoutEffect/useEffect swap as this codebase's own
// AbstractPostDock/hooks/browserState.ts useIsomorphicLayoutEffect — kept
// local rather than imported from there since that file lives under
// experiences/abstract, and components/Panel is a generic, page-agnostic
// shared component that shouldn't depend on a specific experience's own
// folder. Layout-effect timing (not a plain effect) matters here
// specifically so a persisted position is committed before the browser's
// first paint — see the mount effect below for why.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Below this many px of pointer travel, a pointerdown-then-up on the drag
// handle is treated as a plain click (collapsing/opening the shell via
// .panelTitle or .panelLauncher, or one of the .headerActions buttons)
// rather than a drag — same distance-threshold principle this codebase
// already uses to distinguish a tap from a swipe (CardStack.tsx's own
// DIRECTION_LOCK_THRESHOLD_PX).
const DRAG_START_THRESHOLD_PX = 4;
// How much of the shell must stay reachable within the viewport — applied
// on drag release and on mount-restore, in case the viewport shrank since a
// position was persisted (e.g. a narrower window, or a different device).
// Exported so usePanelVerticalAnchor.ts can clamp its own pinned-top value
// to the exact same "stay reachable" margin, rather than a second,
// independently-tunable copy of the same constant.
export const VISIBLE_MARGIN_PX = 24;
// Settle thresholds below which the spring is considered "arrived" — same
// values useStackGestureNavigation.ts's own startEdgeSpringForAxis uses for
// its identical unit-mass damped-spring integration.
const SPRING_SETTLE_DISPLACEMENT_PX = 0.5;
const SPRING_SETTLE_VELOCITY_PX_PER_S = 4;
const SPRING_MAX_STEP_SECONDS = 0.032;

/**
 * `strict: false` (the collapsed launcher's own behavior, unchanged) only
 * guarantees a small `VISIBLE_MARGIN_PX` sliver of the box stays reachable
 * — most of it can sit off-screen above/below/beside an edge, matching a
 * common "off-screen floating action button" affordance.
 *
 * `strict: true` (the open panel) guarantees the box's *entire* top and
 * bottom edge stay within the viewport, not just a sliver — the open panel
 * has real content near both edges (header/search/tabs at the top, the
 * last row at the bottom) that must stay reachable. This is the fix for a
 * reported bug: dragging the *already-open* panel up near the viewport's
 * top edge kept its existing bottom-anchored height (computed for its
 * default, undragged position) and simply translated the whole box
 * upward, pushing its own header/search/tabs above y=0 with no way to
 * reach them — a pure positional clamp, unlike usePanelVerticalAnchor.ts's
 * top-pin-and-grow-downward fix for the *collapsed-launcher-opens-near-
 * top* case, since here the box's real height is already fully known
 * (rendered), nothing needs to grow. Horizontal bounds are unaffected by
 * `strict` — this fixes the reported vertical/top-edge case specifically,
 * not a general 4-directional off-screen guarantee for every state.
 */
function clampOffset(
  offset: PanelPosition,
  frame: HTMLElement,
  strict: boolean,
): PanelPosition {
  if (typeof window === 'undefined') return offset;
  const rect = frame.getBoundingClientRect();
  // rect already reflects whatever offset is currently applied — subtract
  // it back out so the clamp works in the same "delta from the default
  // fixed anchor" space `offset` itself is defined in.
  const baseLeft = rect.left - offset.x;
  const baseTop = rect.top - offset.y;
  const minX = VISIBLE_MARGIN_PX - (baseLeft + rect.width);
  const maxX = window.innerWidth - VISIBLE_MARGIN_PX - baseLeft;
  const minY = strict
    ? VISIBLE_MARGIN_PX - baseTop
    : VISIBLE_MARGIN_PX - (baseTop + rect.height);
  const maxY = strict
    ? window.innerHeight - VISIBLE_MARGIN_PX - baseTop - rect.height
    : window.innerHeight - VISIBLE_MARGIN_PX - baseTop;
  return {
    x: Math.min(Math.max(minX, maxX), Math.max(Math.min(minX, maxX), offset.x)),
    y: Math.min(Math.max(minY, maxY), Math.max(Math.min(minY, maxY), offset.y)),
  };
}

/**
 * Drag-to-reposition for PanelShell's own fixed frame. The frame keeps its
 * existing CSS `right`/`bottom` anchor (Panel.module.css's `.panelFrame`)
 * unconditionally — dragging applies a `transform: translate3d()` delta on
 * top of that anchor rather than switching to `left`/`top`, so a shell
 * that's never been dragged, or that has `dragEnabled: false`, renders
 * exactly as it did before this feature existed.
 *
 * Attach `frameRef` to `.panelFrame` and spread `handleProps` onto every
 * drag handle (`.panelHeader` when open, `.panelLauncher` when collapsed —
 * both must get it, otherwise dragging silently stops working the moment
 * the shell collapses) — a pointerdown/move/up state machine decides, via
 * `DRAG_START_THRESHOLD_PX`, whether a given interaction is a drag or an
 * ordinary click, so `.panelTitle`/`.panelLauncher`'s own onClick and the
 * `.headerActions` buttons keep working unchanged.
 *
 * Additionally spread `backgroundHandleProps` onto `.panel`'s own root
 * element and onto `.scrollArea` — see `onBackgroundPointerDown`'s own doc
 * comment for why those two specifically, and why a plain `handleProps`
 * there would be unsafe (it would swallow every click/drag/scroll gesture
 * on every real control the panel contains).
 */
export function usePanelDrag({
  enabled,
  isOpen,
  settleStiffness,
  settleDamping,
  settleMaxDurationMs,
  opacityWhileDragging,
  opacityTransitionMs,
  opacityTransitionEasing,
  backdropBlurEnabled,
}: {
  enabled: boolean;
  /** Selects the clamp strictness on drag release/restore — see
   * clampOffset's own doc comment. Read via a ref internally so this
   * doesn't need to be a dependency of the drag lifecycle callbacks
   * (`endDrag` etc.), which would otherwise tear down and re-attach the
   * window pointer listeners mid-gesture every time the shell opens or
   * closes. */
  isOpen: boolean;
  /** Unit-mass damped-spring integration (x'' = -stiffness*x - damping*x')
   * drives the release-snap — same vocabulary as SplitColumnCardStackConfig's
   * own verticalEdgeSpringStiffness/-Damping. Higher stiffness settles
   * faster; lower damping lets it overshoot and oscillate before stopping. */
  settleStiffness: number;
  settleDamping: number;
  /** Safety cutoff only — a positive damping value converges well within
   * this window on its own. */
  settleMaxDurationMs: number;
  opacityWhileDragging: number;
  opacityTransitionMs: number;
  opacityTransitionEasing: CtaButtonMotionEasing;
  /** Opt-in (default off) — switches translucency strategy from this
   * frame's own whole-panel opacity fade to a frosted-glass surface blur
   * (Panel.module.css's `[data-drag-frost]` rules, driven by index.tsx's
   * own CSS custom properties) so the page content behind reads as
   * genuinely out of focus while the operator is mid-drag, not just faded.
   * Off by default since a live backdrop-filter blur is a real, continuous
   * paint cost while dragging, not free chrome. */
  backdropBlurEnabled: boolean;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [persisted, setPersisted] = usePanelPosition();
  // Starts at the default anchor, not a lazy read of `persisted` — `usePanel
  // Position` is itself a `useSyncExternalStore` hook that deliberately
  // returns `null` on the very first client render (matching SSR) and only
  // resolves to the real stored value on the immediate follow-up render (see
  // its own doc comment). A lazy `useState` initializer only runs once and
  // would permanently miss that follow-up value, silently ignoring every
  // persisted position. The mount effect below applies it instead, once
  // `persisted` has actually settled.
  const [offset, setOffset] = useState<PanelPosition>({ x: 0, y: 0 });
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const appliedPersistedRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
    moved: boolean;
  } | null>(null);
  // `endDrag` (the window `pointerup` listener) runs before the browser's
  // own synthetic `click` fires for the same interaction, and it clears
  // `dragStateRef.current` — reading `dragStateRef.current?.moved` from the
  // click handler would therefore always see `null` and never actually
  // suppress anything. This flag survives past that clear; the click
  // capture handler below both reads and clears it.
  const justDraggedRef = useRef(false);
  const settleFrameRef = useRef(0);

  const clearSettleSpring = useCallback(() => {
    if (settleFrameRef.current) {
      window.cancelAnimationFrame(settleFrameRef.current);
      settleFrameRef.current = 0;
    }
  }, []);

  // A real damped-spring integration, not an eased fixed-duration
  // transition — matches useStackGestureNavigation.ts's own
  // startEdgeSpringForAxis (same integrator, same settle thresholds),
  // generalized to move both axes together from wherever the pointer
  // released to `target` (the viewport-clamped final position). Starts at
  // zero velocity — this settles a released-in-place drag, it doesn't carry
  // forward real pointer flick momentum (not requested, and would need
  // tracking recent pointermove velocity separately).
  const startSettleSpring = useCallback((target: PanelPosition) => {
    clearSettleSpring();
    if (prefersReducedMotion() || settleMaxDurationMs <= 0) {
      setOffset(target);
      return;
    }
    let positionX = offsetRef.current.x;
    let positionY = offsetRef.current.y;
    let velocityX = 0;
    let velocityY = 0;
    let previousTime = performance.now();
    let elapsedMs = 0;
    const tick = (now: number) => {
      const seconds = Math.min(SPRING_MAX_STEP_SECONDS, Math.max(0.001, (now - previousTime) / 1000));
      previousTime = now;
      elapsedMs += seconds * 1000;
      const dxFromTarget = positionX - target.x;
      const dyFromTarget = positionY - target.y;
      const accelerationX = -settleStiffness * dxFromTarget - settleDamping * velocityX;
      const accelerationY = -settleStiffness * dyFromTarget - settleDamping * velocityY;
      velocityX += accelerationX * seconds;
      velocityY += accelerationY * seconds;
      positionX += velocityX * seconds;
      positionY += velocityY * seconds;
      const settled = Math.abs(dxFromTarget) < SPRING_SETTLE_DISPLACEMENT_PX
        && Math.abs(dyFromTarget) < SPRING_SETTLE_DISPLACEMENT_PX
        && Math.abs(velocityX) < SPRING_SETTLE_VELOCITY_PX_PER_S
        && Math.abs(velocityY) < SPRING_SETTLE_VELOCITY_PX_PER_S;
      // Safety cutoff, not a normal exit path — a positive damping value
      // always converges well within this window; guards only against a
      // misconfigured (near-zero damping) panel value ringing indefinitely.
      const timedOut = elapsedMs >= settleMaxDurationMs;
      if (settled || timedOut) {
        setOffset(target);
        settleFrameRef.current = 0;
        return;
      }
      setOffset({ x: positionX, y: positionY });
      settleFrameRef.current = window.requestAnimationFrame(tick);
    };
    settleFrameRef.current = window.requestAnimationFrame(tick);
  }, [clearSettleSpring, settleStiffness, settleDamping, settleMaxDurationMs]);

  // Applies the persisted position exactly once, the first time it resolves
  // to a real (non-null) value — "used on a fresh load" verbatim, with no
  // fly-in animation from the default corner. Also reclamps against the
  // current viewport in case it shrank since the position was persisted (a
  // narrower window, a different device), same clamp a drag release uses.
  useIsomorphicLayoutEffect(() => {
    if (appliedPersistedRef.current || !persisted) return;
    appliedPersistedRef.current = true;
    const clamped = frameRef.current
      ? clampOffset(persisted, frameRef.current, isOpenRef.current)
      : persisted;
    setOffset(clamped);
    if (clamped.x !== persisted.x || clamped.y !== persisted.y) setPersisted(clamped);
  }, [persisted, setPersisted]);

  // Shrinking the viewport (resizing the browser window, rotating a device)
  // after a position was dragged out near an edge can push that same fixed
  // offset entirely off the new, smaller viewport — unlike the mount-time
  // reclamp above, which only ever runs once on load, this keeps recovering
  // that as the window keeps changing size. Deliberately narrower than
  // clampOffset's own "keep a VISIBLE_MARGIN_PX sliver reachable" guarantee:
  // only steps in once the frame has *zero* overlap with the viewport (fully
  // unreachable), not merely a tight corner — an operator who deliberately
  // dragged the panel most of the way off-screen shouldn't have it yanked
  // back just for resizing their window a little.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const recoverIfFullyOffscreen = () => {
      const frame = frameRef.current;
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      const fullyOffscreen = rect.right <= 0
        || rect.bottom <= 0
        || rect.left >= window.innerWidth
        || rect.top >= window.innerHeight;
      if (!fullyOffscreen) return;
      const corrected = clampOffset(offsetRef.current, frame, isOpenRef.current);
      setPersisted(corrected);
      // The same damped-spring release a drag end already uses, not an
      // instant snap — this recovery can fire while the panel is fully
      // visible on screen mid-resize, so sliding it back reads as a
      // deliberate correction rather than a jarring teleport.
      startSettleSpring(corrected);
    };
    window.addEventListener('resize', recoverIfFullyOffscreen);
    return () => window.removeEventListener('resize', recoverIfFullyOffscreen);
  }, [setPersisted, startSettleSpring]);

  // Dragging the panel over ordinary page text (headings, paragraphs) would
  // otherwise highlight it as a side effect of the pointer travel — a plain
  // CSS `user-select: none` scoped to the panel itself doesn't help here
  // since the selection lands on whatever's *underneath* the panel, not on
  // the panel's own DOM. Toggled directly on <body> only while a drag is
  // actually in progress (not merely "pointer is down" — a click-through
  // that never exceeds DRAG_START_THRESHOLD_PX should never touch page
  // selection at all) and restored the moment the drag ends.
  const suppressPageTextSelection = useCallback((suppressed: boolean) => {
    document.body.style.userSelect = suppressed ? 'none' : '';
    (document.body.style as CSSProperties & { webkitUserSelect?: string })
      .webkitUserSelect = suppressed ? 'none' : '';
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const drag = dragStateRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startClientX;
    const dy = event.clientY - drag.startClientY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_START_THRESHOLD_PX) return;
    if (!drag.moved) {
      drag.moved = true;
      setIsDragging(true);
      suppressPageTextSelection(true);
    }
    setOffset({ x: drag.startOffsetX + dx, y: drag.startOffsetY + dy });
  }, [suppressPageTextSelection]);

  const endDrag = useCallback((event: PointerEvent) => {
    const drag = dragStateRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragStateRef.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    if (!drag.moved) return;
    justDraggedRef.current = true;
    setIsDragging(false);
    suppressPageTextSelection(false);
    const target = frameRef.current
      ? clampOffset(offsetRef.current, frameRef.current, isOpenRef.current)
      : offsetRef.current;
    setPersisted(target);
    startSettleSpring(target);
  }, [handlePointerMove, setPersisted, startSettleSpring, suppressPageTextSelection]);

  const beginDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || event.button !== 0) return;
    clearSettleSpring();
    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: offsetRef.current.x,
      startOffsetY: offsetRef.current.y,
      moved: false,
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  }, [enabled, clearSettleSpring, handlePointerMove, endDrag]);

  // Handle elements (.panelHeader, .panelLauncher) drag on a pointerdown
  // landing ANYWHERE inside them, including on a descendant button — an
  // operator grabbing the header while their cursor happens to sit over
  // "RESET" still drags the shell (existing, unchanged behavior).
  const onHandlePointerDown = beginDrag;

  // Background areas (.panel's own root, .scrollArea) are NOT handle
  // elements — they contain real interactive descendants (every config
  // control, every row, the scrollable list itself) that must keep
  // receiving their own clicks/drags/scroll gestures untouched. Gating on
  // `event.target === event.currentTarget` means this only starts a panel
  // drag when the pointerdown lands directly on the background element's
  // own box with nothing else underneath it — which, given neither
  // .panel's root nor .scrollArea paint a background color or contain
  // absolutely-positioned fillers there, is exactly the panel's own
  // padding gutter (the visible border-like empty space around the
  // content: above the header, below the scroll area, and — since
  // .scrollArea deliberately extends its own box edge-to-edge via a
  // negative margin-inline/matching padding-inline pair, see its own CSS
  // doc comment — down both the left and right sides for the scroll
  // area's full height too). Fixes an operator-reported dead zone: that
  // gutter previously had no drag listener anywhere near it, since only
  // .panelHeader (which stops at the *padded* content edge, not the
  // panel's true visual edge) had one.
  const onBackgroundPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    beginDrag(event);
  }, [beginDrag]);

  // Suppresses the synthetic click a drag's own pointerup otherwise fires —
  // without this, releasing a drag over `.panelTitle`/`.panelLauncher` would
  // also toggle the shell open/closed. Mirrors the same click-after-drag
  // suppression idiom useStackGestureNavigation's own onClickCapture already
  // applies to the card stack's swipe surface.
  const onHandleClickCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  useEffect(() => () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    clearSettleSpring();
    suppressPageTextSelection(false);
  }, [handlePointerMove, endDrag, clearSettleSpring, suppressPageTextSelection]);

  // Opens near the left or right viewport edge (the launcher's own default
  // bottom-right anchor never triggers this — only a position dragged, then
  // persisted, close to either edge does) would otherwise render the panel
  // partially off-screen the moment it expands to its full ~336px width,
  // since `offset` only carries the *launcher's* already-valid clamp, not
  // the wider open panel's. Runs once per open transition, after the DOM
  // reflects the just-opened frame's real width — mirrors
  // usePanelVerticalAnchor's own "decide once per open transition" timing
  // for the equivalent vertical case. Deliberately a one-time correction,
  // not an ongoing clamp: every subsequent drag (including deliberately off-
  // screen) stays free, since clampOffset's own X bounds are already lenient
  // for both strict and non-strict alike.
  const wasOpenRef = useRef(isOpen);
  useIsomorphicLayoutEffect(() => {
    const openedJustNow = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!openedJustNow || typeof window === 'undefined') return;
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const overflowLeft = VISIBLE_MARGIN_PX - rect.left;
    const overflowRight = rect.right - (window.innerWidth - VISIBLE_MARGIN_PX);
    let shiftX = 0;
    if (overflowLeft > 0) shiftX = overflowLeft;
    else if (overflowRight > 0) shiftX = -overflowRight;
    if (shiftX === 0) return;
    const corrected = { x: offsetRef.current.x + shiftX, y: offsetRef.current.y };
    setOffset(corrected);
    setPersisted(corrected);
  }, [isOpen, setPersisted]);

  const opacityEasingCss = CTA_BUTTON_MOTION_EASINGS[opacityTransitionEasing];
  // Group `opacity` on this frame and a `backdrop-filter` on the *surface*
  // living inside it (`.backdrop`/`.panelLauncher`, wired in index.tsx) are
  // mutually exclusive translucency strategies, not a stack: CSS opacity
  // re-composites this frame's already-fully-rendered subtree against
  // whatever sits behind it at the very end, after that subtree's own
  // near-opaque surface fill has already painted over — and so hidden —
  // almost all of any backdrop-filter blur sampled earlier inside it. The
  // fraction of "what's behind" that opacity actually reveals is therefore
  // always the untouched, un-blurred page, regardless of what backdrop-
  // filter did further in. A real frosted look needs the surface's own
  // background-color alpha reduced (not this ancestor's opacity) so the
  // blurred sample dominates the *local* composite before anything is
  // revealed — see the `.backdrop[data-drag-frost]`/`.panelLauncher[data-
  // drag-frost]` rules in Panel.module.css. So: when backdropBlurEnabled,
  // this frame stays fully opaque and the frost rules own translucency
  // instead; otherwise this keeps its original whole-panel fade.
  const frameStyle = useMemo((): CSSProperties => ({
    transform: (offset.x !== 0 || offset.y !== 0)
      ? `translate3d(${offset.x}px, ${offset.y}px, 0)`
      : undefined,
    // The spring above already interpolates `transform` itself, frame by
    // frame — a CSS transition on top of an already-smoothed value would
    // just add lag, not smoothness. Opacity has no equivalent JS-driven
    // interpolation (it's a plain two-state fade), so it gets a real CSS
    // transition instead, using its own configurable duration/easing
    // (previously missing entirely, which is why the fade never actually
    // animated).
    transition: `opacity ${opacityTransitionMs}ms ${opacityEasingCss}`,
    opacity: isDragging && !backdropBlurEnabled ? opacityWhileDragging : 1,
  }), [
    offset.x,
    offset.y,
    isDragging,
    opacityTransitionMs,
    opacityEasingCss,
    opacityWhileDragging,
    backdropBlurEnabled,
  ]);

  const handleProps = useMemo(() => (
    enabled
      ? { onPointerDown: onHandlePointerDown, onClickCapture: onHandleClickCapture }
      : {}
  ), [enabled, onHandlePointerDown, onHandleClickCapture]);

  const backgroundHandleProps = useMemo(() => (
    enabled
      ? { onPointerDown: onBackgroundPointerDown, onClickCapture: onHandleClickCapture }
      : {}
  ), [enabled, onBackgroundPointerDown, onHandleClickCapture]);

  return {
    frameRef,
    frameStyle,
    isDragging,
    handleProps,
    backgroundHandleProps,
    offsetX: offset.x,
    offsetY: offset.y,
  };
}
