import { useCallback, useEffect, useRef, useState } from 'react';
import {
  distanceToRect,
  resolvePointerPosition,
  resolvePointerProximity,
  stepDampedValue,
  stepPointerProximityEnvelope,
  type PointerProximityEasing,
} from '../../helpers/pointerProximity';

export type PointerProximityOptions = {
  attackMs?: number;
  disabled?: boolean;
  easing?: PointerProximityEasing;
  /** Distinct from `disabled`, which drives `current`/`currentX`/`currentY`
   * toward 0 (a real, eased release toward "no proximity") — `freeze`
   * instead skips this subscriber's frame entirely: no rect re-measurement,
   * no stepping toward any target (0 or otherwise), no `onChange`/
   * `--pointer-*` write. Whatever proximity/position was last computed
   * simply holds, unchanged, for as long as this stays true. Built for a
   * card mid-transition out of an "active" role whose own bounding box is
   * being animated elsewhere (translate/scale) — that box moving out from
   * under a stationary cursor would otherwise read as fresh, legitimate
   * proximity/tilt data as the *box* changes rather than as any real
   * pointer movement, decaying it well before it's actually meant to. */
  freeze?: boolean;
  onChange?: (element: HTMLElement, state: PointerProximityState) => void;
  positionResponseMs?: number;
  radiusPx?: number;
  releaseMs?: number;
};

export type PointerProximityState = {
  proximity: number;
  x: number;
  y: number;
};

type ResolvedPointerProximityOptions = Required<
  Omit<PointerProximityOptions, 'onChange'>
> & Pick<PointerProximityOptions, 'onChange'>;

type Subscriber = {
  current: number;
  currentX: number;
  currentY: number;
  element: HTMLElement;
  options: () => ResolvedPointerProximityOptions;
  rect: DOMRect | null;
  rectMeasuredAt: number;
  visible: boolean;
};

const subscribers = new Set<Subscriber>();
let pointerX = 0;
let pointerY = 0;
let pointerActive = false;
let directionalPointerActive = false;
let animationFrame = 0;
let previousFrameTime = 0;
let listening = false;
let usingMouseFallback = false;
let resizeObserver: ResizeObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;

const DEFAULT_OPTIONS: ResolvedPointerProximityOptions = {
  attackMs: 85,
  disabled: false,
  easing: 'smootherstep',
  freeze: false,
  onChange: undefined,
  positionResponseMs: 95,
  radiusPx: 240,
  releaseMs: 210,
};

const writeProximity = (subscriber: Subscriber) => {
  const state = {
    proximity: subscriber.current,
    x: subscriber.currentX,
    y: subscriber.currentY,
  };
  subscriber.element.style.setProperty('--pointer-proximity', state.proximity.toFixed(4));
  subscriber.element.style.setProperty('--pointer-position-x', state.x.toFixed(4));
  subscriber.element.style.setProperty('--pointer-position-y', state.y.toFixed(4));
  subscriber.options().onChange?.(subscriber.element, state);
};

export const supportsDirectionalPointer = (pointerType: string) => pointerType !== 'touch';

const environmentAllowsMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const scheduleFrame = () => {
  if (!animationFrame) animationFrame = window.requestAnimationFrame(stepFrame);
};

const stepFrame = (time: number) => {
  animationFrame = 0;
  const deltaMs = previousFrameTime ? Math.min(64, time - previousFrameTime) : 16.67;
  previousFrameTime = time;
  const motionAllowed = environmentAllowsMotion();
  let unsettled = false;

  subscribers.forEach(subscriber => {
    const options = subscriber.options();
    // A frozen subscriber is skipped entirely, before even its rect gets
    // re-measured — see `freeze`'s own doc comment on PointerProximityOptions
    // for why a fresh rect (the element's own box mid-animation) is exactly
    // what must *not* factor in while frozen.
    if (options.freeze) return;
    if (
      !subscriber.rect ||
      (pointerActive && time - subscriber.rectMeasuredAt > 160)
    ) {
      subscriber.rect = subscriber.element.getBoundingClientRect();
      subscriber.rectMeasuredAt = time;
    }
    const pointerResponseActive = motionAllowed && pointerActive && directionalPointerActive &&
      subscriber.visible && !options.disabled;
    const target = pointerResponseActive
      ? resolvePointerProximity({
        distance: distanceToRect(pointerX, pointerY, subscriber.rect),
        easing: options.easing,
        radius: options.radiusPx,
      })
      : 0;
    const targetPosition = pointerResponseActive && target > 0
      ? resolvePointerPosition(pointerX, pointerY, subscriber.rect)
      : { x: 0, y: 0 };
    const next = motionAllowed ? stepPointerProximityEnvelope({
      attackMs: options.attackMs,
      current: subscriber.current,
      deltaMs,
      releaseMs: options.releaseMs,
      target,
    }) : 0;
    const nextX = motionAllowed ? stepDampedValue({
      current: subscriber.currentX,
      deltaMs,
      responseMs: options.positionResponseMs,
      target: targetPosition.x,
    }) : 0;
    const nextY = motionAllowed ? stepDampedValue({
      current: subscriber.currentY,
      deltaMs,
      responseMs: options.positionResponseMs,
      target: targetPosition.y,
    }) : 0;

    if (
      next !== subscriber.current ||
      nextX !== subscriber.currentX ||
      nextY !== subscriber.currentY
    ) {
      subscriber.current = next;
      subscriber.currentX = nextX;
      subscriber.currentY = nextY;
      writeProximity(subscriber);
    }
    if (next !== target || nextX !== targetPosition.x || nextY !== targetPosition.y) {
      unsettled = true;
    }
  });

  if (unsettled) scheduleFrame();
  else previousFrameTime = 0;
};

