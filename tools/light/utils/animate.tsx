// @ts-nocheck
// src/utils/animate.js
// Tiny animation helpers (OKLCH color tween + number tween) using requestAnimationFrame.

import { hexToOklch, oklchToHex } from './color';

export const easeInOutCubic = t =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function animate({ duration = 600, ease = easeInOutCubic, onUpdate, onComplete }) {
  let start, raf;
  const frame = ts => {
    if (start == null) start = ts;
    const t = Math.min(1, (ts - start) / duration);
    const e = ease ? ease(t) : t;
    onUpdate && onUpdate(e);
    if (t < 1) raf = requestAnimationFrame(frame);
    else onComplete && onComplete();
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

// Promise-friendly number tween
export function tweenNumber(from, to, { duration = 500, ease = easeInOutCubic, onUpdate } = {}) {
  return new Promise(resolve => {
    animate({
      duration,
      ease,
      onUpdate: t => onUpdate && onUpdate(from + (to - from) * t),
      onComplete: resolve
    });
  });
}

// Promise-friendly OKLCH color tween
export function tweenHexOKLCH(fromHex, toHex, { duration = 700, ease = easeInOutCubic, onUpdate } = {}) {
  const a = hexToOklch(fromHex) || { L: 0.64, C: 0.2, H: 260 };
  const b = hexToOklch(toHex)   || a;

  // shortest hue path [-180, 180]
  const dH = ((b.H - a.H + 540) % 360) - 180;

  return new Promise(resolve => {
    animate({
      duration,
      ease,
      onUpdate: t => {
        const L = a.L + (b.L - a.L) * t;
        const C = Math.max(0, a.C + (b.C - a.C) * t);
        const H = a.H + dH * t;
        const hex = oklchToHex(L, C, H);
        onUpdate && onUpdate(hex);
      },
      onComplete: resolve
    });
  });
}
