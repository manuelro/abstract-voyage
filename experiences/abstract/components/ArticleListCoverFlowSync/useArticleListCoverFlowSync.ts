import { useCallback, useEffect, useRef, useState } from 'react';

export type ArticleListCoverFlowSyncOrigin = 'coverflow' | 'list' | 'external';

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

/** Hash-based navigation removed (operator ask: stop reading/writing
 * `#article-<slug>` on every carousel navigation — no deep-linking, no URL
 * writes). What's left is the entrance-animation-flash guard the old
 * hash-seeding effect also happened to provide: the initially-active card
 * can render fully blank (title/excerpt/CTA opacity 0, ArticleCard
 * .module.css's own `.detailFade`) for roughly a second on a slow
 * hydration/data-fetch — confirmed live on a real device with NO hash
 * involved at all, so this is a general timing guard, not a hash concern.
 * Returning `restored: boolean` — false until one full passive-effect cycle
 * after mount, true forever after — lets a caller (CoverFlow, via its own
 * `suppressEntranceAnimation` prop) apply activeIndex instantly for as long
 * as the real initial value is still being established, with no assumption
 * about how long that takes. */
export function useCoverFlowEntranceGate(): { restored: boolean } {
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    setRestored(true);
  }, []);

  return { restored };
}
