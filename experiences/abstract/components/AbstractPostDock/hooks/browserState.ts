import { useEffect, useLayoutEffect, useState } from 'react';

// Layout effect on the client, plain effect on the server (avoids the SSR warning).
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(media.matches);

    update();
    media.addEventListener?.('change', update);

    return () => {
      media.removeEventListener?.('change', update);
    };
  }, []);

  return prefersReducedMotion;
}

export function useDockGradientAvailability(
  sectionRef: { current: HTMLElement | null },
  pauseWhenOffscreen: boolean,
) {
  const [isDockVisible, setIsDockVisible] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);

  useEffect(() => {
    const updateDocumentVisibility = () => {
      setIsDocumentVisible(document.visibilityState !== 'hidden');
    };

    updateDocumentVisibility();
    document.addEventListener('visibilitychange', updateDocumentVisibility);
    return () => document.removeEventListener('visibilitychange', updateDocumentVisibility);
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!pauseWhenOffscreen || !node || typeof window.IntersectionObserver !== 'function') {
      setIsDockVisible(true);
      return undefined;
    }

    const observer = new window.IntersectionObserver(([entry]) => {
      setIsDockVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio > 0));
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, [pauseWhenOffscreen, sectionRef]);

  return { isDockVisible, isDocumentVisible };
}
