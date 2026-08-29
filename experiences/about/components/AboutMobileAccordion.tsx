import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [expandedIndices, setExpandedIndices] = useState<ReadonlyArray<number>>([]);
  const motion = useLiquidSliderMotion(gradientConfig);

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
    <div className="flex w-full flex-col">
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
        />
      ))}
    </div>
  );
}
