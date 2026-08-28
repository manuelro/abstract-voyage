import React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { normalizePageSurfaceConfig, type PageSurfaceConfig } from './PageSurface.config';

// Reconstructs the hero section's own --hero-gutter responsive schedule
// (20px base / 18px below 360px / 24px from 600px / 32px from md / 48px from
// lg) as literal Tailwind classes, for elements that sit outside the section
// that defines --hero-gutter (so can't just inherit the CSS custom property)
// but still need their inset to line up with it.
export const PAGE_CONTENT_GUTTER_CLASSNAME =
  'px-5 max-[359px]:px-[18px] min-[600px]:px-6 md:px-8 lg:px-12';

type PageContainerProps = {
  config: PageSurfaceConfig;
  className?: string;
  /** Merged with the computed maxWidth style — for callers that also need
   * their own CSS custom properties on this same element. */
  style?: CSSProperties;
  children: ReactNode;
};

/**
 * Shared max-width cap + centering for a page's content rows — extracted
 * from pages/abstract.tsx's nav/journal wrappers, which each independently
 * applied `mx-auto box-border` plus a maxWidth style computed from what was
 * AbstractEditorialHeroConfig.pageMaxWidthPx (now PageSurfaceConfig.
 * maxWidthPx). Callers still own their own padding/flex classes via
 * `className`, and can still left-justify *content* within this box (see
 * AbstractEditorialHero's own horizontalPlacement, or an inner div with no
 * mx-auto of its own) — but the outer wrapper itself is always centered.
 *
 * This used to take an opt-in `center` prop; it was removed on purpose.
 * SiteHeader's own nav row and every page's own content wrapper each
 * called this independently, and briefly disagreed (one centered, one not)
 * because nothing enforced that two separate call sites pass the same
 * value — see the git history around "must use the same alignment... this
 * must be shared and must be global." Removing the option removes the class
 * of bug: every consumer of PageContainer now gets identical, guaranteed
 * alignment with zero configuration surface for it to drift on.
 */
export function PageContainer({
  config, className = '', style, children,
}: PageContainerProps) {
  const normalized = normalizePageSurfaceConfig(config);
  const resolvedStyle: CSSProperties = {
    ...style,
    maxWidth: normalized.maxWidthEnabled ? `${normalized.maxWidthPx}px` : undefined,
  };

  return (
    <div
      className={['mx-auto box-border w-full', className].filter(Boolean).join(' ')}
      style={resolvedStyle}
    >
      {children}
    </div>
  );
}

export default PageContainer;
