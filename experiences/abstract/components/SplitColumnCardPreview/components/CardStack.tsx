import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  CTA_BUTTON_MOTION_EASINGS,
  type CtaButtonConfig,
} from '../../../../../components/CtaButton/config/registered';
import { deriveSurfaceColor, deriveTransparentTint, resolveContrastAwareTextColor } from '../../../../../helpers/surfaceColorDerivation';
import { resolveStackCardWidthClass, type SplitColumnCardStackConfig } from '../config/stack';
import { useCardStackLayout } from '../hooks/useCardStackLayout';
import { useStackStepMotion } from '../hooks/useStackStepMotion';
import { useStackHorizontalStepTransition } from '../hooks/useStackHorizontalStepTransition';
import { useHasHoverPointer } from '../hooks/useHasHoverPointer';
import { useTouchCarouselCapability } from '../hooks/useTouchCarouselCapability';
import { useMobileCardStackEmbla } from '../hooks/useMobileCardStackEmbla';
import { useStackGestureNavigation } from '../hooks/useStackGestureNavigation';
import type { StackListKey, StackSwipeTransition } from '../hooks/useStackSwipeTransition';
import { resolveStackSlotPose } from '../helpers/stackNeighborTransform';
import { StackNavArrowButton } from './StackNavArrowButton';
import { CardStackSlot, type CardStackContentAdapter } from './CardStackSlot';
import styles from './CardStack.module.css';

const STACK_NAV_GROUP_WIDTH_PX = 96;
const STACK_NAV_EDGE_GUTTER_PX = 8;
// StackNavArrowButton's own min-h-11 hit-box floor (44px), independent of
// its visual sizePx — used by resolveCardStackArrowGroupTop's own
// card-relative placement (ABSTRACT-03, 2026-08-20-139d957) to know how
// tall the group itself is when anchoring it just above the card's top
// edge rather than to a fixed viewport offset.
const STACK_NAV_GROUP_HEIGHT_PX = 44;

export type CardStackVerticalAlign = 'start' | 'center' | 'end';

/** Moves the complete fixed stack so its active card follows the composing
 * layout's vertical alignment. The active slot is centered by its own
 * translate(-50%); shifting the rows through the configured top/bottom
 * content box produces the same start/center/end positions a normal-flow
 * flex child would occupy. Oversized cards keep the safe centered fallback
 * instead of creating additional offscreen overflow. */
export function resolveCardStackVerticalOffsetPx({
  align,
  fixedHeightPx,
  cardHeightPx,
  paddingTopPx = 0,
  paddingBottomPx = 0,
}: {
  align: CardStackVerticalAlign;
  fixedHeightPx: number;
  cardHeightPx: number;
  paddingTopPx?: number;
  paddingBottomPx?: number;
}): number {
  const contentTopPx = Math.min(fixedHeightPx, Math.max(0, paddingTopPx));
  const contentBottomPx = Math.max(contentTopPx, fixedHeightPx - Math.max(0, paddingBottomPx));
  const contentHeightPx = contentBottomPx - contentTopPx;
  const contentCenterPx = contentTopPx + contentHeightPx / 2;
  if (cardHeightPx > contentHeightPx || align === 'center') {
    return contentCenterPx - fixedHeightPx / 2;
  }
  const activeCenterPx = align === 'start'
    ? contentTopPx + cardHeightPx / 2
    : contentBottomPx - cardHeightPx / 2;
  return activeCenterPx - fixedHeightPx / 2;
}

/**
 * Embla measures slide boxes, not CSS gaps. A separation therefore belongs
 * to every slide *before* another card, never to the terminal slide. Giving
 * the last slide a trailing gap makes `containScroll: 'trimSnaps'` consume
 * that empty area at the end and shifts the final card left by the gap.
 */
export function resolveMobileEmblaSlideBasisPx({
  cardWidthPx,
  gapPx,
  itemIndex,
  itemCount,
}: {
  cardWidthPx: number;
  gapPx: number;
  itemIndex: number;
  itemCount: number;
}): number {
  return cardWidthPx + (itemIndex < itemCount - 1 ? gapPx : 0);
}

// ABSTRACT-03 fix (2026-08-20-139d957): fixedLeftPx >= (group width + edge
// gutter) alone only proves the arrow group's own 96+8px box fits between
// x=0 and the card's left edge — it says nothing about whether that space
// is actually *empty*. At the split-column tiers this page renders below
// desktop (tablet-portrait 768px, tablet-portrait-modern 820px), the
// narrow column's own right-aligned headline/body text runs close to its
// own column edge, which sits well past halfway into that "gutter,"
// confirmed via live geometry + screenshot: the arrow group's own 96px
// box, placed immediately left of the card, landed directly on top of
// "where" in "I work where engineering..." — a real overlap this ratio
// check exists to prevent. STACK_NAV_GENEROUS_GUTTER_RATIO (fixedLeftPx /
// pageWidthPx) distinguishes a genuinely wide, presumptively-empty gutter
// (tablet-landscape 1024px: card starts at ~63% of page width, comfortably
// past where this page's 38%-tier narrow column could plausibly extend)
// from a narrow one where the column's own content realistically reaches
// (tablet-portrait/-modern: card starts at ~44-46%, confirmed too close).
// 0.5 (card starts past the page's horizontal midpoint) is a deliberately
// conservative proxy for "past the narrow column's own likely max content
// width," not a measurement of that column's real live text extent (this
// function has no such measurement available) — it trades a small amount
// of unused gutter at borderline widths for guaranteed non-overlap, which
// this defect's own severity (illegible headline text) makes the right
// tradeoff. Below that ratio, the card-overlay fallback branch (unchanged)
// already places the group safely within the card's own box instead.
const STACK_NAV_GENEROUS_GUTTER_RATIO = 0.5;

function stackNavHasGenerousGutter({
  fixedLeftPx,
  pageWidthPx,
}: {
  fixedLeftPx: number;
  pageWidthPx: number;
}) {
  return fixedLeftPx >= STACK_NAV_GROUP_WIDTH_PX + STACK_NAV_EDGE_GUTTER_PX
    && (pageWidthPx <= 0 || fixedLeftPx / pageWidthPx > STACK_NAV_GENEROUS_GUTTER_RATIO);
}

export function resolveCardStackArrowGroupLeft({
  fixedLeftPx,
  fixedWidthPx,
  pageWidthPx,
}: {
  fixedLeftPx: number;
  fixedWidthPx: number;
  pageWidthPx: number;
}) {
  if (stackNavHasGenerousGutter({ fixedLeftPx, pageWidthPx })) {
    return fixedLeftPx - STACK_NAV_GROUP_WIDTH_PX - STACK_NAV_EDGE_GUTTER_PX;
  }
  return Math.max(STACK_NAV_EDGE_GUTTER_PX, Math.min(
    pageWidthPx - STACK_NAV_GROUP_WIDTH_PX - STACK_NAV_EDGE_GUTTER_PX,
    fixedLeftPx + fixedWidthPx - STACK_NAV_GROUP_WIDTH_PX,
  ));
}

// The tab row's own styling ( .tabs/.tab/.separator) — reused verbatim
// rather than redeclared, since CardStack now renders the tab row itself
// in stack mode (see this component's own doc comment for why).
import tabStyles from '../../SplitColumnCardPreview.module.css';

/**
 * Scales a committed vertical step's translate duration down toward
 * `minDurationScale` as the release gesture that triggered it gets faster —
 * the "a hard flick lands sooner" quality Embla's own attraction physics
 * has, layered on top of this stack's existing fixed-curve step animation
 * (see PLAN-CARDSTACK-DESKTOP-MOTION-CONTINUITY.md). A keyboard-triggered
 * step (`velocityPxPerMs` null) or a release at/under the max flick speed
 * with scaling disabled always uses the full configured duration.
 */
export function resolveStackStepDurationMs({
  baseDurationMs,
  velocityScalingEnabled,
  minDurationScale,
  maxFlickVelocityPxPerMs,
  velocityPxPerMs,
}: {
  baseDurationMs: number;
  velocityScalingEnabled: boolean;
  minDurationScale: number;
  maxFlickVelocityPxPerMs: number;
  velocityPxPerMs: number | null;
}): number {
  if (!velocityScalingEnabled || velocityPxPerMs === null || maxFlickVelocityPxPerMs <= 0) {
    return baseDurationMs;
  }
  const clampedVelocity = Math.min(Math.abs(velocityPxPerMs), maxFlickVelocityPxPerMs);
  const progress = clampedVelocity / maxFlickVelocityPxPerMs;
  const scale = 1 - progress * (1 - minDurationScale);
  return baseDurationMs * scale;
}

