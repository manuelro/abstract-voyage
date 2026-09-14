import { useEffect, type RefObject } from 'react';
import { colord } from 'colord';

export const SCROLL_ADAPTIVE_INK_PROGRESS_VAR = '--scroll-adaptive-ink-progress';

type Rgb = { r: number; g: number; b: number };

function mixTowardWhiteSrgb(hex: string, ratio: number): Rgb {
  const { r, g, b } = colord(hex).toRgb();
  const clamped = Math.min(1, Math.max(0, ratio));
  return { r: r + (255 - r) * clamped, g: g + (255 - g) * clamped, b: b + (255 - b) * clamped };
}

function scaleTowardBlackSrgb(hex: string, darken: number): Rgb {
  const { r, g, b } = colord(hex).toRgb();
  const scale = 1 - Math.min(1, Math.max(0, darken));
  return { r: r * scale, g: g * scale, b: b * scale };
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const la = colord(a).luminance();
  const lb = colord(b).luminance();
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function luminanceAtMix(stopColor: string, mix: number): number {
  return colord(mixTowardWhiteSrgb(stopColor, mix)).luminance();
}

function requiredWhiteMixRatio(
  stopColor: string, bgColor: Rgb, targetRatio: number, linearMixRatio: number,
): number {
  const baseline = contrastRatio(mixTowardWhiteSrgb(stopColor, linearMixRatio), bgColor);
  if (baseline >= targetRatio) return linearMixRatio;

  const atFull = contrastRatio(mixTowardWhiteSrgb(stopColor, 1), bgColor);
  if (atFull <= baseline) return linearMixRatio;

  const bgLuminance = colord(bgColor).luminance();
  let searchLo = linearMixRatio;
  if (luminanceAtMix(stopColor, linearMixRatio) < bgLuminance) {
    let lo = linearMixRatio;
    let hi = 1;
    for (let i = 0; i < 20; i += 1) {
      const mid = (lo + hi) / 2;
      if (luminanceAtMix(stopColor, mid) >= bgLuminance) hi = mid; else lo = mid;
    }
    searchLo = hi;
  }

  let lo = searchLo;
  let hi = 1;
  for (let i = 0; i < 20; i += 1) {
    const mid = (lo + hi) / 2;
    const ratio = contrastRatio(mixTowardWhiteSrgb(stopColor, mid), bgColor);
    if (ratio >= targetRatio) hi = mid; else lo = mid;
  }
  return hi;
}

export function buildScrollAdaptiveInkColor(baseColor: string, maxAmount: number): string {
  const maxAmountPercent = Math.min(1, Math.max(0, maxAmount)) * 100;
  const whiteMix = `calc(var(${SCROLL_ADAPTIVE_INK_PROGRESS_VAR}, 0) * ${maxAmountPercent}%)`;
  return `color-mix(in srgb, ${baseColor} calc(100% - ${whiteMix}), white ${whiteMix})`;
}

export function useScrollAdaptiveInk({
  ref,
  enabled,
  baseColor,
  maxAmount,
  targetContrastRatio,
  scrollGradientDarkenViewportRangeVh,
  scrollGradientDarkenTauMs,
  scrollGradientOriginColor,
  scrollGradientMaxDarken,
  returnToLightEnabled = false,
  returnToLightRangeVh = 1,
  returnToLightFinalDarken = 0,
}: {
  ref: RefObject<HTMLElement>;
  enabled: boolean;
  baseColor: string | undefined;
  maxAmount: number;
  targetContrastRatio: number;
  scrollGradientDarkenViewportRangeVh: number | undefined;
  scrollGradientDarkenTauMs: number | undefined;
  scrollGradientOriginColor: string | undefined;
  scrollGradientMaxDarken: number | undefined;
  returnToLightEnabled?: boolean;
  returnToLightRangeVh?: number;
  returnToLightFinalDarken?: number;
}) {
  useEffect(() => {
    if (!enabled) return undefined;
    const el = ref.current;
    if (!el || !baseColor || scrollGradientDarkenViewportRangeVh === undefined || scrollGradientDarkenTauMs === undefined) {
      return undefined;
    }

    const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
    const alphaFromTau = (dtMs: number, tau: number) => 1 - Math.exp(-dtMs / Math.max(1, tau));
    const targetRef = { current: 0 };
    const smoothRef = { current: 0 };
    const mixSmoothRef = { current: 0 };
    const rafRef = { current: null as number | null };
    const lastTsRef = { current: 0 };
    const maxAmountPercent = Math.min(1, Math.max(0, maxAmount)) * 100;
    const contrastGuaranteeActive = targetContrastRatio > 0
      && maxAmountPercent > 0
      && scrollGradientOriginColor !== undefined
      && scrollGradientMaxDarken !== undefined;

    const writeProgress = (value: number) => {
      el.style.setProperty(SCROLL_ADAPTIVE_INK_PROGRESS_VAR, clamp01(value).toFixed(3));
    };

    const desiredMixRatio = (current: number) => {
      const linearMixRatio = current * (maxAmountPercent / 100);
      if (!contrastGuaranteeActive) return linearMixRatio;
      const bgRgb = scaleTowardBlackSrgb(scrollGradientOriginColor as string, current * (scrollGradientMaxDarken as number));
      return requiredWhiteMixRatio(baseColor, bgRgb, targetContrastRatio, linearMixRatio);
    };

    const computeTarget = () => {
      const viewport = window.innerHeight || 1;
      const scrollProgress = clamp01(window.scrollY / (viewport * scrollGradientDarkenViewportRangeVh));
      let nextProgress = scrollProgress;

      if (returnToLightEnabled && scrollGradientMaxDarken !== undefined) {
        const anchor = document.querySelector<HTMLElement>('[data-scroll-gradient-return-anchor="true"]');
        if (anchor) {
          const rect = anchor.getBoundingClientRect();
          const returnRangePx = Math.max(1, viewport * returnToLightRangeVh);
          const returnProgress = clamp01((viewport - rect.top) / returnRangePx);
          const finalDarken = Math.min(
            scrollGradientMaxDarken,
            Math.max(0, Number.isFinite(returnToLightFinalDarken) ? returnToLightFinalDarken : 0),
          );
          const finalProgress = scrollGradientMaxDarken > 0 ? finalDarken / scrollGradientMaxDarken : 0;
          nextProgress += (finalProgress - nextProgress) * returnProgress;
        }
      }

      targetRef.current = clamp01(nextProgress);
    };

    const tick = (ts: number) => {
      const lastTs = lastTsRef.current || ts;
      lastTsRef.current = ts;
      rafRef.current = null;
      const dt = Math.max(0, ts - lastTs);
      const alpha = alphaFromTau(dt, scrollGradientDarkenTauMs);
      const target = targetRef.current;
      const current = smoothRef.current + (target - smoothRef.current) * alpha;
      smoothRef.current = current;
      const mixTarget = desiredMixRatio(current);
      const mixCurrent = mixSmoothRef.current + (mixTarget - mixSmoothRef.current) * alpha;
      mixSmoothRef.current = mixCurrent;
      writeProgress(maxAmountPercent > 0 ? Math.min(100, mixCurrent * 100) / maxAmountPercent : current);
      if (Math.abs(target - current) >= 0.001 || Math.abs(mixTarget - mixCurrent) >= 0.001) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    const schedule = () => {
      if (rafRef.current !== null) return;
      lastTsRef.current = 0;
      rafRef.current = window.requestAnimationFrame(tick);
    };
    const onScroll = () => {
      computeTarget();
      schedule();
    };
    const onResize = () => {
      computeTarget();
      schedule();
    };

    writeProgress(0);
    computeTarget();
    schedule();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [
    ref, enabled, baseColor, maxAmount, targetContrastRatio,
    scrollGradientDarkenViewportRangeVh, scrollGradientDarkenTauMs,
    scrollGradientOriginColor, scrollGradientMaxDarken,
    returnToLightEnabled, returnToLightRangeVh, returnToLightFinalDarken,
  ]);
}
