import { useEffect, useState } from 'react';

/**
 * True on devices with a precise, hover-capable pointer (mouse/trackpad) —
 * false for touch/coarse-pointer devices, which have no vertical
 * drag-to-step gesture and therefore keep the explicit arrow buttons as
 * their only way to step through the stack (see CardStack.tsx). Local copy
 * of helpers/usePrefersReducedMotion.ts's own matchMedia-listener shape,
 * not a shared import — this repo's convention (see StackNavArrowButton.tsx)
 * is to copy a pattern into the feature that needs it.
 */
export function useHasHoverPointer(): boolean {
  const [hasHoverPointer, setHasHoverPointer] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const handleChange = () => setHasHoverPointer(mediaQuery.matches);
    handleChange();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return hasHoverPointer;
}