const DIRECTION_LOCK_THRESHOLD_PX = 8;
const TRANSITION_FALLBACK_BUFFER_MS = 160;

// Tailwind's default spacing scale is uniformly `n * 0.25rem` (= n * 4px)
// for every token in GAP_OPTIONS, including the fractional ones
// (gap-0.5 = 0.125rem = 2px = 0.5 * 4px) — same formula pages/about.tsx's
// own tailwindTokenToPx relies on for its height/margin tokens.
function spacingClassToPx(spacingClass: string): number {
  const match = spacingClass.match(/-(\d+(?:\.\d+)?)$/);
  return match ? Number(match[1]) * 4 : 0;
}

export type CardStackProps<TItem> = {
  /** The primary list's page-owned items, in order — opaque to CardStack
   * itself, forwarded straight through to `renderContent` alongside a
   * resolved `itemIndex`. See `cardstack-content-renderer-boundary` (bugs
   * audit / feature-development agentic flow): the content-rendering
   * boundary lives here at the component's own top level, not only inside
   * `CardStackSlot`, so a page can adopt the shared layout/selection/
   * desktop-navigation/mobile-Embla engine without forking it — `/abstract`
   * (articles/labs) and `/about` (narrative paragraphs) are two different
   * `TItem` shapes through the same component. */
  items: ReadonlyArray<TItem>;
  /** The secondary, tab-switchable list — `[]` for a single-list consumer
   * (e.g. About). Same `TItem` shape as `items`; which list is currently
   * rendered is `swipe.renderedList` ('articles' | 'labs' — a fixed
   * two-slot switch key, not itself a claim about content). */
  secondaryItems: ReadonlyArray<TItem>;
  hasItems: boolean;
  hasSecondaryItems: boolean;
  /** See `CardStackContentAdapter`'s own doc comment (CardStackSlot.tsx). */
  renderContent: CardStackContentAdapter<TItem>;
  /** Owned by the parent (SplitColumnCardPreview) so the same tab row that
   * sits above this component in both branches can drive it — see that
   * component's own doc comment. */
  swipe: StackSwipeTransition;
  /** How much of the top of the real viewport this stack's fixed layer
   * gives back to the header instead of rendering under — 0 (default):
   * today's only behavior, the stack is edge-to-edge with the viewport and
   * passes underneath the header. A positive value (the card column's own
   * SplitColumnLayoutConfig.wideColumnHeaderBehavior === 'pushDown', see
   * useCardStackLayout's own doc comment) starts/shortens the layer by that
   * many px instead, so it begins below the header rather than under it. */
  headerOffsetPx?: number;
  /** Vertical position of the active card inside the fixed viewport layer.
   * Kept as a generic prop so the page composer can translate its own
   * layout vocabulary without CardStack depending on PolymorphicLayout. */
  verticalAlign?: CardStackVerticalAlign;
  /** Resolved Tailwind spacing tokens from the composing column. CardStack
   * already parses its own Tailwind gap token; accepting these complete
   * literals keeps start/end alignment inside the same configured content
   * box instead of pinning cards to the raw viewport edge. */
  verticalPaddingTopClass?: string;
  verticalPaddingBottomClass?: string;
  stackConfig: SplitColumnCardStackConfig;
  physicsConfig: CtaButtonConfig;
  cardRadius: string;
  surfaceColor: string;
  /** Only meaningful when stackConfig.neighborBackgroundMode or
   * neighborTextColorMode is 'column' — the wide split column's own
   * resolved background color this stack actually sits on (e.g. pages/
   * abstract.tsx's own already-computed resolvedWideColumnColor), as
   * opposed to surfaceColor above (the flat page surface). Falls back to
   * surfaceColor when omitted, so a page not opting into 'column' mode
   * needs no change. */
  columnBackgroundColor?: string;
  prefersReducedMotion: boolean;
  /** Optional external control of the active item, for a page-owned nav
   * control to drive selection from outside this component instead of
   * duplicating it (about-shared-card-stack-adoption's own "no duplicate
   * index state or competing navigation engine" requirement) — mirrors
   * AbstractPostDock's own activeIndex/onActiveIndexChange controlled-prop
   * pair. Omitted by every existing caller (unchanged behavior): with
   * `activeItemIndex` undefined, Card Stack's selection stays exactly as
   * uncontrolled as it always was. */
  activeItemIndex?: number;
  /** Fires whenever the active item changes, from any source (gesture,
   * swipe, arrow, dwell, or an external `activeItemIndex` set above) — the
   * outbound half of the same pair. */
  onActiveItemIndexChange?: (index: number) => void;
};

/**
 * The stack-mode render tree (PLAN-VERTICAL-CARD-STACK.md): pages through
 * the full active list (`items` or `secondaryItems`) as a vertical column,
 * filling the available height. Every card instance renders through the
 * caller's own `renderContent` adapter (`cardstack-content-renderer-
 * boundary`) — this component only owns positioning/rotation/scale/opacity
 * around each instance, never its color, gradient, or internal layout.
 *
 * Round 6: the tab row also renders *here* now, not in the parent
 * `SplitColumnCardPreview.tsx` (which still owns it for the flat branch).
 * The card layer is edge-to-edge with the real browser viewport and passes
 * *underneath* the site header (see the `.viewport` z-index below) — for
 * the tabs to sit correctly on top of that same fixed layer instead of
 * competing normal-flow content pushing the layer's start down, they need
 * to live inside it, sharing its geometry and stacking context.
 */
