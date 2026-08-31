import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { SliderContentSlide } from '../../../helpers/postContent';
import type { LiquidSliderConfig } from '../../abstract/components/AbstractPostDock/config/legacy';
import type { AbstractPostDockPaletteConfig } from '../../abstract/components/AbstractPostDock/config/registered';
import { useLiquidSliderMotion } from '../../abstract/components/AbstractPostDock/hooks/motion';
import { buildDeckPaletteStates } from '../../abstract/helpers/deckPalette';
import { AboutMobileAccordionItem } from './AboutMobileAccordionItem';
import type { AboutMobileAccordionConfig } from './AboutMobileAccordion.config';

/**
 * PLAN-ABOUT-MOBILE-ACCORDION.md — the mobile (below-md) replacement for
 * `AboutMobileCardStack` on `/about`. A real, standard accordion: discrete
 * expanded/collapsed state per item (a `Set`, not a single index — more
 * than two items can be open at once, `config.maxExpandedItems` permitting),
 * not the desktop dock's single-`activeIndex` magnification model. Owns
 * that expand state locally rather than lifting it into
 * `AboutSlidesContext` — that context's `activeIndex` is a single-index
 * shape built for the desktop engine's single-active-slide concept, the
 * wrong fit for a multi-expand Set.
 */
