import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { CTA_BUTTON_MOTION_EASINGS } from '../../../components/CtaButton/config/registered';
import { useExpandableHeight } from '../../../components/useExpandableHeight';
import { resolveAbstractPostDockEasing } from '../../abstract/components/AbstractPostDock/config/registered';
import { abstractPostDockActiveOpacityStyle } from '../../abstract/components/AbstractPostDock/helpers/activeOpacityReveal';
import { renderEmphasisText } from '../../../helpers/textEmphasis';
import { tailwindSpacingTokenToPx } from '../../../components/tailwindSpacingScale';
import type { SliderContentSlide } from '../../../helpers/postContent';
import type { DeckPaletteState } from '../../abstract/components/AbstractPostDock/components/GradientRenderer';
import type { LiquidSliderConfig } from '../../abstract/components/AbstractPostDock/config/legacy';
import type { useLiquidSliderMotion } from '../../abstract/components/AbstractPostDock/hooks/motion';
import type { AboutMobileAccordionConfig } from './AboutMobileAccordion.config';
import { AboutBulletMarker } from './AboutBulletMarker';
// Shared with AboutSlideNavControl — the same page-owned CSS module every
// other about-experience component's own hover/idle CSS-custom-property
// mechanism already lives in (see .navControlButton's own doc comment for
// the enter-on-:hover/exit-on-base transition trick this file's own
// .accordionAffordance rules reuse verbatim).
import styles from '../../../pages/about.module.css';

// Font size (config.contentFontSizeClassName, was a hardcoded `text-lg`)
// shared by BOTH the collapsed preview and the expanded paragraph — the
// two must render at the exact same size/config, not a smaller "label"
// treatment, so they read as the same voice at a different length. Color
// is deliberately absent here (was a hardcoded text-white) — applied via
// the textColor prop's own inline style instead (AboutMobileAccordionConfig
// .textSurfaceOffset, derived from the page's own column background).
function contentTextClassName(config: AboutMobileAccordionConfig) {
  return `${config.contentFontSizeClassName} leading-relaxed [text-wrap:balance]`;
}

