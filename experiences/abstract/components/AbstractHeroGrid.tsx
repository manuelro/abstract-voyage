'use client';

import Link from 'next/link';
import type { CSSProperties, MutableRefObject } from 'react';
import type { SvgStop } from '../../../helpers/gradientMath';
import type { SiteHeaderColorMode } from './SiteHeader/config/registered';
import Logo from './Logo';
import styles from './AbstractHeroGrid.module.css';

export type AbstractHeroGridInkTone = 'light' | 'dark';

type AbstractHeroGridProps = {
  // Only 'adaptive'/'custom' actually change this grid's own rendering
  // today (see the data-color-mode selectors in AbstractHeroGrid.module.css)
  // — 'surface' is accepted so this prop can take SiteHeaderConfig's
  // colorMode verbatim from its caller without a cast, but falls back to the
  // same look as 'adaptive' here. This grid is only ever mounted behind the
  // legacy/'classic' presentation's own skyRenderMode==='legacy' branch, not
  // the default splitColumn presentation the 'surface' feature targets.
  colorMode: SiteHeaderColorMode;
  headerTone: AbstractHeroGridInkTone;
  logoStops: SvgStop[];
  navBorderColor: string;
  navTextColor: string;
  cellCanvasRefs: MutableRefObject<Array<HTMLCanvasElement | null>>;
  totalCellCount: number;
};

/**
 * Same faces the row stack uses, tiled as a square-ish grid instead of
 * stacked bands. Logo/About/Journal/Contact always occupy the top-left 2x2
 * (guaranteed by the minimum cell count below); remaining faces fill the
 * rest as decorative cells, auto-placed by the browser.
 */
export function AbstractHeroGrid({
  colorMode,
  headerTone,
  logoStops,
  navBorderColor,
  navTextColor,
  cellCanvasRefs,
  totalCellCount,
}: AbstractHeroGridProps) {
  const cellCount = Math.max(4, totalCellCount);
  const columns = Math.ceil(Math.sqrt(cellCount));
  const rows = Math.ceil(cellCount / columns);
  const fillCellCount = cellCount - 4;

  const registerCell = (index: number) => (node: HTMLCanvasElement | null) => {
    cellCanvasRefs.current[index] = node;
  };

  return (
    <div
      className={styles.grid}
      data-color-mode={colorMode}
      data-ink-tone={headerTone}
      style={{
        '--grid-cols': columns,
        '--grid-rows': rows,
        '--hero-header-nav-border': navBorderColor,
        '--hero-header-nav-text': navTextColor,
      } as CSSProperties}
    >
      <div className={`${styles.cell} ${styles.logoCell}`}>
        <canvas aria-hidden="true" className={styles.cellBackground} ref={registerCell(0)} />
        <Link aria-label="Abstract Voyage home" className={styles.logoLink} href="/abstract">
          <Logo ariaLabel="Abstract Voyage" stops={logoStops} stopTransitionMs={280} width="100%" />
        </Link>
      </div>
      <div className={`${styles.cell} ${styles.aboutCell}`}>
        <canvas aria-hidden="true" className={styles.cellBackground} ref={registerCell(1)} />
        <Link className={styles.navLink} href="/about">
          About
        </Link>
      </div>
      <div className={`${styles.cell} ${styles.journalCell}`}>
        <canvas aria-hidden="true" className={styles.cellBackground} ref={registerCell(2)} />
        <Link className={styles.navLink} href="#journal">
          Journal
        </Link>
      </div>
      <div className={`${styles.cell} ${styles.contactCell}`}>
        <canvas aria-hidden="true" className={styles.cellBackground} ref={registerCell(3)} />
        <Link className={`${styles.navLink} ${styles.contactLink}`} href="/contact">
          Contact
        </Link>
      </div>
      {Array.from({ length: fillCellCount }, (_, fillIndex) => {
        const cellIndex = fillIndex + 4;
        return (
          <div aria-hidden="true" className={`${styles.cell} ${styles.fillCell}`} key={cellIndex}>
            <canvas
              aria-hidden="true"
              className={styles.cellBackground}
              ref={registerCell(cellIndex)}
            />
          </div>
        );
      })}
    </div>
  );
}

export default AbstractHeroGrid;
