import { useEffect, useState } from 'react';

/** Positive capability gate for the narrow Card Stack carousel. Absence of
 * hover is not enough: headless/fine-pointer browsers can report hover:none
 * without supporting touch. Requiring a real touch point keeps Embla off the
 * established narrow fine-pointer and every >=768px path. */
export function useTouchCarouselCapability(): boolean {
  const [touchCapable, setTouchCapable] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)');
    const update = () => {
      setTouchCapable(navigator.maxTouchPoints > 0 || coarse.matches);
    };
    update();
    coarse.addEventListener?.('change', update);
    return () => coarse.removeEventListener?.('change', update);
  }, []);

  return touchCapable;
}
