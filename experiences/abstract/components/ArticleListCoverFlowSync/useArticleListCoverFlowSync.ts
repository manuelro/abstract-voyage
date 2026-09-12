import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export type ArticleListCoverFlowSyncOrigin = 'coverflow' | 'list' | 'hash' | 'external';

export interface ArticleListCoverFlowSyncValue {
  activeIndex: number;
  setActiveIndex: (index: number, origin: ArticleListCoverFlowSyncOrigin) => void;
  itemCount: number;
}

// Roughly CoverFlow's own spring settle time (stiffness: 150, damping: 30,
// mass: 1 — see CoverFlow.tsx's own useSpring call) for a one-step jump.
// Only matters for a *different* index trying to claim the write lock
// mid-settle (a fast double-click/scroll) — the same-index echo case below
// is always a no-op regardless of this window.
const SYNC_SUPPRESS_WINDOW_MS = 400;

/**
 * CMP-06/STA-01..07 — one activeIndex shared between CoverFlow and
 * ArticleList. A plain hook, not a Context (AboutSlidesContext's own
 * pattern, mirrored in shape): there are exactly two consumers, both
 * mounted from the same pages/abstract.tsx scope, so prop-drilling from one
 * call site is simpler than a Provider for a third consumer that doesn't
 * exist yet.
 *
 * The guard: a same-index update is always a no-op (the common case — both
 * sides converging on the same value, which is what breaks the
 * CoverFlow<->ArticleList feedback loop STA-07 warns about). A *different*
 * index from a different origin than whichever origin most recently wrote
 * is additionally suppressed for SYNC_SUPPRESS_WINDOW_MS, so a settle-
 * detection echo arriving while the other side's own programmatic
 * scroll/spring is still animating can't fight it.
 */
export function useArticleListCoverFlowSync(
  itemCount: number,
  initialIndex = 0,
): ArticleListCoverFlowSyncValue {
  const [activeIndex, setActiveIndexRaw] = useState(() => Math.min(Math.max(initialIndex, 0), Math.max(itemCount - 1, 0)));
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const lastOriginRef = useRef<ArticleListCoverFlowSyncOrigin>('external');
  const suppressUntilRef = useRef(0);

  useEffect(() => {
    const maxIndex = Math.max(itemCount - 1, 0);
    if (activeIndexRef.current <= maxIndex) return;
    activeIndexRef.current = maxIndex;
    setActiveIndexRaw(maxIndex);
  }, [itemCount]);

  const setActiveIndex = useCallback((index: number, origin: ArticleListCoverFlowSyncOrigin) => {
    const clamped = Math.min(Math.max(index, 0), Math.max(itemCount - 1, 0));
    if (clamped === activeIndexRef.current) return;
    const now = performance.now();
    if (origin !== lastOriginRef.current && now < suppressUntilRef.current) return;
    lastOriginRef.current = origin;
    suppressUntilRef.current = now + SYNC_SUPPRESS_WINDOW_MS;
    activeIndexRef.current = clamped;
    setActiveIndexRaw(clamped);
  }, [itemCount]);

  return { activeIndex, setActiveIndex, itemCount };
}

/** STA-06 — URL hash reflects the active article (`#article-<slug>`).
 *
 * The mount-seed effect below is deliberately `useLayoutEffect`, not
 * `useEffect`, so the correction (0 -> the real hash-restored index) lands
 * before the browser's first paint — the WRONG index is never visible even
 * for a frame, including in the article list's own selected-row indicator.
 * `activeIndex` itself still always starts at 0 (SSR-safe:
 * `window.location.hash` doesn't exist on the server, so seeding the
 * initial `useState` from it directly would hydration-mismatch whenever
 * the hash names a non-zero article) — a hash-restored index can only ever
 * be known client-side, after mount.
 *
 * That correction is still a genuine 0 -> N *change* from CoverFlow's own
 * point of view, indistinguishable on its own from a real user-driven
 * transition — read naively, it replays the exact same settle-delay +
 * staggered entrance animation a real transition gets: the initially-active
 * card rendered fully blank (title/excerpt/CTA opacity 0, ArticleCard
 * .module.css's own `.detailFade`) for roughly a second on every hash-
 * driven load (screenshot-reported) — and, separately, confirmed live on a
 * real device with NO hash involved at all, where hydration/data-fetch
 * alone was slow enough to reproduce the identical symptom. A timing-based
 * fix in CoverFlow.tsx (a fixed grace window after mount) covered the fast
 * case but not the slow-real-device one — there is no calendar-time bound
 * this hook can promise a caller. Returning `restored: boolean` instead —
 * false until this mount-check has actually run once, true forever after —
 * lets a caller (CoverFlow, via its own `suppressEntranceAnimation` prop)
 * apply activeIndex instantly for as long as the real initial value is
 * still being established, with no assumption about how long that takes. */
export function useArticleHashSync(
  slugs: readonly string[],
  activeIndex: number,
  setActiveIndex: (index: number, origin: ArticleListCoverFlowSyncOrigin) => void,
): { restored: boolean } {
  const seededRef = useRef(false);
  const [restored, setRestored] = useState(false);

  useLayoutEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace(/^#/, '');
    const index = hash ? slugs.findIndex((slug) => `article-${slug}` === hash) : -1;
    if (index >= 0) setActiveIndex(index, 'hash');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deliberately a SEPARATE, plain `useEffect` — not folded into the layout
  // effect above. React guarantees every passive effect across the whole
  // tree fires only after the browser has painted at least once; a layout
  // effect's own state updates (the index correction above) are flushed and
  // painted before that. Setting `restored` here, one effect category later,
  // is what actually gives a consumer (CoverFlow's suppressEntranceAnimation)
  // a full paint cycle with the CORRECTED index while the gate is still
  // open — bundling both into the same effect (tried first) batches them
  // into ONE update, so the gate closes at the exact instant the correction
  // lands and the fix does nothing.
  useEffect(() => {
    setRestored(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const slug = slugs[activeIndex];
    if (!slug) return undefined;
    const nextHash = `#article-${slug}`;
    const timer = window.setTimeout(() => {
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, '', nextHash);
      }
    }, SYNC_SUPPRESS_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, [slugs, activeIndex]);

  return { restored };
}
