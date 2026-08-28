import { useEffect, useState } from 'react';
import { MD_MEDIA_QUERY, LG_MEDIA_QUERY } from './breakpoints';

export type BreakpointTier = 'mobile' | 'md' | 'lg';

export type BreakpointTierState = {
  tier: BreakpointTier;
  /** Live window.innerWidth, tracked alongside tier — needed by any
   * consumer resolving a SplitColumnRatioTier fraction (narrowColumnFractionForTier)
   * into a real pixel boundary at the *current* width, not just a coarse
   * tier (e.g. components/PolymorphicLayout.tsx's own splitBandBoundaryPx
   * resolution). undefined during SSR/first paint, before any measurement
   * has landed — matches this file's own mobile-first tier default in
   * spirit (no value is more honest than a guessed one here). */
  viewportWidthPx: number | undefined;
};

/** Live Tailwind `md`/`lg` breakpoint tier plus the current viewport width
 * in px, same two thresholds this codebase already treats as the
 * split-column breakpoints everywhere else — see components/breakpoints.ts
 * for the one shared source every such consumer now reads from (was
 * previously its own independent hardcoded copy of the same 768px/1024px
 * pair components/SplitColumnPageShell/useSplitColumnNavAlignment.ts also
 * hardcoded separately — see PLAN-CENTRALIZED-BREAKPOINTS-RESPONSIVE-CARD-
 * STACK.md for the full incident). Shared — relocated here from
 * experiences/postsLab/helpers/ (its own former home) since it was always
 * genuinely generic (tracks split-column breakpoints, not posts-lab
 * content), just under the wrong folder; components/PolymorphicLayout.tsx
 * is now its one real internal consumer, used on behalf of every
 * PolymorphicLayoutConfig-integrated page rather than imported directly
 * per page. SSR/first-paint default tier is 'mobile' (matches this repo's
 * mobile-first Tailwind convention elsewhere — an unprefixed class is the
 * base state). */
export function useBreakpointTier(): BreakpointTierState {
  const [state, setState] = useState<BreakpointTierState>({ tier: 'mobile', viewportWidthPx: undefined });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mdQuery = window.matchMedia(MD_MEDIA_QUERY);
    const lgQuery = window.matchMedia(LG_MEDIA_QUERY);
    const resolve = () => setState({
      tier: lgQuery.matches ? 'lg' : mdQuery.matches ? 'md' : 'mobile',
      viewportWidthPx: window.innerWidth,
    });
    resolve();
    mdQuery.addEventListener('change', resolve);
    lgQuery.addEventListener('change', resolve);
    window.addEventListener('resize', resolve);
    return () => {
      mdQuery.removeEventListener('change', resolve);
      lgQuery.removeEventListener('change', resolve);
      window.removeEventListener('resize', resolve);
    };
  }, []);

  return state;
}