export function AboutMobileAccordion({
  slides,
  gradientConfig,
  paletteConfig,
  config,
  dimOpacity,
  emphasisOpacity,
  prefersReducedMotion,
  onActiveIndexChange,
}: {
  slides: ReadonlyArray<SliderContentSlide>;
  gradientConfig: LiquidSliderConfig;
  paletteConfig: AbstractPostDockPaletteConfig;
  config: AboutMobileAccordionConfig;
  dimOpacity: number;
  emphasisOpacity: number;
  prefersReducedMotion: boolean;
  /** Kept loosely in sync (most-recently-toggled-open index) so
   * `AboutSlidesContext.activeIndex` stays sane if the viewport crosses
   * back over the mobile breakpoint mid-session — nothing on mobile itself
   * reads it for navigation (the nav arrows are hidden while this component
   * is mounted; see pages/about.tsx). */
  onActiveIndexChange: (index: number) => void;
}) {
  // [0]: the first item opens by default on a fresh load (operator ask) —
  // every other index-driven consumer of this array (toggle's own FIFO
  // cap/eviction logic below) treats an already-populated initial array no
  // differently than one built up via taps, so no other wiring needed.
  const [expandedIndices, setExpandedIndices] = useState<ReadonlyArray<number>>([0]);
  const motion = useLiquidSliderMotion(gradientConfig);

  // Operator ask: the page itself must never scroll — pages/about.module
  // .css's own .splitRight rule now gives this component real, fixed
  // height (calc(100dvh - navH), overflow: hidden) instead of sizing to
  // content, specifically so this accordion can fill "the rest of the
  // screen" below the header. That fixed height is a hard ceiling, though:
  // an expanded item whose content is taller than what's left over would,
  // without a cap, still grow the accordion (and the page) past it. This
  // ref/effect pair measures the real STATIC part of the remaining budget
  // — the column's own height minus every header's own (uniform) height —
  // shared by every item; see itemHeightsRef/perExpandedItemCap below for
  // the LIVE part (how that budget is actually divided moment to moment).
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Only one representative header is measured, not all of them — every
  // item shares the exact same config-driven previewMinHeight/
  // affordancePadding, so every header already renders at the same real
  // height; summing N identical measurements would be no more accurate
  // than one measurement times N.
  const firstHeaderRef = useRef<HTMLButtonElement | null>(null);
  const [totalContentBudgetPx, setTotalContentBudgetPx] = useState<number | undefined>(undefined);

  const recomputeContentBudget = useCallback(() => {
    const container = containerRef.current;
    const header = firstHeaderRef.current;
    if (!container || !header) return;
    const containerHeightPx = container.getBoundingClientRect().height;
    const headerHeightPx = header.getBoundingClientRect().height;
    const totalHeaderHeightPx = headerHeightPx * slides.length;
    setTotalContentBudgetPx(Math.max(0, containerHeightPx - totalHeaderHeightPx));
  }, [slides.length]);

  // useLayoutEffect, not useEffect: runs before the browser paints, so the
  // very first render of a default-expanded item (index 0, see
  // expandedIndices' own initial value above) already has a real cap in
  // place — an useEffect-timed measurement would let that first paint
  // happen uncapped for one frame, then visibly snap down once the
  // measurement caught up, exactly the kind of jump this whole feature
  // exists to avoid (components/useExpandableHeight.ts's own doc comment).
  useLayoutEffect(() => {
    recomputeContentBudget();
  }, [recomputeContentBudget]);

  useEffect(() => {
    const container = containerRef.current;
    const header = firstHeaderRef.current;
    if (!container || !header) return undefined;
    // Viewport resize/orientation change resizes the column itself
    // (pages/about.module.css's own calc(100dvh - navH)) without any of
    // this component's own props changing — only a live observer on the
    // container (not just the recomputeContentBudget dependency array
    // above) catches that.
    const observer = new ResizeObserver(recomputeContentBudget);
    observer.observe(container);
    observer.observe(header);
    return () => observer.disconnect();
  }, [recomputeContentBudget]);

  // Bug fix (operator report, four rounds): the fixed budget above must be
  // split between whichever item(s) are expanded so their COMBINED
  // rendered height equals it at every instant of a swap's transition, not
  // just at rest. This plain once-per-toggle equal divide
  // (contentBudgetPx / expandedIndices.length) is exact under this
  // component's default `maxExpandedItems: 1` — exactly one item is ever
  // expanded, so the closing item's target is always 0 and the opening
  // item's target is always the full budget. That was never the actual
  // bug; three earlier attempts all misdiagnosed it as a budget-sharing
  // problem when it was really a frame-timing one inside
  // useExpandableHeight — see that hook's own doc comment for the full
  // history (an open/close asymmetry that caused a transient overshoot
  // ["spring"], a "fix" that delayed both sides and starved the open path
  // entirely, and a live cross-reporting attempt that chased a moving
  // target instead of running one clean curve). The real fix was making
  // both the open and close paths call `setHeight` synchronously, in the
  // same effect pass — with the SAME duration/easing and exactly
  // complementary targets (0 and the shared budget) computed here,
  // `closing(t) + opening(t) = budget` holds by construction at every
  // instant, purely from the browser's own CSS-transition timing-function
  // math. `collapseLeadFraction` stays `0` (simultaneous swap) by default
  // now that this is fixed at the root.
  const perExpandedItemCap = useMemo(() => {
    if (typeof totalContentBudgetPx !== 'number') return undefined;
    return totalContentBudgetPx / Math.max(1, expandedIndices.length);
  }, [totalContentBudgetPx, expandedIndices.length]);

  // No single "active" slide in a multi-expand accordion — activeIndex:
  // null (the same reference-call shape pages/about.tsx's own
  // topSegmentPaletteState uses) so every row's palette state is uniform,
  // config-derived, and never index-dependent duck/chroma treatment meant
  // for a single highlighted slide.
  // tier: 'mobile' explicitly, not the default parameter — this component
  // only ever mounts below md (see its own doc comment above), so 'mobile'
  // is always correct here, but PLAN-DOCK-PALETTE-CONFIG-SEGREGATION.md's
  // audit found the same buildDeckPaletteStates call missing an explicit
  // tier in two other, genuinely multi-breakpoint call sites (View.tsx,
  // pages/about.tsx's own topSegmentPaletteState) where relying on the
  // default silently applied the wrong tier — making it explicit here too,
  // even though it happens to already be correct, so a reader auditing
  // this call site never has to re-derive that same "is this one safe?"
  // reasoning again.
  const paletteStates = useMemo(
    () => buildDeckPaletteStates({ slides, paletteConfig, activeIndex: null, tier: 'mobile' }),
    [slides, paletteConfig],
  );

  // Pending "this index is about to expand, but is waiting out
  // config.collapseLeadFraction of the item(s) it displaced" timers —
  // keyed by index so a rapid re-toggle of the same item can cancel its own
  // still-pending open. Cleared on unmount so a late timer never fires
  // setState on an unmounted component.
  const pendingExpandTimeoutsRef = useRef<Map<number, number>>(new Map());
  useEffect(() => () => {
    pendingExpandTimeoutsRef.current.forEach(timeoutId => window.clearTimeout(timeoutId));
    pendingExpandTimeoutsRef.current.clear();
  }, []);

  // Applies maxExpandedItems' own FIFO cap to a candidate "next" array —
  // shared between the immediate (uncontested) open path below and the
  // delayed-open timer's own fire-time re-check, so a second rapid open
  // that lands *during* another item's pending stagger still respects the
  // cap instead of the stale timer blindly appending past it.
  const applyExpandCap = useCallback((next: ReadonlyArray<number>) => {
    const overflow = config.maxExpandedItems > 0
      ? next.length - config.maxExpandedItems
      : 0;
    return overflow > 0 ? next.slice(overflow) : next;
  }, [config.maxExpandedItems]);

  const toggle = useCallback((index: number) => {
    const pending = pendingExpandTimeoutsRef.current.get(index);
    if (pending) {
      window.clearTimeout(pending);
      pendingExpandTimeoutsRef.current.delete(index);
    }

    setExpandedIndices((current) => {
      if (current.includes(index)) {
        // Bug fix (operator report, screenshot): `maxExpandedItems: 1` is
        // documented above (this config's own doc comment) as "an operator
        // who wants a classic single-open accordion sets this to 1" — a
        // classic single-open accordion always has exactly one item open,
        // the same radio-button semantics every reference implementation
        // (Bootstrap, macOS System Preferences, etc.) uses; tapping the
        // only open item's own header is a no-op there, not a close, since
        // there's no "next" item for the selection to fall back to. Without
        // this guard, closing branch above ran unconditionally regardless
        // of maxExpandedItems, so a `1`-cap accordion could be tapped down
        // to every item collapsed — a state a real single-open accordion
        // can never be in. Higher/unlimited caps (maxExpandedItems !== 1)
        // keep their existing behavior unchanged: those don't carry the
        // same "always exactly one" expectation, so an all-collapsed state
        // stays a valid, intentional one for them (e.g. a plain FAQ-style
        // accordion).
        if (config.maxExpandedItems === 1 && current.length <= 1) {
          return current;
        }
        return current.filter(existing => existing !== index);
      }

      // 0 = unlimited. A positive cap evicts the oldest-opened item (FIFO)
      // rather than blocking the tap outright — a tap that visibly does
      // nothing reads as broken.
      const next = [...current, index];
      const overflow = config.maxExpandedItems > 0
        ? next.length - config.maxExpandedItems
        : 0;
      const evicted = overflow > 0 ? next.slice(0, overflow) : [];

      // Nothing displaced (room to spare, or the cap is off) — open
      // immediately, no stagger; there's no collapsing counterpart to lead.
      // Same when motion is off entirely.
      if (evicted.length === 0 || prefersReducedMotion || config.collapseLeadFraction <= 0) {
        return overflow > 0 ? next.slice(overflow) : next;
      }

      // Cognitive-load pass (operator ask, 2026-08-25): don't start the
      // newly-opening item's own height/reveal transition in the same
      // frame as the item(s) it's displacing start collapsing — let the
      // collapse read as its own event first. The evicted item(s) collapse
      // now (removed here, immediately); `index` itself is deliberately
      // left OUT of this returned array and only actually added once the
      // delayed timer below fires, config.collapseLeadFraction *
      // config.transitionMs later.
      const delayMs = config.collapseLeadFraction * config.transitionMs;
      const timeoutId = window.setTimeout(() => {
        pendingExpandTimeoutsRef.current.delete(index);
        setExpandedIndices(latest => (
          latest.includes(index) ? latest : applyExpandCap([...latest, index])
        ));
      }, delayMs);
      pendingExpandTimeoutsRef.current.set(index, timeoutId);

      return current.filter(existing => !evicted.includes(existing));
    });
    onActiveIndexChange(index);
  }, [config.maxExpandedItems, config.collapseLeadFraction, config.transitionMs, prefersReducedMotion, applyExpandCap, onActiveIndexChange]);

  return (
    // h-full + overflow-hidden: fills pages/about.module.css's own
    // .splitRight (now real, fixed height on mobile — see that file's own
    // doc comment) and never scrolls itself; every item's own
    // perExpandedItemCap cap above is what keeps content within that fixed
    // box, so this container itself never needs to grow past it or scroll
    // to reveal overflow.
    <div ref={containerRef} className="flex h-full w-full flex-col overflow-hidden">
      {slides.map((slide, index) => (
        <AboutMobileAccordionItem
          key={slide.id}
          slide={slide}
          palette={paletteStates?.[index] ?? null}
          motion={motion}
          gradientConfig={gradientConfig}
          config={config}
          expanded={expandedIndices.includes(index)}
          onToggle={() => toggle(index)}
          dimOpacity={dimOpacity}
          emphasisOpacity={emphasisOpacity}
          prefersReducedMotion={prefersReducedMotion}
          maxContentHeightPx={expandedIndices.includes(index) ? perExpandedItemCap : undefined}
          headerRef={index === 0 ? (element) => { firstHeaderRef.current = element; } : undefined}
        />
      ))}
    </div>
  );
}
