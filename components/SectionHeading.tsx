import React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  normalizeSectionHeadingConfig,
  type SectionHeadingAlign,
  type SectionHeadingConfig,
} from './SectionHeading.config';
import { useSharedDesignConfig } from './SharedDesignConfigProvider';

const ALIGN_CLASSNAME: Record<SectionHeadingAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

type SectionHeadingProps = {
  config: Partial<SectionHeadingConfig> | undefined;
  children: ReactNode;
  className?: string;
};

/**
 * Plain-text section label — see SectionHeadingConfig for why this has no
 * belly/canvas treatment.
 *
 * Padding/margin/indent are already literal Tailwind spacing-scale classes
 * (`px-4`, `mb-6`, etc.) straight out of config — the panel's own control
 * for each is a `Select` (a native dropdown over Tailwind's real scale),
 * so the config value already *is* the class name. No inline style, no
 * CSS custom property, no arbitrary-value indirection for any of these.
 */
export function SectionHeading({ config, children, className = '' }: SectionHeadingProps) {
  const normalized = normalizeSectionHeadingConfig(config);
  const { globalTypographyConfig } = useSharedDesignConfig();
  const resolvedFontFamily = normalized.fontFamily === 'inherit'
    ? globalTypographyConfig.headingFontFamily
    : normalized.fontFamily;
  const style: CSSProperties = {
    letterSpacing: `${normalized.letterSpacingEm}em`,
    color: normalized.color,
    fontFamily: resolvedFontFamily === 'serif' ? 'var(--site-font-serif)' : 'var(--site-font-sans)',
  };

  return (
    <h2
      className={[
        'font-semibold uppercase leading-none',
        normalized.fontSize,
        normalized.fontSizeDesktop,
        ALIGN_CLASSNAME[normalized.align],
        normalized.textIndent,
        normalized.paddingX,
        normalized.paddingY,
        normalized.marginTop,
        normalized.marginBottom,
        className,
      ].filter(Boolean).join(' ')}
      style={style}
    >
      {children}
    </h2>
  );
}
