import { useEffect, useRef } from 'react';

export type SpacefieldParallaxOffset = { x: number; y: number };

/**
 * Viewport-scoped normalized pointer position (-1..1 from center on each
 * axis), damped toward its target with an exponential response — read
 * directly off the returned ref by SpacefieldBackground's own render loop
 * each frame, not via React state (a re-render per mousemove would defeat
 * the point of the ref-based physics convention this codebase already uses
 * elsewhere, e.g. components/proximity/useCardLiftPhysics.ts). Touch input
 * is ignored (no hover to parallax against) and the offset relaxes to
 * (0, 0) whenever the pointer leaves the window, on reduced-motion, or
 * while the tab is hidden — this hook's own small loop pauses in that last
 * case rather than burning rAF cycles in a background tab.
 */
export function useSpacefieldParallax({
  responseMs,
  respectReducedMotion,
  enabled,
}: {
  responseMs: number;
  respectReducedMotion: boolean;
  enabled: boolean;
}) {
  const offsetRef = useRef<SpacefieldParallaxOffset>({ x: 0, y: 0 });
  const targetRef = useRef<SpacefieldParallaxOffset>({ x: 0, y: 0 });
  const responseMsRef = useRef(responseMs);
  responseMsRef.current = responseMs;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      offsetRef.current = { x: 0, y: 0 };
      return undefined;
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let motionDisabled = respectReducedMotion && reducedMotionQuery.matches;
    let animationFrame = 0;
    let lastFrame = performance.now();

    const scheduleFrame = () => {
      if (!animationFrame && !document.hidden) animationFrame = window.requestAnimationFrame(animate);
    };

    const animate = (now: number) => {
      animationFrame = 0;
      const elapsed = Math.max(0, now - lastFrame);
      lastFrame = now;
      const target = motionDisabled ? { x: 0, y: 0 } : targetRef.current;
      const responseMsValue = Math.max(0, responseMsRef.current);
      const response = responseMsValue === 0 ? 1 : 1 - Math.exp(-elapsed / responseMsValue);
      const current = offsetRef.current;
      current.x += (target.x - current.x) * response;
      current.y += (target.y - current.y) * response;
      if (Math.abs(target.x - current.x) > 0.0005 || Math.abs(target.y - current.y) > 0.0005) {
        scheduleFrame();
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      targetRef.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
      lastFrame = performance.now();
      scheduleFrame();
    };

    const relaxToCenter = () => {
      targetRef.current = { x: 0, y: 0 };
      lastFrame = performance.now();
      scheduleFrame();
    };

    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      motionDisabled = respectReducedMotion && event.matches;
      lastFrame = performance.now();
      scheduleFrame();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        lastFrame = performance.now();
        scheduleFrame();
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', relaxToCenter, { passive: true });
    window.addEventListener('blur', relaxToCenter);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    reducedMotionQuery.addEventListener?.('change', handleReducedMotionChange);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', relaxToCenter);
      window.removeEventListener('blur', relaxToCenter);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      reducedMotionQuery.removeEventListener?.('change', handleReducedMotionChange);
    };
  }, [enabled, respectReducedMotion]);

  return offsetRef;
}
