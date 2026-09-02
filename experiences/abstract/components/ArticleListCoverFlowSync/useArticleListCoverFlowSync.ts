import { useCallback, useEffect, useRef, useState } from 'react';

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
 * Read once on mount to seed the initial index (before either component's
 * own scroll/settle listeners attach, so there's nothing to conflict with
 * yet); written via history.replaceState (never pushState — scrubbing
 * through the carousel shouldn't spam browser history) whenever the active
 * slug changes, debounced past the sync guard's own suppress window so a
 * write never fires for an index about to be superseded by the other
 * side's own settle event a moment later. Hash never calls setActiveIndex
 * itself post-mount — it only ever reads the current activeIndex/slug — so
 * it can't become a third writer fighting the guard above. */
export function useArticleHashSync(
  slugs: readonly string[],
  activeIndex: number,
  setActiveIndex: (index: number, origin: ArticleListCoverFlowSyncOrigin) => void,
) {
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const index = slugs.findIndex((slug) => `article-${slug}` === hash);
    if (index >= 0) setActiveIndex(index, 'hash');
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
}
