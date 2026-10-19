import { Children, isValidElement, useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import styles from './MasonryWall.module.css';

export type MasonryWallColumns = {
  base: number;
  md?: number;
  lg?: number;
};

export type MasonryWallProps = {
  children?: ReactNode;
  columns?: MasonryWallColumns;
  columnGap?: number | string;
  rowGap?: number | string;
  /** Place source-order items across the top, then in the shortest column. */
  placement?: 'balanced-columns' | 'reading-order';
  className?: string;
};

const DEFAULT_COLUMNS: MasonryWallColumns = { base: 1, md: 2, lg: 4 };
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function safeColumnCount(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(1, Math.min(12, Math.floor(value)))
    : fallback;
}

function safeGap(value: number | string | undefined): string {
  if (typeof value === 'string' && /^(?:\d+(?:\.\d+)?)(?:px|rem)$/.test(value)) return value;
  return `${typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 16}px`;
}

/** Balanced CSS columns by default, with an optional source-order waterfall. */
export function MasonryWall({
  children,
  columns = DEFAULT_COLUMNS,
  columnGap = 16,
  rowGap = 16,
  placement = 'balanced-columns',
  className,
}: MasonryWallProps) {
  const wallRef = useRef<HTMLDivElement>(null);
  const base = safeColumnCount(columns.base, DEFAULT_COLUMNS.base);
  const md = safeColumnCount(columns.md, base);
  const lg = safeColumnCount(columns.lg, md);
  const items = Children.toArray(children);
  const itemSignature = items.map((child, index) => isValidElement(child) ? child.key ?? index : index).join('|');
  const style = {
    '--masonry-columns-base': String(base),
    '--masonry-columns-md': String(md),
    '--masonry-columns-lg': String(lg),
    '--masonry-column-gap': safeGap(columnGap),
    '--masonry-row-gap': safeGap(rowGap),
  } as CSSProperties;

  useBrowserLayoutEffect(() => {
    if (placement !== 'reading-order') return undefined;
    const wall = wallRef.current;
    if (!wall) return undefined;
    const nodes = Array.from(wall.querySelectorAll<HTMLElement>(':scope > [data-masonry-item]'));
    let frame = 0;
    let disposed = false;
    let lastWidth = -1;
    let assignmentKey = '';
    let assignedColumns: number[] = [];
    const measure = () => {
      const computed = getComputedStyle(wall);
      const tracks = computed.gridTemplateColumns.split(' ').map(Number.parseFloat).filter(Number.isFinite);
      const columnCount = Math.max(1, tracks.length);
      const gapX = Number.parseFloat(computed.columnGap) || 0;
      const gapY = Number.parseFloat(computed.rowGap) || 0;
      if (columnCount === 1) {
        assignmentKey = '';
        assignedColumns = [];
        wall.dataset.layoutReady = 'false';
        wall.style.height = '';
        nodes.forEach(node => { node.style.left = ''; node.style.top = ''; node.style.width = ''; });
        return;
      }

      const width = wall.clientWidth;
      const itemWidth = (width - gapX * (columnCount - 1)) / columnCount;
      // Quote heights can change after placement (fonts, lazy content, or
      // spacing derived from the quotes directly above and below). Reusing
      // the initial column assignment keeps those changes from feeding back
      // into a different neighbour layout on every ResizeObserver pass.
      const nextAssignmentKey = `${columnCount}|${width}|${gapX}`;
      if (nextAssignmentKey !== assignmentKey) {
        assignmentKey = nextAssignmentKey;
        assignedColumns = [];
      }
      nodes.forEach(node => { node.style.width = `${itemWidth}px`; });
      const heights = nodes.map(node => node.getBoundingClientRect().height);
      const bottoms = Array<number>(columnCount).fill(0);
      nodes.forEach((node, index) => {
        const column = assignedColumns[index] ?? bottoms.indexOf(Math.min(...bottoms));
        assignedColumns[index] = column;
        node.style.left = `${column * (itemWidth + gapX)}px`;
        node.style.top = `${bottoms[column]}px`;
        bottoms[column] += heights[index] + gapY;
      });
      wall.style.height = `${Math.max(0, Math.max(...bottoms) - gapY)}px`;
      wall.dataset.layoutReady = 'true';
    };
    const schedule = () => {
      if (disposed) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(entries => {
      if (entries.some(entry => entry.target !== wall || entry.contentRect.width !== lastWidth)) {
        lastWidth = wall.clientWidth;
        schedule();
      }
    });
    observer?.observe(wall);
    nodes.forEach(node => observer?.observe(node));
    window.addEventListener('resize', schedule);
    document.fonts?.ready.then(schedule);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      wall.dataset.layoutReady = 'false';
      wall.style.height = '';
      nodes.forEach(node => { node.style.left = ''; node.style.top = ''; node.style.width = ''; });
    };
  }, [placement, base, md, lg, columnGap, rowGap, itemSignature]);

  return (
    <div
      ref={wallRef}
      className={[
        styles.wall,
        placement === 'reading-order'
          ? styles.readingOrder
          : 'columns-[var(--masonry-columns-base)] md:columns-[var(--masonry-columns-md)] lg:columns-[var(--masonry-columns-lg)]',
        className,
      ].filter(Boolean).join(' ')}
      style={style}
      data-masonry-wall=""
      data-masonry-placement={placement}
    >
      {items.map((child, index) => (
        <div className={styles.item} key={isValidElement(child) ? child.key ?? index : index} data-masonry-item="">
          {child}
        </div>
      ))}
    </div>
  );
}

export default MasonryWall;