const handlePointerMove = (event: PointerEvent) => {
  directionalPointerActive = supportsDirectionalPointer(event.pointerType);
  if (!directionalPointerActive) {
    pointerActive = false;
    scheduleFrame();
    return;
  }
  pointerX = event.clientX;
  pointerY = event.clientY;
  pointerActive = true;
  scheduleFrame();
};

const handleMouseMove = (event: MouseEvent) => {
  pointerX = event.clientX;
  pointerY = event.clientY;
  pointerActive = true;
  directionalPointerActive = true;
  scheduleFrame();
};

const resetPointer = () => {
  pointerActive = false;
  directionalPointerActive = false;
  scheduleFrame();
};

const invalidateRects = () => {
  subscribers.forEach(subscriber => {
    subscriber.rect = null;
  });
  if (pointerActive) scheduleFrame();
};

const startListening = () => {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  usingMouseFallback = typeof window.PointerEvent !== 'function';
  if (usingMouseFallback) {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
  } else {
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
  }
  window.addEventListener('pointerleave', resetPointer, { passive: true });
  window.addEventListener('blur', resetPointer);
  window.addEventListener('resize', invalidateRects, { passive: true });
  window.addEventListener('scroll', invalidateRects, { passive: true, capture: true });
  resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(entries => {
      entries.forEach(entry => {
        subscribers.forEach(subscriber => {
          if (subscriber.element === entry.target) subscriber.rect = null;
        });
      });
      scheduleFrame();
    })
    : null;
  intersectionObserver = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        subscribers.forEach(subscriber => {
          if (subscriber.element === entry.target) subscriber.visible = entry.isIntersecting;
        });
      });
      scheduleFrame();
    })
    : null;
};

const stopListening = () => {
  if (!listening || typeof window === 'undefined') return;
  listening = false;
  if (usingMouseFallback) window.removeEventListener('mousemove', handleMouseMove);
  else window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerleave', resetPointer);
  window.removeEventListener('blur', resetPointer);
  window.removeEventListener('resize', invalidateRects);
  window.removeEventListener('scroll', invalidateRects, true);
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
  resizeObserver = null;
  intersectionObserver = null;
  if (animationFrame) window.cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  previousFrameTime = 0;
  pointerActive = false;
  directionalPointerActive = false;
  usingMouseFallback = false;
};

function subscribe(
  element: HTMLElement,
  options: () => ResolvedPointerProximityOptions,
) {
  const subscriber: Subscriber = {
    current: 0,
    currentX: 0,
    currentY: 0,
    element,
    options,
    rect: null,
    rectMeasuredAt: Number.NEGATIVE_INFINITY,
    visible: true,
  };
  subscribers.add(subscriber);
  writeProximity(subscriber);
  startListening();
  resizeObserver?.observe(element);
  intersectionObserver?.observe(element);

  return () => {
    resizeObserver?.unobserve(element);
    intersectionObserver?.unobserve(element);
    subscribers.delete(subscriber);
    element.style.removeProperty('--pointer-proximity');
    element.style.removeProperty('--pointer-position-x');
    element.style.removeProperty('--pointer-position-y');
    if (subscribers.size === 0) stopListening();
  };
}

export function usePointerProximity<TElement extends HTMLElement>(
  options: PointerProximityOptions = {},
) {
  const optionsRef = useRef({ ...DEFAULT_OPTIONS, ...options });
  optionsRef.current = { ...DEFAULT_OPTIONS, ...options };
  const elementRef = useRef<TElement | null>(null);
  const [element, setElement] = useState<TElement | null>(null);

  const ref = useCallback((element: TElement | null) => {
    elementRef.current = element;
    setElement(element);
  }, []);

  useEffect(() => {
    if (!element) return undefined;
    return subscribe(element, () => optionsRef.current);
  }, [element]);

  useEffect(() => {
    const element = elementRef.current;
    if (element && optionsRef.current.onChange) {
      const proximity = Number.parseFloat(
        element.style.getPropertyValue('--pointer-proximity'),
      ) || 0;
      const x = Number.parseFloat(
        element.style.getPropertyValue('--pointer-position-x'),
      ) || 0;
      const y = Number.parseFloat(
        element.style.getPropertyValue('--pointer-position-y'),
      ) || 0;
      optionsRef.current.onChange(element, { proximity, x, y });
    }
    if (typeof window !== 'undefined') scheduleFrame();
  }, [
    options.attackMs,
    options.disabled,
    options.easing,
    options.freeze,
    options.onChange,
    options.positionResponseMs,
    options.radiusPx,
    options.releaseMs,
  ]);

  return ref;
}
