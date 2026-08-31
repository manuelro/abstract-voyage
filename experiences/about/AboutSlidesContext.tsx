import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Owns /about's own slide-navigation state — extracted out of about.tsx's
 * former local `useState` + two `useCallback`s
 * (PLAN-POLYMORPHIC-LAYOUT-CONTENT-CONTAINER-UNIFICATION.md) so two sibling
 * subtrees (the narrow column's own AboutSlideNavControl, the wide column's
 * AbstractPostDock) share this state through a common context instead of
 * about.tsx hand-threading it between them at the page's own top level.
 */
export interface AboutSlidesContextValue {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  goToPrevious: () => void;
  goToNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  /** CMP-05 (about-IA-timeline-copy-rework) — already a provider prop below,
   * just not previously surfaced through the context value itself. Needed
   * by AboutTimeline for `aria-setsize`/keyboard bounds (Home/End, roving
   * tabindex) without that component needing its own separate prop for a
   * number the provider already knows. Additive only — no existing call
   * site changes. */
  slideCount: number;
}

const AboutSlidesContext = createContext<AboutSlidesContextValue | null>(null);

export function AboutSlidesProvider({
  slideCount,
  children,
}: {
  slideCount: number;
  children: ReactNode;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const goToPrevious = useCallback(() => {
    setActiveIndex(index => Math.max(0, index - 1));
  }, []);
  const goToNext = useCallback(() => {
    setActiveIndex(index => Math.min(slideCount - 1, index + 1));
  }, [slideCount]);

  const value = useMemo<AboutSlidesContextValue>(() => ({
    activeIndex,
    setActiveIndex,
    goToPrevious,
    goToNext,
    canGoPrevious: activeIndex > 0,
    canGoNext: activeIndex < slideCount - 1,
    slideCount,
  }), [activeIndex, goToPrevious, goToNext, slideCount]);

  return (
    <AboutSlidesContext.Provider value={value}>
      {children}
    </AboutSlidesContext.Provider>
  );
}

export function useAboutSlides(): AboutSlidesContextValue {
  const context = useContext(AboutSlidesContext);
  if (!context) {
    throw new Error('useAboutSlides must be called within an AboutSlidesProvider');
  }
  return context;
}
