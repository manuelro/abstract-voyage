import { useEffect, useRef, useState } from 'react';

/**
 * PLAN-ABOUT-MOBILE-ACCORDION-COLLAPSE-REVEAL-FIX.md — extracted from
 * `View.tsx`'s own original `detailsVisibleIndex` effect (the desktop
 * MagnificationDock engine's "hide immediately, reveal only once the
 * resize has settled" choreography), generalized so both that engine and
 * `AboutMobileAccordionItem`'s own mobile accordion read from the same one
 * implementation instead of the mobile side re-deriving an equivalent by
 * hand.
 *
 * Semantics: whenever `activeKey` changes, the returned value snaps to
 * `hiddenValue` immediately (no delay) — an outgoing card/row's own details
 * disappear the instant it stops being active, well before any accompanying
 * resize/collapse motion has gone far. After `settleMs`, the returned value
 * becomes the new `activeKey` — an incoming card/row's own details stay
 * hidden until its own resize/expand motion has essentially finished, never
 * appearing mid-motion. `prefersReducedMotion` skips both the hide-then-wait
 * choreography and the timer entirely, snapping straight to `activeKey`.
 */
export function useDetailsRevealGate<T>({
  activeKey,
  hiddenValue,
  settleMs,
  prefersReducedMotion,
}: {
  activeKey: T;
  hiddenValue: T;
  settleMs: number;
  prefersReducedMotion: boolean;
}): T {
  const [revealedKey, setRevealedKey] = useState<T>(
    prefersReducedMotion ? activeKey : hiddenValue,
  );
  const timerRef = useRef(0);

  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = 0;
    }

    if (prefersReducedMotion) {
      setRevealedKey(activeKey);
      return undefined;
    }

    setRevealedKey(hiddenValue);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = 0;
      setRevealedKey(activeKey);
    }, settleMs);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = 0;
      }
    };
  }, [activeKey, hiddenValue, prefersReducedMotion, settleMs]);

  return revealedKey;
}
