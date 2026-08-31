import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { CTA_BUTTON_MOTION_EASINGS } from '../../../components/CtaButton/config/registered';
import { useExpandableHeight } from '../../../components/useExpandableHeight';
import { resolveAbstractPostDockEasing } from '../../abstract/components/AbstractPostDock/config/registered';
import { abstractPostDockActiveOpacityStyle } from '../../abstract/components/AbstractPostDock/helpers/activeOpacityReveal';
import { renderEmphasisText } from '../../../helpers/textEmphasis';
import type { SliderContentSlide } from '../../../helpers/postContent';
import {
  LiquidGradientAdapter,
  type DeckPaletteState,
} from '../../abstract/components/AbstractPostDock/components/GradientRenderer';
import type { LiquidSliderConfig } from '../../abstract/components/AbstractPostDock/config/legacy';
import type { useLiquidSliderMotion } from '../../abstract/components/AbstractPostDock/hooks/motion';
import { useDockGradientAvailability } from '../../abstract/components/AbstractPostDock/hooks/browserState';
import { resolveAbstractPostDockGradientActivity } from '../../abstract/components/AbstractPostDock/helpers/gradientActivity';
import type { AboutMobileAccordionConfig } from './AboutMobileAccordion.config';
// Shared with AboutSlideNavControl — the same page-owned CSS module every
// other about-experience component's own hover/idle CSS-custom-property
// mechanism already lives in (see .navControlButton's own doc comment for
// the enter-on-:hover/exit-on-base transition trick this file's own
// .accordionAffordance rules reuse verbatim).
import styles from '../../../pages/about.module.css';

// PLAN-ABOUT-MOBILE-ACCORDION.md §9 — forced, not exposed as a config field:
// the gradient must never run a continuous idle-drift/noise loop on this
// page, mobile or desktop. 'static' resolves to 'frozen' in
// resolveAbstractPostDockGradientActivity BEFORE that helper even looks at
// which slide is "active" — a single render per relevant prop change
// (open/close, palette edit), never a per-frame recalculation.
const STATIC_GRADIENT_PERFORMANCE_CONFIG = {
  activityPolicy: 'static' as const,
  pauseWhenOffscreen: true,
  activityPolicyNarrow: 'static' as const,
};

// Content text classes — the collapsed preview must render at the exact
// same font size/config as the expanded paragraph, not a smaller "label"
// treatment, so the two read as the same voice at a different length.
const CONTENT_TEXT_CLASSNAME = 'text-lg leading-relaxed text-white [text-wrap:balance]';

export function AboutMobileAccordionItem({
  slide,
  palette,
  motion,
  gradientConfig,
  config,
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
  expanded: boolean;
  onToggle: () => void;
  dimOpacity: number;
  emphasisOpacity: number;
  prefersReducedMotion: boolean;
  /** Caps this item's own expanded content to at most this many pixels —
   * AboutMobileAccordion's own computed "remaining space below every
   * header" budget (divided across however many items are currently
   * expanded). Once content exceeds it, useExpandableHeight's own
   * `overflow-y: auto` takes over so THIS item scrolls internally, instead
   * of growing past the accordion's own fixed-height column and forcing
   * the page itself to scroll (operator ask: the page must never scroll;
   * only an individual expanded item's own content may). */
  maxContentHeightPx?: number;
  /** Only ever passed for one representative item (AboutMobileAccordion
   * measures a single header's real rendered height, assuming — correctly,
   * since every item shares the same config-driven affordancePadding/
   * previewMinHeight — that every header renders at the same height). */
  headerRef?: (element: HTMLButtonElement | null) => void;
}) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const { isDockVisible, isDocumentVisible } = useDockGradientAvailability(sectionRef, true);
  const activity = resolveAbstractPostDockGradientActivity({
    config: STATIC_GRADIENT_PERFORMANCE_CONFIG,
    isActive: false,
    isDockVisible,
    isDocumentVisible,
  });

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

  // 'accent' mode matches the narrative rows' own always-white text
  // (View.tsx's minimal-mode branch's hardcoded `text-white`) rather than
  // slide.accent itself — the accent color is this row's own background, so
  // outlining the affordance in it would make it disappear against its own
  // row.
  const resolvedAffordanceColor = config.affordanceColorMode === 'custom'
    ? config.affordanceCustomColor
    : '#ffffff';

  // Cognitive-load pass (operator ask, 2026-08-25): the collapsed preview
  // reads as this row's own non-highlighted content text (dimOpacity) —
  // the same opacity the paragraph's own un-emphasized words render at
  // below — and switches to the highlighted/emphasis-word treatment only
  // while the item is actually expanded/"active", exactly mirroring
  // renderEmphasisText's own two-state opacity model instead of a
  // permanently-opaque label. Color itself never changes (text-white,
  // both states) — only opacity does, same as the real emphasis markup.
  const previewTextOpacity = expanded ? emphasisOpacity : dimOpacity;

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
    <div ref={sectionRef} className="relative w-full shrink-0 overflow-hidden" style={{ backgroundColor: slide.accent }}>
      {/* inset-0, not a fixed reference-height box — the gradient must
          cover the item's own real, current height at every moment
          (collapsed AND however tall a given expanded paragraph grows),
          not just a fixed band anchored to the top. Absolutely positioned
          against this outer `relative` box, so it tracks the box's real
          size on every frame of the height transition below, the same way
          any full-bleed background layer would. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <LiquidGradientAdapter
          slide={slide}
          motion={motion}
          config={gradientConfig}
          palette={palette}
          activity={activity}
        />
      </div>

      {/* Normal block flow, NOT a row inside the animated grid below — its
          own height is fixed by previewMinHeight/affordancePadding alone
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
        className={`${styles.accordionHeaderButton} relative z-10 flex w-full items-center justify-between gap-3 text-left ${config.previewMinHeight} ${config.affordancePadding}`}
      >
        <span
          className={`m-0 line-clamp-1 ${CONTENT_TEXT_CLASSNAME}`}
          style={{
            opacity: previewTextOpacity,
            transition: `opacity ${contentSettleWaitMs}ms ${contentEasing}`,
            // A11Y-05 (about-IA-timeline-copy-rework) — see View.tsx's own
            // identical addition for the full doc comment.
            textShadow: 'var(--about-dock-text-shadow, none)',
          }}
        >
          {slide.excerpt}
        </span>
        <span
          aria-hidden="true"
          className={`inline-block shrink-0 ${styles.accordionAffordance} ${config.affordanceDimensionClassName} ${config.affordanceBorderThicknessClassName} ${config.affordanceCornerRadiusClassName}`}
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
      </button>

      <div className="relative z-10" style={wrapperStyle}>
        <div ref={contentRef}>
          <div
            // Same horizontal padding as the header button
            // (config.affordancePadding) — pt-0 only, so the expanded
            // paragraph's own left edge lines up with the preview text's
            // left edge above it (they were previously two independently
            // hand-picked padding values that didn't agree).
            className={`${config.affordancePadding} pt-0`}
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
              className={`relative ${CONTENT_TEXT_CLASSNAME}`}
              style={{ textShadow: 'var(--about-dock-text-shadow, none)' }}
            >
              {renderEmphasisText(slide.title, dimOpacity, emphasisOpacity)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