export function CardStack<TItem>({
  items,
  secondaryItems,
  hasItems,
  hasSecondaryItems,
  renderContent,
  swipe,
  headerOffsetPx = 0,
  verticalAlign = 'center',
  verticalPaddingTopClass = 'pt-0',
  verticalPaddingBottomClass = 'pb-0',
  stackConfig,
  physicsConfig,
  cardRadius,
  surfaceColor,
  columnBackgroundColor,
  prefersReducedMotion,
  activeItemIndex,
  onActiveItemIndexChange,
}: CardStackProps<TItem>) {
  const stackGapPx = spacingClassToPx(stackConfig.cardGap);
  const resolvedColumnBackgroundColor = columnBackgroundColor ?? surfaceColor;
  // Neighbor (inactive) card background — 'surface' reproduces the only
  // behavior that existed before this was configurable (the same page
  // surfaceColor prop this component already receives, live), 'transparent'
  // and 'custom' are new. 'column' derives from the wide split column's own
  // color instead of the flat page surface. See SplitColumnCardStackConfig's
  // own doc comment.
  const resolvedNeighborBackgroundColor = stackConfig.neighborBackgroundMode === 'transparent'
    ? 'transparent'
    : stackConfig.neighborBackgroundMode === 'custom'
      ? stackConfig.neighborBackgroundCustomColor
      : stackConfig.neighborBackgroundMode === 'column'
        ? deriveSurfaceColor(resolvedColumnBackgroundColor, stackConfig.neighborBackgroundOffset)
        : surfaceColor;
  // Neighbor text/topic-border color — 'custom' (default) is
  // stackConfig.neighborText*/neighborTopicBorderColor verbatim (today's
  // only behavior). 'column' derives both from the wide column's own color
  // via a WCAG-contrast-aware search, substituting the wide column's color
  // as the contrast target when the neighbor's own background is literally
  // 'transparent' (uncheckable for contrast) — the wide column's color is
  // what's actually visible through the transparent perimeter either way.
  const neighborTextContrastTarget = resolvedNeighborBackgroundColor === 'transparent'
    ? resolvedColumnBackgroundColor
    : resolvedNeighborBackgroundColor;
  const resolvedNeighborTextColor = stackConfig.neighborTextColorMode === 'column'
    ? resolveContrastAwareTextColor(
      neighborTextContrastTarget, stackConfig.neighborTextMinContrast, stackConfig.neighborTextOffset,
    )
    : stackConfig.neighborTextColor;
  const resolvedNeighborTopicBorderColor = stackConfig.neighborTextColorMode === 'column'
    ? resolveContrastAwareTextColor(
      neighborTextContrastTarget, stackConfig.neighborTextMinContrast, stackConfig.neighborTextOffset,
    )
    : stackConfig.neighborTopicBorderColor;
  // The card's own outer border (AbstractJournalLabCollection.tsx's own
  // stackNeutralSurface) — the exact same resolvedNeighborTextColor, at
  // reduced opacity (deriveTransparentTint), not a second independent
  // derivation from the column background. Previously ran through
  // deriveSurfaceColor (an HSL lighten/darken shift) instead, which
  // produced a visibly different tint rather than the same ink faded out —
  // deriveSurfaceColor was reused here only because it was already the
  // codebase's one surface-derivation primitive at the time, not because
  // its lighten/darken semantics were actually what neighborBorderColorOffset
  // (default 0.38, i.e. 38% opacity — "62% transparent") was meant to
  // express. Distinct
  // from resolvedNeighborTopicBorderColor above (the small topic-pill's own
  // border, which tracks the contrast-aware search directly, never the text
  // color's own value).
  const resolvedNeighborCardBorderColor = deriveTransparentTint(
    resolvedNeighborTextColor, stackConfig.neighborBorderColorOffset,
  );
  // Same base color, a separate alpha — the settled-neighbor hover swap
  // (CardStackSlot.tsx's own isHovered state, hover-capable devices only)
  // reads this instead of resolvedNeighborCardBorderColor above while the
  // pointer is genuinely resting on the card, so operator tuning of one
  // state can never accidentally retune the other (operator ask:
  // "segregate the variable").
  const resolvedNeighborCardBorderHoverColor = deriveTransparentTint(
    resolvedNeighborTextColor, stackConfig.neighborBorderHoverOpacity,
  );
  const {
    anchorRef, cardWidthPx, cardHeightPx, rowPitchPx, aboveCount, belowCount,
    fixedLeftPx, fixedTopPx, fixedWidthPx, fixedHeightPx, pageWidthPx,
    anchorViewportLeftPx, browserWidthPx, headerBottomPx,
    stacked,
  } = useCardStackLayout(stackGapPx, headerOffsetPx);
  // Gutter below the header's own real bottom edge, not a hardcoded guess
  // from the layer's own top — see useCardStackLayout's "tabs/arrows vs.
  // the header's hit-box" doc comment for why a fixed offset silently
  // became unclickable once the header gained an explicit stacking level
  // above this layer.
  const contentTopPx = headerBottomPx + 24;
  // The tab row below is `position: absolute` inside `.column`, itself
  // inside `.viewport` (`position: fixed`, `top: fixedTopPx`) — so its own
  // containing block already sits `fixedTopPx` down the real viewport.
  // `contentTopPx` is a viewport-absolute value (headerBottomPx is a real
  // getBoundingClientRect().bottom), so using it verbatim as that row's
  // *local* `top` double-counts fixedTopPx once the card column opts into
  // `pushDown` (fixedTopPx > 0) — it rendered correctly only by coincidence
  // while fixedTopPx was always 0. The arrow group below doesn't need this:
  // `.arrowGroup` is `position: fixed` itself (see CardStack.module.css),
  // so its own `top: contentTopPx` already resolves against the true
  // viewport directly, same as before.
  const tabRowTopPx = contentTopPx - fixedTopPx;
  const arrowGroupLeftPx = resolveCardStackArrowGroupLeft({
    fixedLeftPx,
    fixedWidthPx,
    pageWidthPx,
  });

  const itemCount = swipe.renderedList === 'articles' ? items.length : secondaryItems.length;
  // Stacked-mode override (fixes wide-column vertical align doing nothing —
  // or worse, pushing the card off-screen — below the 768px stacked
  // breakpoint, at every tier/align combination). Two compounding bugs,
  // both only manifesting once stacked:
  //
  // 1. fixedHeightPx is always the real window.innerHeight (see
  //    useCardStackLayout's own doc comment — deliberately generous, so
  //    enough neighbor rows render to fill the screen once scrolled into
  //    view). At >=768px that number legitimately IS the box .viewport
  //    centers within, because .viewport is position:fixed to the true
  //    viewport there. Once stacked, ABSTRACT-01 (2026-08-20-139d957)
  //    switched .viewport to position:absolute, anchored to its own in-flow
  //    position instead of the viewport — but this offset calculation kept
  //    using the same fixedHeightPx as if it still meant "the real visible
  //    viewport," so 'center'/'end' computed an offset equal to roughly
  //    half the *full window height* below wherever the anchor happens to
  //    sit after the narrow column's own content scrolls past it, pushing
  //    the active card (and every neighbor row with it) far below the fold.
  //    Once stacked, the layer is a normal-flow, scrolling element, not a
  //    fixed full-viewport overlay — there is no equivalent "extra vertical
  //    space to distribute" for 'center'/'end' to mean anything sane, so
  //    alignment collapses to 'start' (flush with the anchor's own top,
  //    same as it always visually was pre-ABSTRACT-01, when .viewport was
  //    still fixed and 'stacked' didn't exist as a distinct case).
  //
  // 2. paddingTopPx/paddingBottomPx (verticalPaddingTopClass/-BottomClass,
  //    resolvedWideColumnPaddingTop/-Bottom in pages/abstract.tsx) exist
  //    specifically so *ColumnContentPaddingTop/Bottom can reach this
  //    position:fixed layer, which sits fully outside document flow and
  //    therefore can't inherit padding from any ancestor the normal CSS way
  //    — this JS-side term is the *only* channel that config reaches it
  //    through at >=768px. Once stacked (position:absolute, back in normal
  //    flow), the wide column's own real Tailwind padding-top class
  //    (buildWideColumnClassName, components/PolymorphicLayout.tsx) already
  //    pushes the zero-height anchor itself down by that same configured
  //    amount — applying this JS-side term too double-counts it. Zeroing
  //    both here once stacked leaves the anchor's own already-correctly-
  //    padded position as the sole source of that spacing.
  //
  // Confirmed via a live measurement sweep: mobile pre-fix topGap 727px /
  // bottomGap -341px (341px of the card rendered below the viewport
  // bottom, on top of a real, visible ~150px dead gap above it from the
  // double-counted padding) vs. flush-with-anchor (~0 extra gap beyond the
  // real padding, no overflow) after both fixes — every tablet/desktop
  // width and align value unaffected (stacked is false there).
  const verticalOffsetPx = resolveCardStackVerticalOffsetPx({
    align: stacked ? 'start' : verticalAlign,
    fixedHeightPx,
    cardHeightPx,
    paddingTopPx: stacked ? 0 : spacingClassToPx(verticalPaddingTopClass),
    paddingBottomPx: stacked ? 0 : spacingClassToPx(verticalPaddingBottomClass),
  });
  // ABSTRACT-03 fix, part 2 (2026-08-20-139d957): the active card's own
  // real top edge, viewport-relative — derived the same way CardStackSlot's
  // own translateY math already positions the card (translateLayer sits at
  // `.viewport`'s vertical center, fixedTopPx + fixedHeightPx/2, then
  // verticalOffsetPx shifts that center per verticalAlign, then the card's
  // own height is subtracted back out to find its top edge). Verified
  // against a live diagnostics capture (tablet-portrait: computed 448px,
  // measured activeCard.top 448px — exact match) before wiring this in,
  // after a first attempt (fixedTopPx + 24, the `.viewport` layer's own
  // top rather than the active card's) was tried and found to make the gap
  // *larger*, not smaller, since fixedTopPx sits well above the vertically-
  // centered active card, not at it. Only used to reposition the arrow
  // group's own top when its horizontal placement has already clamped to
  // the card's top-right corner (see resolveCardStackArrowGroupLeft's own
  // "generous gutter" branch) — the group should sit just above the card
  // it now visually attaches to in that case, not near the header.
  //
  // Excluded when `stacked` (ABSTRACT-01, this same run): fixedTopPx there
  // is anchor-relative (0, per useCardStackLayout's own `stacked` doc
  // comment), not viewport-relative like the rest of this formula assumes,
  // so activeCardTopPx would under-measure by however far the anchor sits
  // down the real page — confirmed via a live diagnostics capture at
  // mobile-compact (activeCardTopPx computed far above the card's own real
  // 941px top). The pre-existing contentTopPx placement at that tier was
  // already verified clean by an earlier critic pass (RSP-01) and stays
  // untouched rather than risk a wrong, unverified card-relative value.
  const activeCardTopPx = fixedTopPx + fixedHeightPx / 2 + verticalOffsetPx - cardHeightPx / 2;
  const arrowGroupTopPx = stacked || stackNavHasGenerousGutter({ fixedLeftPx, pageWidthPx })
    ? contentTopPx
    : Math.max(contentTopPx, activeCardTopPx - STACK_NAV_GROUP_HEIGHT_PX - STACK_NAV_EDGE_GUTTER_PX);

  // Embla owns touch motion below 768px and does not use this fallback. The
  // stacked value remains for the narrow fine-pointer keyboard path, which
  // keeps the existing CSS step transition and the generic swipe timing.
  const stepTransitionFallbackMs = prefersReducedMotion
    ? 0
    : stacked
      ? stackConfig.swipeDurationMs + TRANSITION_FALLBACK_BUFFER_MS
      : Math.max(
          stackConfig.stepTiltDurationMs,
          stackConfig.stepTranslateDurationMs,
          stackConfig.neighborPoseDurationMs,
        )
        + stackConfig.stepStaggerMs * Math.max(aboveCount, belowCount)
        + TRANSITION_FALLBACK_BUFFER_MS;
  const step = useStackStepMotion({
    itemCount,
    resetKey: swipe.renderedList,
    transitionFallbackMs: stepTransitionFallbackMs,
    prefersReducedMotion,
  });
  const touchCarouselCapable = useTouchCarouselCapability();
  const mobileEmblaActive = stacked && touchCarouselCapable;
  const mobileEmbla = useMobileCardStackEmbla({
    active: mobileEmblaActive,
    itemCount,
    resetKey: swipe.renderedList,
    config: stackConfig,
    prefersReducedMotion,
    alignOffsetPx: anchorViewportLeftPx,
    onSelect: step.syncTo,
  });

  // The release velocity (px/ms) of whichever wheel/pointer gesture most
  // recently committed a step — null for a keyboard-triggered step, which
  // has no gesture to read. Feeds resolveStackStepDurationMs below so a
  // fast flick's own step animation can settle sooner than a slow drag's
  // (PLAN-CARDSTACK-DESKTOP-MOTION-CONTINUITY.md, finding 4/plan item 4).
  const [gestureCommitVelocityPxPerMs, setGestureCommitVelocityPxPerMs] = useState<number | null>(null);
  const handleGestureAdvance = useCallback((velocityPxPerMs?: number | null) => {
    setGestureCommitVelocityPxPerMs(velocityPxPerMs ?? null);
    step.advance();
    // step.advance is independently memoized inside useStackStepMotion
    // (stable across renders); step itself is a fresh object literal every
    // render, matching handleStackKeyDown's own established pattern below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.advance]);
  const handleGestureRetreat = useCallback((velocityPxPerMs?: number | null) => {
    setGestureCommitVelocityPxPerMs(velocityPxPerMs ?? null);
    step.retreat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.retreat]);

  // Fine-pointer narrow navigation keeps the pre-Embla keyboard transition.
  // Touch renders the stable Embla slide collection instead, so this state
  // machine is explicitly skipped and can never become a second owner.
  const stackedHorizontalStep = useStackHorizontalStepTransition({
    activeItemIndex: step.activeItemIndex,
    durationMs: prefersReducedMotion ? 0 : stackConfig.swipeDurationMs,
    easingCss: CTA_BUTTON_MOTION_EASINGS[stackConfig.swipeEasing],
    prefersReducedMotion,
    skipTransition: mobileEmblaActive,
  });
  const effectiveActiveItemIndex = mobileEmblaActive
    ? mobileEmbla.selectedIndex
    : stacked
      ? stackedHorizontalStep.renderedItemIndex
      : step.activeItemIndex;

  // The outbound half of the optional external-control pair (see
  // CardStackProps.activeItemIndex's own doc comment) — reports every real
  // active-index change, from any source, so a page-owned nav control can
  // mirror it without this component needing to know that control exists.
  useEffect(() => {
    onActiveItemIndexChange?.(effectiveActiveItemIndex);
  }, [effectiveActiveItemIndex, onActiveItemIndexChange]);

  // The inbound half: when a caller supplies `activeItemIndex` and it
  // genuinely diverges from this component's own current selection, drive
  // whichever engine currently owns navigation to it — exactly the same
  // jump `onPromote` already triggers internally, just invoked from outside.
  //
  // REGRESSION FIXED HERE (found live on /about, 2026-08-23 — see
  // POSTMORTEM-ABOUT-SHARED-CARD-STACK-AGENTIC-FLOW.md and PLAN-ABOUT-
  // SHARED-CARD-STACK.md's own "Round 5"): `effectiveActiveItemIndex` was
  // originally included in this effect's own dependency array, on the
  // (wrong) theory stated in the comment that used to sit here — "once the
  // jump lands, effectiveActiveItemIndex reports back out equal to the
  // caller's own activeItemIndex, so this effect's own condition goes false
  // on the next render." That reasoning missed the actual render ordering:
  // the *outbound* effect above and this *inbound* effect both react to the
  // same render, but the caller's own `activeItemIndex` prop can only catch
  // up on a *later* render, once the outbound report round-trips through
  // the caller's own state and back down as a new prop. In the render
  // immediately after a real, user-driven swipe, `effectiveActiveItemIndex`
  // already reflects the new position while `activeItemIndex` (the prop)
  // still holds the *previous* one — with `effectiveActiveItemIndex` in the
  // deps, that transient mismatch re-ran this effect immediately and jumped
  // the carousel *backward* to the stale prop value, fighting the swipe
  // that had just landed. Confirmed live: /about's mobile Card Stack
  // (the only real caller of this prop pair — /abstract's own
  // SplitColumnCardPreview.tsx never passes it) jittered/got stuck between
  // two slides on repeated swipes; removing `activeItemIndex`/
  // `onActiveItemIndexChange` from that one call site made it step cleanly,
  // isolating the cause to this effect. `effectiveActiveItemIndex` is still
  // read here (for the "are we already there" bail-out) — it must just not
  // be a dependency, so this effect only *runs* when the external
  // `activeItemIndex` prop itself changes (a genuine caller-initiated jump
  // command), never merely because internal navigation moved on its own.
  useEffect(() => {
    if (activeItemIndex === undefined || activeItemIndex === effectiveActiveItemIndex) return;
    if (mobileEmblaActive) mobileEmbla.scrollTo(activeItemIndex);
    else step.jumpTo(activeItemIndex);
    // effectiveActiveItemIndex is deliberately excluded (see the comment
    // above — including it is the exact regression this fixed).
    // mobileEmbla/step are fresh object literals every render (their own
    // individual methods are already independently memoized) — depending on
    // them directly here would rerun this effect every render for no
    // correctness benefit, matching handleStackKeyDown's own established
    // pattern just below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItemIndex, mobileEmblaActive]);

  // Cursor-intent navigation (PLAN: Card Stack cursor-intent navigation) —
  // hasHoverPointer is a device capability check ((hover: hover) and
  // (pointer: fine)): those devices use direct neighbor-card promotion and
  // never render arrows. Touch/coarse-pointer devices render the explicit
  // fallback only when showArrowControlsEnabled is on; while it is off,
  // the arrow group is omitted on every device. cursorIntentEnabled remains
  // limited to the ambient dwell timer (see CardStackSlot.tsx).
  const hasHoverPointer = useHasHoverPointer();
  // Keyboard replacement for the arrow buttons this feature hides on
  // hover-capable devices — wired unconditionally (harmless, and still
  // useful on a touch+keyboard hybrid device even where arrows remain
  // visible).
  const handleStackKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    // ArrowLeft/ArrowRight are the mobile-relevant pair below 768px (see
    // cardstack-mobile-horizontal-swipe's own acceptance criteria) — wired
    // alongside, not instead of, ArrowUp/ArrowDown, since a keyboard has no
    // axis-conflict the touch/gesture layer does and both remain harmless
    // on every device.
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      if (mobileEmblaActive) mobileEmbla.scrollNext();
      else {
        // No gesture velocity behind a keyboard step — always the full
        // configured duration (resolveStackStepDurationMs's own null case).
        setGestureCommitVelocityPxPerMs(null);
        step.advance();
      }
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      if (mobileEmblaActive) mobileEmbla.scrollPrev();
      else {
        setGestureCommitVelocityPxPerMs(null);
        step.retreat();
      }
    }
    // step.advance/step.retreat are each independently memoized inside
    // useStackStepMotion (stable across renders); step itself is a fresh
    // object literal every render, so depending on it directly here would
    // recreate this callback every render for no correctness benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileEmbla.scrollNext, mobileEmbla.scrollPrev, mobileEmblaActive, step.advance, step.retreat]);

  const otherList: StackListKey = swipe.activeList === 'articles' ? 'labs' : 'articles';
  // stackConfig.tabsVisible gates this too, not just the tab row's own
  // rendering below — otherwise turning the switcher off would still leave
  // an undiscoverable horizontal-drag path to the other list, contradicting
  // what "off" is supposed to mean (see that field's own doc comment).
  const otherListHasContent = stackConfig.tabsVisible
    && (otherList === 'articles' ? hasItems : hasSecondaryItems);

  // cardstack-mobile-list-switch-resolution: below 768px, horizontal drag
  // is repurposed for card-to-card stepping (the parent story's own core
  // ask) instead of the Articles/Labs list switch — the two can't coexist
  // on the same gesture axis, and this codebase is articles-only on mobile
  // today (otherListHasContent is already false there in practice), so
  // stepping wins unconditionally once stacked rather than adding a new
  // conflict-resolution mechanism. Desktop/tablet keep the original list
  // switch, untouched.
  const handleHorizontalGestureCommit = useCallback((direction: 1 | -1) => {
    if (!otherListHasContent) return;
    swipe.selectList(otherList, direction);
  }, [otherList, otherListHasContent, swipe]);

  // The committed step's own effective translate duration — velocity-scaled
  // when a real gesture triggered it (resolveStackStepDurationMs above),
  // otherwise the full configured stepTranslateDurationMs. Shared by both
  // the outer gesture-preview wrapper's settle transition below and each
  // CardStackSlot's own translateLayer, so the two layers animate over
  // identical windows instead of the wrapper handing off to a differently-
  // timed inner transition (PLAN-CARDSTACK-DESKTOP-MOTION-CONTINUITY.md,
  // findings 1-2 — gestureSettleDurationMs previously read
  // min(stepTiltDurationMs, swipeDurationMs), neither of which is the
  // duration the row it's supposed to be synchronized with actually uses).
  const effectiveStepTranslateDurationMs = resolveStackStepDurationMs({
    baseDurationMs: stackConfig.stepTranslateDurationMs,
    velocityScalingEnabled: stackConfig.stepVelocityScalingEnabled,
    minDurationScale: stackConfig.stepSettleMinDurationScale,
    maxFlickVelocityPxPerMs: stackConfig.stepVelocityMaxFlickPxPerMs,
    velocityPxPerMs: gestureCommitVelocityPxPerMs,
  });
  const gestureSettleDurationMs = prefersReducedMotion ? 0 : effectiveStepTranslateDurationMs;
  const gestureSettleEasingCss = CTA_BUTTON_MOTION_EASINGS[stackConfig.stepTranslateEasing];
  const gesture = useStackGestureNavigation({
    // Embla receives every narrow touch drag. This legacy gesture owner is
    // retained only for the established >=768px vertical/list-switch paths.
    verticalGesturesEnabled: stacked ? false : stackConfig.verticalGesturesEnabled,
    horizontalGestureEnabled: stacked ? false : otherListHasContent,
    canAdvance: step.canAdvance,
    canRetreat: step.canRetreat,
    isTransitioning: step.isTransitioning || swipe.transitioning,
    commitThresholdPx: stackConfig.stepCommitThresholdPx,
    directionLockThresholdPx: DIRECTION_LOCK_THRESHOLD_PX,
    settleDurationMs: gestureSettleDurationMs,
    horizontalPreviewEnabled: false,
    horizontalPreviewThresholdPx: 0,
    horizontalPreviewRangePx: 1,
    horizontalCommitDistancePx: 0,
    horizontalCommitDurationMs: 0,
    horizontalEdgeSpringEnabled: false,
    edgeResistancePercent: 0,
    edgeMaxDisplacementPx: 0,
    edgeSpringStiffness: 220,
    edgeSpringDamping: 20,
    edgeSpringMaxDurationMs: 0,
    verticalEdgeSpringEnabled: stackConfig.verticalEdgeSpringEnabled,
    verticalEdgeSpringStiffness: stackConfig.verticalEdgeSpringStiffness,
    verticalEdgeSpringDamping: stackConfig.verticalEdgeSpringDamping,
    verticalEdgeSpringMaxDurationMs: stackConfig.verticalEdgeSpringMaxDurationMs,
    onAdvance: handleGestureAdvance,
    onRetreat: handleGestureRetreat,
    onHorizontalCommit: handleHorizontalGestureCommit,
  });

  // aboveCount/belowCount already include their own margin (see
  // useCardStackLayout's own doc comment) — rows past what's actually
  // visible are simply clipped by .viewport's overflow:hidden, which is
  // also what makes a step-triggered entry/exit animate smoothly instead
  // of popping in, since the entering row is typically already mounted
  // just past the clipped edge.
  const visibleSlots = useMemo(() => {
    const slots: Array<{ offset: number; itemIndex: number }> = [];
    for (let offset = -aboveCount; offset <= belowCount; offset += 1) {
      const itemIndex = effectiveActiveItemIndex + offset;
      if (itemIndex < 0 || itemIndex >= itemCount) continue;
      slots.push({ offset, itemIndex });
    }
    return slots;
  }, [aboveCount, belowCount, effectiveActiveItemIndex, itemCount]);

  // The completion signal must come from a slot that existed before and
  // after the index change. The outermost post-step slot is often a newly
  // mounted offscreen buffer and therefore has no previous transform from
  // which a CSS transition (and transitionend) could originate. Among the
  // persisted slots, the largest final |offset| owns the longest stagger.
  const transitionCompletionItemIndex = useMemo(() => {
    if (!step.isTransitioning || step.transitionFromIndex === null) return null;
    const previousFirst = Math.max(0, step.transitionFromIndex - aboveCount);
    const previousLast = Math.min(
      itemCount - 1,
      step.transitionFromIndex + belowCount,
    );
    const persistedSlots = visibleSlots.filter(({ itemIndex }) => (
      itemIndex >= previousFirst && itemIndex <= previousLast
    ));
    return persistedSlots.reduce<{ itemIndex: number; distance: number } | null>(
      (sentinel, slot) => {
        const distance = Math.abs(slot.offset);
        return !sentinel || distance > sentinel.distance
          ? { itemIndex: slot.itemIndex, distance }
          : sentinel;
      },
      null,
    )?.itemIndex ?? null;
  }, [
    aboveCount,
    belowCount,
    itemCount,
    step.isTransitioning,
    step.transitionFromIndex,
    visibleSlots,
  ]);

  const tiltEasingCss = CTA_BUTTON_MOTION_EASINGS[stackConfig.stepTiltEasing];
  const translateEasingCss = CTA_BUTTON_MOTION_EASINGS[stackConfig.stepTranslateEasing];
  const settleOpacityEasingCss = CTA_BUTTON_MOTION_EASINGS[stackConfig.neighborSettleOpacityEasing];
  const neighborGradientRevealEasingCss = CTA_BUTTON_MOTION_EASINGS[stackConfig.neighborGradientRevealEasing];
  const neighborShadowFadeEasingCss = CTA_BUTTON_MOTION_EASINGS[stackConfig.neighborShadowFadeEasing];
  const neighborPoseEasingCss = CTA_BUTTON_MOTION_EASINGS[stackConfig.neighborPoseEasing];

  // Embla's container is never given this style. This wrapper remains the
  // desktop list-switch surface and the narrow fine-pointer keyboard path.
  let swipeWrapperStyle: CSSProperties = stacked ? stackedHorizontalStep.style : swipe.style;
  if (gesture.activeAxis === 'horizontal') {
    const horizontalTransition = gesture.isSettling
      ? gesture.settlingMode === 'css'
          ? `transform ${gestureSettleDurationMs}ms ${gestureSettleEasingCss}`
          : 'none'
      : 'none';
    swipeWrapperStyle = {
      transform: `translateX(${gesture.horizontalOffsetPx}px)`,
      opacity: 1,
      transition: horizontalTransition,
    };
  } else if (gesture.activeAxis === 'vertical') {
    swipeWrapperStyle = {
      transform: `translateY(${gesture.verticalOffsetPx}px)`,
      opacity: 1,
      transition: gesture.isSettling && gesture.settlingMode === 'css'
        ? `transform ${gestureSettleDurationMs}ms ${translateEasingCss}`
        : 'none',
    };
  }

  // The old fine-pointer CSS slide still needs one-card clip room. On touch,
  // Embla's clip spans the browser width while its slides retain the measured
  // card-column width; this is what makes the configured separation visible
  // without changing the card's own layout width.
  const stackedHorizontalClipMarginPx = stacked && !mobileEmblaActive ? fixedWidthPx : 0;
  const viewportLeftPx = mobileEmblaActive
    ? -anchorViewportLeftPx
    : stacked
      ? -stackedHorizontalClipMarginPx
      : 0;
  const viewportWidthPx = mobileEmblaActive
    ? browserWidthPx
    : pageWidthPx + stackedHorizontalClipMarginPx * 2;
  const columnLeftPx = mobileEmblaActive ? 0 : fixedLeftPx + stackedHorizontalClipMarginPx;
  const columnWidthPx = mobileEmblaActive ? browserWidthPx : fixedWidthPx;
  const mobileCarouselRightInsetPx = Math.max(
    0,
    browserWidthPx - anchorViewportLeftPx - fixedWidthPx,
  );
  const mobileCarouselGapPx = spacingClassToPx(stackConfig.mobileCarouselGap);

  /** Creates the one unmodified CardStackSlot tree used by ordinary stack
   * rows and the mobile incoming-card preview alike. The preview is visually
   * active but deliberately not semantically current: the live region and
   * `data-card-stack-active` remain attached to exactly one committed card. */
  function renderStackSlot(itemIndex: number, offset: number, keyPrefix: string, preview = false) {
    const pose = resolveStackSlotPose(offset, stackConfig);
    const interactive = !preview && offset === 0 && !step.isTransitioning
      && (!stacked || !stackedHorizontalStep.transitioning);
    const stackSlotAnimating = !preview && step.isTransitioning;
    // Narrower than stackSlotAnimating (true for every visible slot during
    // any step): only the card leaving offset 0 and the card arriving at
    // offset 0 actually cross the neighbor/active boundary this step — a
    // neighbor merely moving to a new offset while staying inactive
    // throughout never flips presentationState, so it shouldn't play a
    // boundary-crossing-only effect either (see CardStackContentRenderProps
    // .stackPresentationTransitioning's own doc comment).
    const stackPresentationTransitioning = stackSlotAnimating
      && (itemIndex === effectiveActiveItemIndex || itemIndex === step.transitionFromIndex);
    const stackNeighborSettled = !preview && offset !== 0 && !step.isTransitioning;
    const staggerMs = preview ? 0 : stackConfig.stepStaggerMs * Math.abs(offset);
    const translateY = offset * rowPitchPx;
    const item = swipe.renderedList === 'articles'
      ? items[itemIndex]
      : secondaryItems[itemIndex];

    if (!item || cardWidthPx <= 0) return null;

    return (
      <CardStackSlot<TItem>
        key={`${keyPrefix}-${swipe.renderedList}-${itemIndex}`}
        offset={offset}
        itemIndex={itemIndex}
        isCurrentActive={!preview && offset === 0}
        presentationState={offset === 0 ? 'active' : 'inactive'}
        pose={pose}
        staggerMs={staggerMs}
        translateY={translateY}
        interactive={interactive}
        stackSlotAnimating={stackSlotAnimating}
        stackPresentationTransitioning={stackPresentationTransitioning}
        stackNeighborSettled={stackNeighborSettled}
        motionCompletionSentinel={!preview && itemIndex === transitionCompletionItemIndex}
        onMotionComplete={step.finishTransition}
        item={item}
        renderContent={renderContent}
        stacked={stacked}
        cardWidthPx={cardWidthPx}
        cardHeightPx={cardHeightPx}
        aboveCount={aboveCount}
        belowCount={belowCount}
        physicsConfig={physicsConfig}
        stackConfig={stackConfig}
        tiltEasingCss={tiltEasingCss}
        translateEasingCss={translateEasingCss}
        translateDurationMs={effectiveStepTranslateDurationMs}
        gradientRevealEasingCss={neighborGradientRevealEasingCss}
        shadowFadeEasingCss={neighborShadowFadeEasingCss}
        poseEasingCss={neighborPoseEasingCss}
        settleOpacityEasingCss={settleOpacityEasingCss}
        resolvedNeighborBackgroundColor={resolvedNeighborBackgroundColor}
        resolvedNeighborTextColor={resolvedNeighborTextColor}
        resolvedNeighborTopicBorderColor={resolvedNeighborTopicBorderColor}
        resolvedNeighborCardBorderColor={resolvedNeighborCardBorderColor}
        resolvedNeighborCardBorderHoverColor={resolvedNeighborCardBorderHoverColor}
        prefersReducedMotion={prefersReducedMotion}
        cardRadius={cardRadius}
        hasHoverPointer={hasHoverPointer}
        onPromote={step.jumpTo}
      />
    );
  }

  // A normal-flow marker — contributes ~0 height to the page at >=768px
  // (its one child, .viewport, is `position: fixed` there and therefore
  // outside flow, floating over whatever real content is already on
  // screen, by design). Its own Tailwind-class-constrained width/left feed
  // the fixed layer's horizontal geometry (see useCardStackLayout's own doc
  // comment for why that requires live getBoundingClientRect measurement,
  // not a CSS percentage). Card width comes from resolveStackCardWidthClass
  // — each tier's cardWidth token, unless that tier's matching legacy-width
  // toggle overrides it back to the original fixed width (see config/stack.ts).
  //
  // Once stacked, though, `.viewport` is `position: absolute` instead (see
  // its own inline `position` doc comment below) — a normal-flow document
  // element again, just anchored to this marker instead of the viewport.
  // CSS never lets an out-of-flow (absolute/fixed) descendant contribute to
  // an in-flow ancestor's own height, so this marker staying "contributes
  // ~0 height" even once stacked left every ancestor up to <body> believing
  // nothing occupies the card's own real, correctly-sized cardHeightPx-tall
  // footprint — including whichever light, page-surface-colored box was
  // painting the narrow/wide column's own background. Content and
  // background alike, downstream in normal document flow, picked up again
  // immediately after this marker instead of after the card's own visible
  // bottom edge, exposing raw `<body>` (bg-slate-950, dark) underneath the
  // card for that unreserved stretch (operator-reported, 2026-08-26:
  // screenshot showed the card floating over a dark rectangle despite both
  // columns being configured light). Giving the marker a real height,
  // matching the card's own live-measured cardHeightPx, once stacked closes
  // that gap — cheap and safe since 'start' is already the only alignment
  // stacked mode ever resolves to (see verticalOffsetPx above), so the
  // active card already renders flush with this marker's own top edge with
  // nothing else expecting the marker to stay zero-height.
  return (
    <div
      ref={anchorRef}
      data-card-stack-width-anchor="true"
      className={`relative ${resolveStackCardWidthClass(stackConfig)} mx-auto`}
      style={stacked && cardHeightPx > 0 ? { height: `${cardHeightPx}px` } : undefined}
    >
      {fixedWidthPx > 0 ? (
        <>
        <div
          className={styles.viewport}
          style={{
            // ABSTRACT-01 fix (2026-08-20-139d957): below the 768px
            // stacked breakpoint the two columns render top to bottom in
            // normal document flow instead of side by side (see
            // useCardStackLayout's own `stacked` doc comment) — anchoring
            // this layer to the true browser viewport (`position: fixed`)
            // at that point necessarily overlaps whatever normal-flow
            // narrow-column content the page has already scrolled past,
            // confirmed by a fresh Stage 0 baseline (mobile-compact/mobile
            // 'top' and 'middle-card' evidence: card visibly overlapping
            // the headline/body copy). `position: absolute` anchors this
            // layer to its own normal-flow anchor element instead (the
            // wrapper div just above, already `position: relative`),
            // which sits at exactly the wide column's own in-flow
            // position — second in DOM order below the narrow column's
            // content by default (stackedColumnOrder: 'narrowFirst') —
            // so the card renders directly below the headline/body text
            // instead of floating over it. fixedTopPx/fixedLeftPx are
            // already 0 in stacked mode (useCardStackLayout resolves
            // this layer's own geometry relative to the anchor, not the
            // viewport, once stacked) — unchanged here, just no longer
            // viewport-relative once position flips to absolute.
            position: stacked ? 'absolute' : 'fixed',
            top: `${fixedTopPx}px`,
            // Round 9: full page width, not the card column's own width —
            // see this class's own doc comment in CardStack.module.css for
            // why (this element only clips *vertically* now; horizontal
            // clipping was the actual, long-misdiagnosed source of rotated
            // neighbor cards getting cut off at their column-edge overshoot).
            // In stacked mode pageWidthPx already collapses to the anchor's
            // own width (useCardStackLayout) since there's no separate
            // "wider than the column" concern once this layer's own clip
            // boundary is the anchor's box, not the full page. Widened
            // further (viewportLeftPx/viewportWidthPx, see this
            // component's own doc comment above) once stacked, to give
            // the new horizontal slide room to travel without being
            // clipped mid-transition — inert (viewportLeftPx 0,
            // viewportWidthPx === pageWidthPx) whenever !stacked.
            left: `${viewportLeftPx}px`,
            width: `${viewportWidthPx}px`,
            height: `${fixedHeightPx}px`,
            // No top clip — the stack spans the true, full viewport, edge to
            // edge, top to bottom, with cards passing *behind* the header
            // (z-index below it, see PLAN-VERTICAL-CARD-STACK.md's own
            // round-4/round-10 verification: a receding card's gradient
            // rendering legibly behind the header's nav text was the
            // originally requested and screenshot-verified behavior). An
            // undocumented later change clipped this fixed layer's own top
            // edge at the header's bottom instead — removed here as a
            // regression against that spec, not a new departure. If a given
            // colorSource/split-band combination ever makes the header's own
            // nav text hard to read over a bright card underneath, use
            // SplitColumnLayoutConfig's own legibilityScrimEnabled (off by
            // default) rather than reintroducing a clip. Stacked mode no
            // longer needs to pass under the header at all (the layer no
            // longer spans the header's own space — it starts at the
            // anchor's own in-flow position, already below the narrow
            // column's content), so this z-index only matters at >=768px in
            // practice, but stays unconditional since it's harmless either
            // way (no header content ever overlaps this layer once stacked).
            zIndex: 1,
          }}
        >
          {/* The hit-testable card column, at the same geometry `.viewport`
              itself used before round 9 — see CardStack.module.css's
              `.viewport`/`.column` doc comments for why this split exists. */}
          <div
            className={styles.column}
            style={{ left: `${columnLeftPx}px`, width: `${columnWidthPx}px` }}
          >
          {stackConfig.tabsVisible ? (
            <div
              className={tabStyles.tabs}
              role="tablist"
              aria-label="Journal collection preview"
              style={{ position: 'absolute', top: `${tabRowTopPx}px`, left: '1.5rem', zIndex: 30 }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={swipe.activeList === 'articles'}
                className={tabStyles.tab}
                disabled={!hasItems}
                onClick={() => swipe.selectList('articles', -1)}
              >
                Articles
              </button>
              <span aria-hidden="true" className={tabStyles.separator}>|</span>
              <button
                type="button"
                role="tab"
                aria-selected={swipe.activeList === 'labs'}
                className={tabStyles.tab}
                disabled={!hasSecondaryItems}
                onClick={() => swipe.selectList('labs', 1)}
              >
                Labs
              </button>
            </div>
          ) : null}
          <div
            ref={mobileEmblaActive ? mobileEmbla.viewportRef : gesture.surfaceRef}
            className={mobileEmblaActive
              ? `${styles.swipeSurface} ${styles.emblaViewport}`
              : styles.swipeSurface}
            style={mobileEmblaActive ? undefined : {
              ...swipeWrapperStyle,
              touchAction: stacked ? 'pan-y' : gesture.touchAction,
            } as CSSProperties}
            tabIndex={0}
            role="group"
            aria-label="Card stack — use arrow keys, scroll, or swipe to browse"
            data-gesture-axis={mobileEmblaActive ? undefined : gesture.activeAxis ?? undefined}
            data-gesture-dragging={mobileEmblaActive ? undefined : gesture.isDragging || undefined}
            data-gesture-settling={mobileEmblaActive ? undefined : gesture.isSettling || undefined}
            data-card-stack-mobile-engine={mobileEmblaActive ? 'embla' : undefined}
            data-card-stack-embla-ready={mobileEmblaActive && mobileEmbla.ready ? 'true' : undefined}
            data-card-stack-embla-snap-count={mobileEmblaActive ? mobileEmbla.snapCount : undefined}
            data-card-stack-motion-owner={mobileEmblaActive ? 'embla' : undefined}
            data-card-stack-mobile-embla-config={mobileEmblaActive
              ? JSON.stringify(mobileEmbla.runtimeConfig)
              : undefined}
            data-card-stack-embla-viewport={mobileEmblaActive ? 'true' : undefined}
            onPointerDown={mobileEmblaActive ? undefined : gesture.onPointerDown}
            onPointerMove={mobileEmblaActive ? undefined : gesture.onPointerMove}
            onPointerUp={mobileEmblaActive ? undefined : gesture.onPointerUp}
            onPointerCancel={mobileEmblaActive ? undefined : gesture.onPointerCancel}
            onTransitionEnd={mobileEmblaActive ? undefined : gesture.onTransitionEnd}
            onClickCapture={mobileEmblaActive ? undefined : gesture.onClickCapture}
            onKeyDown={handleStackKeyDown}
          >
          {mobileEmblaActive ? (
            <div
              className={styles.emblaContainer}
              data-card-stack-embla-container="true"
              style={{
                paddingLeft: `${anchorViewportLeftPx}px`,
              }}
            >
              {Array.from({ length: itemCount }, (_, itemIndex) => (
                <div
                  key={`embla-${swipe.renderedList}-${itemIndex}`}
                  className={styles.emblaSlide}
                  data-card-stack-embla-slide={itemIndex}
                  style={{
                    // The separation is part of the measured slide advance,
                    // not a flex-container gap. It applies only before a
                    // following slide, so the terminal card has no phantom
                    // trailing gap for Embla to trim into a left offset.
                    flexBasis: `${resolveMobileEmblaSlideBasisPx({
                      cardWidthPx: fixedWidthPx,
                      gapPx: mobileCarouselGapPx,
                      itemIndex,
                      itemCount,
                    })}px`,
                    // Embla reads an end gap from the final slide's margin,
                    // not the flex container's padding. Keep the physical
                    // right inset here so trimSnaps can settle the final
                    // card at the same horizontal position as every other.
                    marginRight: itemIndex === itemCount - 1
                      ? `${mobileCarouselRightInsetPx}px`
                      : undefined,
                  }}
                >
                  <div
                    className={styles.rows}
                    style={{
                      width: `${fixedWidthPx}px`,
                      transform: `translateY(${verticalOffsetPx}px)`,
                    }}
                    data-card-stack-embla-card="true"
                  >
                    {renderStackSlot(
                      itemIndex,
                      0,
                      'embla',
                      itemIndex !== effectiveActiveItemIndex,
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div
            className={styles.rows}
            style={{ transform: `translateY(${verticalOffsetPx}px)` }}
          >
            {visibleSlots.map(({ offset, itemIndex }) => {
              const pose = resolveStackSlotPose(offset, stackConfig);
              // Also gated on the horizontal slide's own transitioning flag
              // once stacked — that state machine runs independently of
              // step.isTransitioning (see useStackHorizontalStepTransition's
              // own doc comment), so without this a card mid-slide would
              // stay "interactive" (hover-tilt live) through the animation.
              const interactive = offset === 0 && !step.isTransitioning
                && (!stacked || !stackedHorizontalStep.transitioning);
              // Round 14 (PLAN-VERTICAL-CARD-STACK.md): three real states a
              // slot's own tilt/proximity engine can be in, keyed off
              // `step.isTransitioning` alone, not `offset` at all — every
              // currently-visible slot's own offset (and therefore its own
              // translate/rotate/scale pose) changes on *every* step, so
              // every one of them is animating for the duration of a step,
              // not just the ones nearest the active slot:
              //   - step.isTransitioning: this slot's own bounding box is
              //     being translated/scaled by the scripted stack motion
              //     right now, *regardless of which direction it's headed*
              //     (arriving at the active slot or leaving it) — freezes
              //     the engine (hold current tilt exactly, no further
              //     movement). Round 13 only froze the *leaving* case
              //     (`offset !== 0 && isTransitioning`); the *arriving*
              //     case (`offset === 0 && isTransitioning`) was left fully
              //     live, which computed real proximity against that same
              //     kind of moving box and produced the identical
              //     artifact — a visibly erratic, non-monotonic swing, not
              //     the smooth arrival the card's own settled position
              //     would otherwise get.
              //   - !isTransitioning && offset !== 0 (stackNeighborSettled):
              //     disables the engine, easing the frozen tilt smoothly to
              //     0 via its own release envelope.
              //   - !isTransitioning && offset === 0 (interactive): fully
              //     live — this is the only state that was ever correct to
              //     leave untouched.
              const stackSlotAnimating = step.isTransitioning;
              // See renderStackSlot's own identical computation and
              // CardStackContentRenderProps.stackPresentationTransitioning's
              // doc comment — only the two slots actually crossing the
              // neighbor/active boundary this step get this, not every
              // visible slot merely moving to a new offset.
              const stackPresentationTransitioning = stackSlotAnimating
                && (itemIndex === effectiveActiveItemIndex || itemIndex === step.transitionFromIndex);
              const stackNeighborSettled = offset !== 0 && !step.isTransitioning;
              const staggerMs = stackConfig.stepStaggerMs * Math.abs(offset);
              const translateY = offset * rowPitchPx;

              const item = swipe.renderedList === 'articles'
                ? items[itemIndex]
                : secondaryItems[itemIndex];

              if (!item || cardWidthPx <= 0) return null;

              return (
                <CardStackSlot<TItem>
                  key={`${swipe.renderedList}-${itemIndex}`}
                  offset={offset}
                  itemIndex={itemIndex}
                  pose={pose}
                  staggerMs={staggerMs}
                  translateY={translateY}
                  interactive={interactive}
                  stackSlotAnimating={stackSlotAnimating}
                  stackPresentationTransitioning={stackPresentationTransitioning}
                  stackNeighborSettled={stackNeighborSettled}
                  motionCompletionSentinel={itemIndex === transitionCompletionItemIndex}
                  onMotionComplete={step.finishTransition}
                  item={item}
                  renderContent={renderContent}
                  stacked={stacked}
                  cardWidthPx={cardWidthPx}
                  cardHeightPx={cardHeightPx}
                  aboveCount={aboveCount}
                  belowCount={belowCount}
                  physicsConfig={physicsConfig}
                  stackConfig={stackConfig}
                  tiltEasingCss={tiltEasingCss}
                  translateEasingCss={translateEasingCss}
                  translateDurationMs={effectiveStepTranslateDurationMs}
                  gradientRevealEasingCss={neighborGradientRevealEasingCss}
        shadowFadeEasingCss={neighborShadowFadeEasingCss}
        poseEasingCss={neighborPoseEasingCss}
                  settleOpacityEasingCss={settleOpacityEasingCss}
                  resolvedNeighborBackgroundColor={resolvedNeighborBackgroundColor}
                  resolvedNeighborTextColor={resolvedNeighborTextColor}
                  resolvedNeighborTopicBorderColor={resolvedNeighborTopicBorderColor}
        resolvedNeighborCardBorderColor={resolvedNeighborCardBorderColor}
        resolvedNeighborCardBorderHoverColor={resolvedNeighborCardBorderHoverColor}
                  prefersReducedMotion={prefersReducedMotion}
                  cardRadius={cardRadius}
                  hasHoverPointer={hasHoverPointer}
                  onPromote={step.jumpTo}
                />
              );
            })}
          </div>
          )}
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {itemCount > 0
              ? `Card ${(mobileEmblaActive ? mobileEmbla.selectedIndex : step.activeItemIndex) + 1} of ${itemCount}`
              : 'No cards available'}
          </span>
          </div>
          </div>
        </div>
        {/* Round 8: moved out of .viewport entirely (was overlapping the
            active card's own content — .viewport's overflow:hidden also
            clipped it against the card region's own edge) and into the
            open gutter to the left of the card column, near the tabs' own
            vertical position — a separate `position: fixed` element, not a
            child of .viewport, so it's never clipped by that container's
            overflow:hidden. Round 9 (found while re-verifying, not
            originally reported): `top` uses the same real, measured
            `contentTopPx` the tab row is *derived from*, not `fixedTopPx +
            24` — see useCardStackLayout's "tabs/arrows vs. the header's
            hit-box" doc comment for why a hardcoded top offset silently
            made this unclickable once the header (needed above .viewport
            for cards to pass underneath it) also started winning
            hit-testing over anything positioned at that same guessed
            height. Unlike the tab row, this element genuinely wants
            `contentTopPx` verbatim, not `tabRowTopPx` — `.arrowGroup` is
            `position: fixed` (CardStack.module.css), so it's already
            viewport-absolute and never inherits fixedTopPx from a
            containing block the way the tab row's `.column` ancestor
            does. */}
        {/* showArrowControlsEnabled is a render gate, not a CSS visibility
            treatment: when off, neither the group nor either button is
            mounted at any device size. With it on, the prior capability-
            aware behavior remains — hover/fine pointers navigate directly
            through neighbor cards, while coarse/no-hover devices get this
            explicit fallback. */}
        {stackConfig.showArrowControlsEnabled && !hasHoverPointer ? (
          <div
            className={styles.arrowGroup}
            data-card-stack-navigation="true"
            style={{
              top: `${arrowGroupTopPx}px`,
              left: `${arrowGroupLeftPx}px`,
            }}
          >
            <StackNavArrowButton
              direction="up"
              ariaLabel="Show the previous card"
              disabled={!(mobileEmblaActive ? mobileEmbla.canScrollPrev : step.canRetreat)
                || swipe.transitioning}
              onClick={mobileEmblaActive ? mobileEmbla.scrollPrev : step.retreat}
              sizePx={stackConfig.arrowSizePx}
              idleColor={stackConfig.arrowIdleColor}
              hoverColor={stackConfig.arrowHoverColor}
              idleOpacity={stackConfig.arrowIdleOpacity}
              hoverOpacity={stackConfig.arrowHoverOpacity}
              disabledOpacity={stackConfig.arrowDisabledOpacity}
              hoverTransitionMs={stackConfig.arrowHoverTransitionMs}
              hoverEasing={stackConfig.arrowHoverEasing}
              mouseOutTransitionMs={stackConfig.arrowMouseOutTransitionMs}
              mouseOutEasing={stackConfig.arrowMouseOutEasing}
            />
            <StackNavArrowButton
              direction="down"
              ariaLabel="Show the next card"
              disabled={!(mobileEmblaActive ? mobileEmbla.canScrollNext : step.canAdvance)
                || swipe.transitioning}
              onClick={mobileEmblaActive ? mobileEmbla.scrollNext : step.advance}
              sizePx={stackConfig.arrowSizePx}
              idleColor={stackConfig.arrowIdleColor}
              hoverColor={stackConfig.arrowHoverColor}
              idleOpacity={stackConfig.arrowIdleOpacity}
              hoverOpacity={stackConfig.arrowHoverOpacity}
              disabledOpacity={stackConfig.arrowDisabledOpacity}
              hoverTransitionMs={stackConfig.arrowHoverTransitionMs}
              hoverEasing={stackConfig.arrowHoverEasing}
              mouseOutTransitionMs={stackConfig.arrowMouseOutTransitionMs}
              mouseOutEasing={stackConfig.arrowMouseOutEasing}
            />
          </div>
        ) : null}
        </>
      ) : null}
    </div>
  );
}