export function AboutMobileAccordionItem({
  slide,
  palette,
  motion,
  gradientConfig,
  config,
  textColor,
  expanded,
  onToggle,
  dimOpacity,
  emphasisOpacity,
  prefersReducedMotion,
  maxContentHeightPx,
  headerRef,
}: {
  slide: SliderContentSlide;
  palette: DeckPaletteState | null;
  motion: ReturnType<typeof useLiquidSliderMotion>;
  gradientConfig: LiquidSliderConfig;
  config: AboutMobileAccordionConfig;
  /** AboutMobileAccordion's own derived color (config.textSurfaceOffset
   * applied to the page's columnBackgroundColor) — applied to both the
   * collapsed header preview and the expanded paragraph below. */
  textColor: string;
  expanded: boolean;
  onToggle: () => void;
  dimOpacity: number;
  emphasisOpacity: number;
  prefersReducedMotion: boolean;
  /** Caps this item's own expanded content to at most this many pixels —
   * AboutMobileAccordion's own computed "remaining space below every
   * header, divided evenly across whichever indices are expanded" budget
   * (see that component's own doc comment), computed once per toggle from
   * the FINAL post-toggle `expandedIndices` — not a live per-frame
   * renegotiation. Once content exceeds it, useExpandableHeight's own
   * `overflow-y: auto` takes over so THIS item scrolls internally, instead
   * of growing past the accordion's own fixed-height column and forcing
   * the page itself to scroll (operator ask: the page must never scroll;
   * only an individual expanded item's own content may). */
  maxContentHeightPx?: number;
  /** Only ever passed for one representative item (AboutMobileAccordion
   * measures a single header's real rendered height, assuming — correctly,
   * since every item shares the same config-driven affordancePaddingX/-Y/
   * previewMinHeight — that every header renders at the same height). */
  headerRef?: (element: HTMLButtonElement | null) => void;
}) {
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const heightEasing = resolveAbstractPostDockEasing(config.transitionEasing);
  const contentEasing = resolveAbstractPostDockEasing(config.transitionEasing);
  const affordanceEasing = CTA_BUTTON_MOTION_EASINGS[config.affordanceRotationEasing];
  const heightTransitionMs = prefersReducedMotion ? 0 : config.transitionMs;
  // Preview-label crossfade only (the collapsed excerpt's own dim/highlight
  // opacity switch below) — unrelated to the paragraph reveal, which now
  // uses heightTransitionMs/heightEasing directly (see the audit in
  // PLAN-ABOUT-MOBILE-ACCORDION-COLLAPSE-REVEAL-FIX.md). 0 means "use
  // transitionMs," the same fallback AbstractPostDock/components/View.tsx's
  // own dockContentSettleMs uses, since this is the same shared field.
  const contentSettleWaitMs = prefersReducedMotion
    ? 0
    : config.contentSettleMs > 0 ? config.contentSettleMs : config.transitionMs;
  const affordanceRotationDurationMs = prefersReducedMotion ? 0 : config.affordanceRotationDurationMs;

  // 'accent' mode now matches this row's own resolved text color (textColor
  // — was a hardcoded '#ffffff' matching the narrative rows' own former
  // always-white text) rather than slide.accent itself — the accent color
  // is this row's own background, so outlining the affordance in it would
  // make it disappear against its own row.
  const resolvedAffordanceColor = config.affordanceColorMode === 'custom'
    ? config.affordanceCustomColor
    : textColor;

  // Cognitive-load pass (operator ask, 2026-08-25): the collapsed preview
  // reads as this row's own non-highlighted content text (dimOpacity) —
  // the same opacity the paragraph's own un-emphasized words render at
  // below — and switches to the highlighted/emphasis-word treatment only
  // while the item is actually expanded/"active", exactly mirroring
  // renderEmphasisText's own two-state opacity model instead of a
  // permanently-opaque label. Color itself never changes (text-white,
  // both states) — only opacity does, same as the real emphasis markup.
  const previewTextOpacity = expanded ? emphasisOpacity : dimOpacity;

  // Classic single-open accordion (maxExpandedItems === 1): the chevron
  // exists to invite opening, so once an item IS the open one it has
  // nothing left to invite — fade it out as it rotates rather than leaving
  // it sitting there pointing at content that's already showing. Reuses
  // heightTransitionMs/heightEasing verbatim (the exact same values driving
  // this item's own height/content-opacity transition just above) rather
  // than a new duration, per the operator ask that the fade track the
  // expand/collapse timing, not the chevron's own (faster) rotation speed.
  // Only the opacity's own duration/easing are overridden here — rotation
  // keeps affordanceRotationDurationMs/-Easing untouched. Inactive
  // (maxExpandedItems !== 1, every accordion default) leaves the chevron's
  // opacity entirely to about.module.css's idle/hover mechanism, unchanged.
  const hideChevronOnExpand = config.maxExpandedItems === 1;

  // "Is this the open one" bullet (operator ask, PLAN-ABOUT-MOBILE-
  // ACCORDION-OPEN-INDICATOR.md) — only meaningful for a classic
  // single-open accordion (maxExpandedItems === 1, same gate
  // hideChevronOnExpand above uses): with a higher/unlimited cap, more than
  // one item can be open at once, so no single "the open one" marker
  // language applies. AboutBulletMarker is the exact same hollow/filled
  // circle AboutTimelineRow.tsx's desktop timeline marker uses (extracted,
  // not reimplemented) — sized from config.openIndicatorSizeClassName (the
  // same literal w-N/h-N catalog that component's own markerSizeClassName
  // draws from), filled with this row's own resolved textColor (operator
  // ask: the fill must read as this row's own ink, not a separate accent).
  //
  // Operator fix: a collapsed row must show ONLY the chevron, and an
  // expanded row must show ONLY the filled circle — never both at once.
  // The bullet therefore stays mounted at all times (same
  // "always in the DOM, opacity-driven" shape hideChevronOnExpand already
  // uses for the chevron below) rather than being conditionally unmounted
  // per-toggle: `openIndicatorMountVisible` is a config-level, per-instance
  // constant (never changes while this item is mounted), while `opacity`
  // is the actual per-toggle 0/visible switch, animated over the exact
  // same heightTransitionMs/heightEasing driving the row's own height
  // transition. Since `opacity` and the fill (`background-color`, via
  // `active`) both transition together on the identical duration/easing
  // (AboutBulletMarker.module.css), the bullet fades in ALREADY filled and
  // fades out already fully transparent — collapsed and expanded never
  // visibly overlap mid-transition the way an unmount/remount swap would
  // (which cannot animate a mount at all — the very first frame of a newly
  // mounted element is not itself a transition start).
  const openIndicatorMountVisible = config.openIndicatorEnabled && config.maxExpandedItems === 1;
  const openIndicatorSizePx = tailwindSpacingTokenToPx(config.openIndicatorSizeClassName.split(' ')[0], 10);
  // Explicit px (not a plain Tailwind `w-N h-N` class) on the trailing
  // cluster's own wrapper below — a plain `<span>` is `display: inline` by
  // default, which makes Tailwind width/height classes on it a no-op
  // (confirmed live: the bullet rendered as a 2px-wide sliver instead of a
  // circle). An explicit inline pixel size on a `position: relative` span is
  // what actually gives the two absolutely-positioned children (the bullet
  // and the chevron) a real, definite containing box to center against.
  const affordanceDimensionPx = tailwindSpacingTokenToPx(config.affordanceDimensionClassName.split(' ')[0], 10);

  // Sequential-by-default (not simultaneous) crossfade: whichever of the two
  // is DISAPPEARING starts immediately (0 delay); whichever is APPEARING
  // waits before it starts. config.openIndicatorOverlapFraction (0..1,
  // operator-configurable) is how much of that wait is skipped — `0`
  // (default) waits the disappearing element's ENTIRE heightTransitionMs
  // (today's original "never visibly coexist" behavior), `1` waits none of
  // it (both start at once, a plain crossfade), and anything between
  // linearly shortens the wait. Symmetric in both directions purely because
  // each item computes its own delay from its own `expanded` state — the
  // newly-opening item's chevron-out/bullet-in handover and the
  // newly-closing item's bullet-out/chevron-in handover both read this same
  // fraction, nothing direction-specific to keep in sync. Both elements
  // still share the exact same heightTransitionMs/heightEasing for the
  // transition itself (only the delay before it starts is affected here).
  const openIndicatorHandoverDelayMs = heightTransitionMs * (1 - config.openIndicatorOverlapFraction);
  const openIndicatorTransitionDelayMs = expanded ? openIndicatorHandoverDelayMs : 0;
  const chevronTransitionDelayMs = expanded ? 0 : openIndicatorHandoverDelayMs;

  const { contentRef, wrapperStyle } = useExpandableHeight(
    expanded, heightTransitionMs, heightEasing, maxContentHeightPx,
  );

  return (
    // shrink-0: AboutMobileAccordion's own root is now a fixed-height flex
    // column (pages/about.module.css's real .splitRight height + that
    // component's own h-full) — without this, flexbox's default
    // flex-shrink: 1 would let a transient rounding gap in
    // maxContentHeightPx's own budget math squish every item (including
    // collapsed headers) shorter than their real content, rather than the
    // much safer failure mode this guarantees instead: any leftover
    // overflow simply clips at the container's own overflow-hidden edge
    // (at most the last item's tail becomes invisible), never a squished,
    // illegible header.
    <div ref={sectionRef} className="relative w-full shrink-0 overflow-hidden">
      {/* Normal block flow, NOT a row inside the animated grid below — its
          own height is fixed by previewMinHeight/affordancePaddingX/-Y alone
          and never depends on the expanded content's own size, so it
          cannot be nudged by the height/grid-template-rows transition.
          The chevron and the header text stay pinned to this exact
          y-position whether the item is collapsed or expanded. */}
      {/* items-center: the one thing that has to hold for "chevron and
          header text vertically aligned in the header vertical space" to
          be structurally guaranteed rather than incidental — both the text
          span and the affordance span are direct flex children on this
          row's single cross-axis, so the flexbox algorithm centers them
          against each other regardless of either one's own intrinsic
          height (text line-height vs. the affordance's own small icon
          box). styles.accordionHeaderButton is the hover-target class the
          affordance's own CSS-module hover rule keys off (see
          about.module.css) — hovering anywhere on this row, not just the
          chevron's own small hit area, lights it. */}
      <button
        ref={headerRef}
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`${styles.accordionHeaderButton} relative z-10 flex w-full items-center justify-between gap-3 text-left ${config.previewMinHeight} ${config.affordancePaddingX} ${config.affordancePaddingY}`}
      >
        <span
          className={`m-0 ${config.headerTextWrapEnabled ? '' : 'line-clamp-1'} ${contentTextClassName(config)}`}
          style={{
            color: textColor,
            opacity: previewTextOpacity,
            transition: `opacity ${contentSettleWaitMs}ms ${contentEasing}`,
            // Header/preview text shadow removed (operator ask) — was the
            // same A11Y-05 drop shadow View.tsx's own narrative text uses,
            // tuned for that component's own busy animated mesh backdrop;
            // this row no longer paints one of its own (transparent,
            // AboutMobileAccordionItem.tsx's own background removal), so
            // there's nothing here for the shadow to help legibility
            // against. The expanded paragraph below keeps its own shadow —
            // only this collapsed header label's shadow was reported.
          }}
        >
          {slide.excerpt}
        </span>
        {/* Wrapped with the chevron (rather than a third direct flex child
            of the button above) so the button keeps exactly two direct flex
            children — text on one edge, this trailing cluster on the other
            — which is what makes `justify-between` place them correctly;
            a third top-level child would instead get spread to the middle.
            This wrapper is `position: relative` with an EXPLICIT pixel
            size (affordanceDimensionPx, not a Tailwind `w-N h-N` class — a
            plain `<span>` is `display: inline` by default, which makes
            width/height classes on it a no-op and left the bullet with no
            real box to center against, confirmed live) — both the bullet
            (`overlay` prop — see AboutBulletMarker.tsx's own doc comment
            for why that needs to be an inline style, not a className, to
            reliably beat that component's own `position: relative` module
            rule) and the chevron (`absolute inset-0 m-auto`, no competing
            position rule of its own so a plain className is enough there)
            are centered INSIDE that one box, one directly on top of the
            other, rather than side by side. Centered vertically against the
            header text via the button's own `items-center` (this wrapper
            is one of exactly two flex children there, same as before). */}
        <span
          className="relative shrink-0"
          style={{ width: `${affordanceDimensionPx}px`, height: `${affordanceDimensionPx}px` }}
        >
          {openIndicatorMountVisible ? (
            <AboutBulletMarker
              active={expanded}
              sizePx={openIndicatorSizePx}
              color={textColor}
              // 0 while collapsed — a collapsed row shows ONLY the chevron,
              // never a hollow ring alongside it (operator fix). Fades to
              // emphasisOpacity, already filled, as the row expands — see
              // this component's own openIndicatorMountVisible doc comment
              // above for why staying mounted (not conditionally rendered
              // per-toggle) is what makes that fade actually animate.
              opacity={expanded ? emphasisOpacity : 0}
              // 0 -> 1 grow-in as the row expands (operator ask) — shrinks
              // back to 0 (not just fading transparent in place) as it
              // collapses, matching the opacity/fill transition exactly
              // (same duration/easing/delay).
              scale={expanded ? 1 : 0}
              transitionMs={heightTransitionMs}
              transitionEasingCss={heightEasing}
              transitionDelayMs={openIndicatorTransitionDelayMs}
              overlay
            />
          ) : null}
          <span
            aria-hidden="true"
            className={`absolute inset-0 m-auto ${styles.accordionAffordance} ${config.affordanceDimensionClassName} ${config.affordanceBorderThicknessClassName} ${config.affordanceCornerRadiusClassName}`}
            style={{
              borderColor: resolvedAffordanceColor,
              // Explicit, not left to the (already center-by-default for a
              // plain box) browser default — the rotate must always pivot
              // around the icon's own geometric center, never drift off it
              // as border thickness/corner-radius/dimension are retuned.
              transformOrigin: 'center center',
              transform: `rotate(${expanded ? config.affordanceRotateExpandedDeg : config.affordanceRotateCollapsedDeg}deg)`,
              // Opacity itself (idle + :hover) lives in about.module.css's
              // .accordionAffordance rules, driven entirely by these CSS
              // custom properties — see that rule's own doc comment for why
              // the opacity/transform transitions can't both be expressed as
              // one inline `transition` shorthand without the hover rule's
              // duration override wrongly bleeding onto rotation speed too.
              // hideChevronOnExpand overrides that same opacity transition's
              // duration/easing inline (inline style always outranks the
              // class's own rules, hover included) so it uses
              // heightTransitionMs/heightEasing instead of the mouseout/hover
              // pair — transitionProperty is restated here too since setting
              // any one of these three longhands inline does not fall back to
              // the class's own value for the other two. Only actually forces
              // `opacity: 0` while `expanded`; collapsed still reads its
              // opacity from the class's own idle/hover rule, just animated at
              // this overridden speed.
              ...(hideChevronOnExpand ? {
                transitionProperty: 'opacity, transform',
                transitionDuration: `${heightTransitionMs}ms, ${affordanceRotationDurationMs}ms`,
                transitionTimingFunction: `${heightEasing}, ${affordanceEasing}`,
                // Delay applies to the opacity (disappear/reappear) leg
                // only — rotation (2nd position) always starts at 0 delay,
                // same "sequential crossfade, not simultaneous" stagger the
                // open indicator's own transitionDelayMs uses (operator
                // ask): the chevron fades out immediately as the row
                // expands, but its own reappearance on collapse waits for
                // the indicator to finish shrinking away first.
                transitionDelay: `${chevronTransitionDelayMs}ms, 0ms`,
                ...(expanded ? { opacity: 0 } : {}),
              } : {}),
              '--about-accordion-affordance-idle-opacity': dimOpacity,
              '--about-accordion-affordance-hover-opacity': config.affordanceHoverOpacity,
              '--about-accordion-affordance-rotation-ms': `${affordanceRotationDurationMs}ms`,
              '--about-accordion-affordance-rotation-easing': affordanceEasing,
              '--about-accordion-affordance-hover-ms': `${prefersReducedMotion ? 0 : config.affordanceHoverTransitionMs}ms`,
              '--about-accordion-affordance-hover-easing': CTA_BUTTON_MOTION_EASINGS[config.affordanceHoverEasing],
              '--about-accordion-affordance-mouseout-ms': `${prefersReducedMotion ? 0 : config.affordanceMouseOutTransitionMs}ms`,
              '--about-accordion-affordance-mouseout-easing': CTA_BUTTON_MOTION_EASINGS[config.affordanceMouseOutEasing],
            } as CSSProperties}
          />
        </span>
      </button>

      <div className="relative z-10" style={wrapperStyle}>
        <div ref={contentRef}>
          <div
            // Same horizontal padding as the header button
            // (config.affordancePaddingX) — pt-0 only, so the expanded
            // paragraph's own left edge lines up with the preview text's
            // left edge above it (they were previously two independently
            // hand-picked padding values that didn't agree). affordancePaddingY
            // still contributes its own bottom half (pt-0 only cancels the
            // TOP half of that same vertical value, same "one axis field,
            // one side zeroed" shape this had before affordancePadding was
            // split into X/Y).
            className={`${config.affordancePaddingX} ${config.affordancePaddingY} pt-0`}
            // PLAN-ABOUT-MOBILE-ACCORDION-COLLAPSE-REVEAL-FIX.md — matches
            // the desktop accordion's own audited mechanism exactly
            // (View.tsx's minimal-mode branch): opacity is a direct,
            // ungated function of `expanded`, animated over the *same*
            // duration/easing as the row's own height transition above —
            // no settle delay, no separate fade duration, and (per that
            // same audit) no transform at all. The paragraph stays
            // anchored in place and fades in/out in lockstep with its own
            // row growing/shrinking around it.
            style={abstractPostDockActiveOpacityStyle({
              isActive: expanded,
              transitionMs: heightTransitionMs,
              easingCss: heightEasing,
            })}
          >
            <p
              className={`relative ${contentTextClassName(config)}`}
              style={{ color: textColor }}
            >
              {renderEmphasisText(slide.title, dimOpacity, emphasisOpacity)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
