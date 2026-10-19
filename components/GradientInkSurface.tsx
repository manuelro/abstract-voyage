import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import styles from './GradientInkSurface.module.css';

/** The compositing contract shared by article cards, quotes, and custom art. */
export type GradientInkTreatment = {
  backgroundColor: string;
  backgroundOpacity: number;
  foregroundColor: string;
  blendMode: 'screen' | 'multiply';
  /** Opt in only if blending a transparent layer is intentionally desired. */
  blendWhenTransparent?: boolean;
};

export function normalizeGradientInkTreatment(value: GradientInkTreatment): GradientInkTreatment {
  return {
    backgroundColor: value.backgroundColor,
    backgroundOpacity: Number.isFinite(value.backgroundOpacity)
      ? Math.min(1, Math.max(0, value.backgroundOpacity)) : 1,
    foregroundColor: value.foregroundColor,
    blendMode: value.blendMode === 'multiply' ? 'multiply' : 'screen',
    blendWhenTransparent: value.blendWhenTransparent ?? false,
  };
}

export type GradientInkSurfaceProps = {
  backdrop?: ReactNode;
  /** Decorative art between the backdrop and the semantic content. Hidden from assistive technology. */
  decoration?: ReactNode;
  /** Semantic text, controls, and meaningful graphics. Add data-gradient-ink-color
   * or data-gradient-ink-border to elements that should use the shared ink;
   * SVG graphics can use fill="currentColor" or stroke="currentColor". */
  children: ReactNode;
  ink?: GradientInkTreatment;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  contentAttributes?: HTMLAttributes<HTMLDivElement>;
  /** A backdrop scrim may be supplied by a consumer without affecting ink. */
  scrim?: ReactNode;
};

/** The caller owns the root element, semantics, dimensions, and interactions. */
export function GradientInkSurface({
  backdrop, decoration, children, ink, contentClassName, contentStyle, contentAttributes, scrim,
}: GradientInkSurfaceProps) {
  const treatment = ink ? normalizeGradientInkTreatment(ink) : undefined;
  const blendActive = treatment && (treatment.backgroundOpacity > 0 || treatment.blendWhenTransparent);
  return (
    <>
      <div className={styles.backdrop} aria-hidden="true">{backdrop}</div>
      {decoration ? <div className={styles.decoration} aria-hidden="true">{decoration}</div> : null}
      {scrim}
      <div
        {...contentAttributes}
        className={[styles.content, treatment ? styles.ink : '', contentClassName].filter(Boolean).join(' ')}
        data-gradient-ink-layer={treatment ? (blendActive ? treatment.blendMode : 'plain') : 'off'}
        style={{
          ...(treatment ? {
            '--gradient-ink-surface': treatment.backgroundColor,
            '--gradient-ink-opacity': treatment.backgroundOpacity,
            '--gradient-ink-foreground': treatment.foregroundColor,
            '--gradient-ink-blend': treatment.blendMode,
          } : {}),
          ...contentStyle,
        } as CSSProperties}
      >
        {children}
      </div>
    </>
  );
}
