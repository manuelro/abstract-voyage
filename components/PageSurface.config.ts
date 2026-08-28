/**
 * Page-shell concerns shared across pages — the flat background/accent color
 * behind a page's content, and the shared max-width/gutter cap its content
 * rows are bound to. Extracted from AbstractEditorialHeroConfig (which
 * originally owned these alongside genuinely hero-only fields like headline
 * gradient/shadow tuning) so any page can adopt the same page-level look
 * without pulling in hero-specific config it has no use for. One authoritative
 * default — AbstractEditorialHero now receives these as plain props instead
 * of owning them.
 */
export type PageSurfaceConfig = {
  color: string;
  /** Caps content rows to maxWidthPx on large viewports; below this width,
   * rows stay exactly as fluid as they'd be without a cap — this only ever
   * *caps*, never narrows. */
  maxWidthEnabled: boolean;
  maxWidthPx: number;
};

export const DEFAULT_PAGE_SURFACE_CONFIG = {
  color: '#b9b9c6',
  maxWidthEnabled: true,
  maxWidthPx: 1680,
} satisfies PageSurfaceConfig;

const clampRange = (value: number, min: number, max: number, fallback: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : fallback));

const normalizeColor = (value: string, fallback: string) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
};

/** Single normalization path for every runtime and panel-provided value. */
export function normalizePageSurfaceConfig(
  config: Partial<PageSurfaceConfig> | undefined,
): PageSurfaceConfig {
  const base = { ...DEFAULT_PAGE_SURFACE_CONFIG, ...(config ?? {}) };

  return {
    color: normalizeColor(base.color, DEFAULT_PAGE_SURFACE_CONFIG.color),
    maxWidthEnabled: base.maxWidthEnabled === true,
    maxWidthPx: clampRange(
      base.maxWidthPx, 960, 1920, DEFAULT_PAGE_SURFACE_CONFIG.maxWidthPx,
    ),
  };
}
